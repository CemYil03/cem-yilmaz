import { asc } from 'drizzle-orm';
import { formatCurrency } from '../../shared';
import type { AdminFinancesAsset, AdminFinancesIncomeStream, AdminFinancesRecurringCost } from '../db/schema';
import { financeAssets, financeIncomeStreams, financeRecurringCosts } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import { adminFinancesAssetCentsFindOne } from '../queries/adminFinancesAssetCentsFindOne';
import { adminFinancesExpensesCentsFindOne } from '../queries/adminFinancesExpensesCentsFindOne';
import { adminFinancesIncomeCentsFindOne } from '../queries/adminFinancesIncomeCentsFindOne';

// Compact text snapshot of cashflow + wealth for embedding in the finances
// sub-agent's system prompt. Same shape as `travelSnapshotForAgent` /
// `mediaSnapshotForAgent`: each row keeps its id inline so the agent can lift
// ids for edit / delete / pause / reprice without a list call. Re-fetched on
// every delegation — volume is tiny.
export async function financesSnapshotForAgent(session: GqlSSession, serverRuntime: ServerRuntime): Promise<string> {
    const [costRows, incomeRows, assetRows, expenseTotals, incomeTotals, liquidCents, investedCents, bausparCents, financialNetWorthCents] =
        await Promise.all([
            serverRuntime.db
                .select()
                .from(financeRecurringCosts)
                .orderBy(asc(financeRecurringCosts.categoryKey), asc(financeRecurringCosts.name)),
            serverRuntime.db.select().from(financeIncomeStreams).orderBy(asc(financeIncomeStreams.name)),
            serverRuntime.db.select().from(financeAssets).orderBy(asc(financeAssets.kind), asc(financeAssets.name)),
            adminFinancesExpensesCentsFindOne(session, serverRuntime),
            adminFinancesIncomeCentsFindOne(session, serverRuntime),
            adminFinancesAssetCentsFindOne(session, serverRuntime, 'cash'),
            adminFinancesAssetCentsFindOne(session, serverRuntime, 'security'),
            adminFinancesAssetCentsFindOne(session, serverRuntime, 'bauspar'),
            adminFinancesAssetCentsFindOne(session, serverRuntime),
        ]);

    const lines: string[] = ['## Finances'];
    lines.push(
        `- income (active streams): ${formatCurrency(incomeTotals.monthlyCents, { locale: 'de' })}/month, ${formatCurrency(incomeTotals.quarterlyCents, { locale: 'de' })}/quarter, ${formatCurrency(incomeTotals.yearlyCents, { locale: 'de' })}/year`,
        `- recurring expenses (active rows): ${formatCurrency(expenseTotals.monthlyCents, { locale: 'de' })}/month, ${formatCurrency(expenseTotals.quarterlyCents, { locale: 'de' })}/quarter, ${formatCurrency(expenseTotals.yearlyCents, { locale: 'de' })}/year`,
        `- wealth (active): liquid ${formatCurrency(liquidCents, { locale: 'de' })}, invested ${formatCurrency(investedCents, { locale: 'de' })}, bauspar ${formatCurrency(bausparCents, { locale: 'de' })}, financial net worth ${formatCurrency(financialNetWorthCents, { locale: 'de' })}`,
    );

    lines.push('', '## Income streams');
    if (incomeRows.length === 0) {
        lines.push('- (no income streams yet — add the first with `financeIncomeStreamsUpsert`)');
    } else {
        for (const stream of incomeRows) lines.push(`- ${incomeLine(stream)}`);
    }

    if (costRows.length === 0) {
        lines.push('', '## Recurring costs', '- (no recurring costs yet — add the first with `financeRecurringCostsUpsert`)');
    } else {
        const byCategory = new Map<string, AdminFinancesRecurringCost[]>();
        for (const row of costRows) {
            const list = byCategory.get(row.categoryKey) ?? [];
            list.push(row);
            byCategory.set(row.categoryKey, list);
        }

        lines.push('', '## Recurring costs');
        for (const [category, items] of [...byCategory.entries()].sort(([a], [b]) => a.localeCompare(b))) {
            lines.push('', `### ${category}`);
            for (const item of items) lines.push(`- ${costLine(item)}`);
        }
    }

    lines.push('', '## Wealth assets');
    if (assetRows.length === 0) {
        lines.push('- (no assets yet — add the first with `financeAssetsUpsert`; reprice later with `financeAssetsReprice`)');
    } else {
        const byKind = new Map<string, AdminFinancesAsset[]>();
        for (const row of assetRows) {
            const list = byKind.get(row.kind) ?? [];
            list.push(row);
            byKind.set(row.kind, list);
        }
        for (const kind of ['cash', 'security', 'bauspar'] as const) {
            const items = byKind.get(kind);
            if (!items?.length) continue;
            lines.push('', `### ${kind}`);
            for (const item of items) lines.push(`- ${assetLine(item)}`);
        }
    }

    return lines.join('\n');
}

function incomeLine(stream: AdminFinancesIncomeStream): string {
    const amount = `${formatCurrency(stream.amountCents, { locale: 'de' })}/${cadenceUnit(stream.cadence)}`;
    const paused = stream.active ? '' : ' [PAUSED]';
    const notes = stream.notes ? ` — ${stream.notes}` : '';
    return `${stream.name}: ${amount}${paused}${notes} (id: ${stream.incomeStreamId})`;
}

function costLine(cost: AdminFinancesRecurringCost): string {
    const amount = `${formatCurrency(cost.amountCents, { locale: 'de' })}/${cadenceUnit(cost.cadence)}`;
    const paused = cost.active ? '' : ' [PAUSED]';
    const notes = cost.notes ? ` — ${cost.notes}` : '';
    return `${cost.name}: ${amount}${paused}${notes} (id: ${cost.costId})`;
}

function assetLine(asset: AdminFinancesAsset): string {
    const value = formatCurrency(asset.currentValueCents, { locale: 'de' });
    const shares = asset.kind === 'security' && asset.shares != null ? `, ${asset.shares} shares` : '';
    const symbol = asset.symbol ? ` (${asset.symbol})` : '';
    const paused = asset.active ? '' : ' [PAUSED]';
    const notes = asset.notes ? ` — ${asset.notes}` : '';
    return `${asset.name}${symbol} @ ${asset.location}: ${value}${shares}${paused}${notes} (id: ${asset.assetId})`;
}

function cadenceUnit(cadence: AdminFinancesIncomeStream['cadence']): string {
    if (cadence === 'yearly') return 'year';
    if (cadence === 'quarterly') return 'quarter';
    return 'month';
}
