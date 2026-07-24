import { formatCurrency } from '../../shared';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminInventoryItem, GqlSSession } from '../graphql/generated';
import { adminInventoryItemFindMany } from '../queries/adminInventoryItemFindMany';
import { adminInventoryItemUpcomingWarrantyFindMany } from '../queries/adminInventoryItemUpcomingWarrantyFindMany';
import { adminInventoryMaterialNetWorthCentsFindOne } from '../queries/adminInventoryMaterialNetWorthCentsFindOne';

// Compact text snapshot of the inventory for embedding in the inventory
// sub-agent's system prompt. Same shape as `financesSnapshotForAgent` /
// `travelSnapshotForAgent`: each item keeps its `itemId` inline so the agent
// can lift ids for edit / reprice / service / dispose without a
// `inventoryItemsList` call. Re-fetched on every delegation — item volume is
// tiny.
//
// The header carries material net worth, the owned-item count, and any
// warranties expiring within 60 days, so the agent can answer "how much are my
// things worth?" and "which warranties are about to lapse?" straight from the
// prompt. Only currently-owned items are listed (disposed rows are noise for a
// "what do I own" conversation); the agent can still reach disposed rows via
// `inventoryItemsList` with `includeDisposed: true`.
const WARRANTY_WINDOW_DAYS = 60;

export async function inventorySnapshotForAgent(session: GqlSSession, serverRuntime: ServerRuntime): Promise<string> {
    const [ownedItems, netWorthCents, warrantyExpirations] = await Promise.all([
        adminInventoryItemFindMany(false, session, serverRuntime),
        adminInventoryMaterialNetWorthCentsFindOne(session, serverRuntime),
        adminInventoryItemUpcomingWarrantyFindMany(WARRANTY_WINDOW_DAYS, session, serverRuntime),
    ]);

    const lines: string[] = ['## Inventory'];
    lines.push(
        `- material net worth (owned items): ${formatCurrency(netWorthCents, { locale: 'de' })}`,
        `- owned items: ${ownedItems.length}`,
    );

    if (warrantyExpirations.length > 0) {
        lines.push('', `## Warranties expiring within ${WARRANTY_WINDOW_DAYS} days`);
        for (const item of warrantyExpirations) {
            lines.push(`- ${item.name}: warranty ends ${item.warrantyEndsAt ?? '(unknown)'} (id: ${item.itemId})`);
        }
    }

    if (ownedItems.length === 0) {
        lines.push('', '- (no items tracked yet — add the first with `inventoryItemsUpsert`)');
        return lines.join('\n');
    }

    const byCategory = new Map<string, GqlSAdminInventoryItem[]>();
    for (const item of ownedItems) {
        const list = byCategory.get(item.categoryKey) ?? [];
        list.push(item);
        byCategory.set(item.categoryKey, list);
    }

    lines.push('', '## Owned items');
    for (const [category, categoryItems] of [...byCategory.entries()].sort(([a], [b]) => a.localeCompare(b))) {
        lines.push('', `### ${category}`);
        for (const item of categoryItems) lines.push(`- ${itemLine(item)}`);
    }

    return lines.join('\n');
}

function itemLine(item: GqlSAdminInventoryItem): string {
    const label = [item.brand, item.model].filter(Boolean).join(' ');
    const name = label ? `${item.name} (${label})` : item.name;
    const value =
        item.currentValueCents === null || item.currentValueCents === undefined
            ? 'unvalued'
            : formatCurrency(item.currentValueCents, { locale: 'de' });
    const condition = item.condition ? ` [${item.condition}]` : '';
    const warranty = item.warrantyEndsAt ? ` [warranty ends ${item.warrantyEndsAt}]` : '';
    return `${name}: ${value}${condition}${warranty} (id: ${item.itemId})`;
}
