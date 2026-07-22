import { asc } from 'drizzle-orm';
import { formatCurrency } from '../../shared';
import type { AdminFinancesRecurringCost } from '../db/schema';
import { financeRecurringCosts } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import { adminFinancesExpensesCentsFindOne } from '../queries/adminFinancesExpensesCentsFindOne';
import { adminFinancesMonthlyNetIncomeCentsFindOne } from '../queries/adminFinancesMonthlyNetIncomeCentsFindOne';

// Compact text snapshot of every recurring cost for embedding in the finances
// sub-agent's system prompt. Same shape as `travelSnapshotForAgent` /
// `mediaSnapshotForAgent`: each row keeps its `costId` inline so the agent can
// lift ids for edit / delete / pause without a `financeRecurringCostsList`
// call. Re-fetched on every delegation — recurring-cost volume is tiny.
//
// The header carries the income baseline and the current monthly/yearly
// expense totals (over active rows), so the agent can answer "how much do I
// spend?" and "can I afford this?" straight from the prompt.
export async function financesSnapshotForAgent(session: GqlSSession, serverRuntime: ServerRuntime): Promise<string> {
    const [rows, totals, monthlyNetIncomeCents] = await Promise.all([
        serverRuntime.db
            .select()
            .from(financeRecurringCosts)
            .orderBy(asc(financeRecurringCosts.categoryKey), asc(financeRecurringCosts.name)),
        adminFinancesExpensesCentsFindOne(session, serverRuntime),
        adminFinancesMonthlyNetIncomeCentsFindOne(session, serverRuntime),
    ]);

    const lines: string[] = ['## Finances'];
    lines.push(
        `- monthly net income: ${monthlyNetIncomeCents === null ? '(unset)' : formatCurrency(monthlyNetIncomeCents, { locale: 'de' })}`,
        `- recurring expenses (active rows): ${formatCurrency(totals.monthlyCents, { locale: 'de' })}/month, ${formatCurrency(totals.yearlyCents, { locale: 'de' })}/year`,
    );

    if (rows.length === 0) {
        lines.push('', '- (no recurring costs yet — add the first with `financeRecurringCostsUpsert`)');
        return lines.join('\n');
    }

    const byCategory = new Map<string, AdminFinancesRecurringCost[]>();
    for (const row of rows) {
        const list = byCategory.get(row.categoryKey) ?? [];
        list.push(row);
        byCategory.set(row.categoryKey, list);
    }

    lines.push('', '## Recurring costs');
    for (const [category, items] of [...byCategory.entries()].sort(([a], [b]) => a.localeCompare(b))) {
        lines.push('', `### ${category}`);
        for (const item of items) lines.push(`- ${costLine(item)}`);
    }

    return lines.join('\n');
}

function costLine(cost: AdminFinancesRecurringCost): string {
    const amount = `${formatCurrency(cost.amountCents, { locale: 'de' })}/${cost.cadence === 'yearly' ? 'year' : 'month'}`;
    const paused = cost.active ? '' : ' [PAUSED]';
    const notes = cost.notes ? ` — ${cost.notes}` : '';
    return `${cost.name}: ${amount}${paused}${notes} (id: ${cost.costId})`;
}
