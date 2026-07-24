import { asc } from 'drizzle-orm';
import { formatCurrency } from '../../shared';
import type { AdminFinancesIncomeStream, AdminFinancesRecurringCost } from '../db/schema';
import { financeIncomeStreams, financeRecurringCosts } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import { adminFinancesExpensesCentsFindOne } from '../queries/adminFinancesExpensesCentsFindOne';
import { adminFinancesIncomeCentsFindOne } from '../queries/adminFinancesIncomeCentsFindOne';

// Compact text snapshot of every income stream and recurring cost for
// embedding in the finances sub-agent's system prompt. Same shape as
// `travelSnapshotForAgent` / `mediaSnapshotForAgent`: each row keeps its id
// inline so the agent can lift ids for edit / delete / pause without a list
// call. Re-fetched on every delegation — volume is tiny.
//
// The header carries the current monthly/quarterly/yearly income and expense
// totals (over active rows), so the agent can answer "how much do I spend?"
// and "can I afford this?" straight from the prompt.
export async function financesSnapshotForAgent(session: GqlSSession, serverRuntime: ServerRuntime): Promise<string> {
    const [costRows, incomeRows, expenseTotals, incomeTotals] = await Promise.all([
        serverRuntime.db
            .select()
            .from(financeRecurringCosts)
            .orderBy(asc(financeRecurringCosts.categoryKey), asc(financeRecurringCosts.name)),
        serverRuntime.db.select().from(financeIncomeStreams).orderBy(asc(financeIncomeStreams.name)),
        adminFinancesExpensesCentsFindOne(session, serverRuntime),
        adminFinancesIncomeCentsFindOne(session, serverRuntime),
    ]);

    const lines: string[] = ['## Finances'];
    lines.push(
        `- income (active streams): ${formatCurrency(incomeTotals.monthlyCents, { locale: 'de' })}/month, ${formatCurrency(incomeTotals.quarterlyCents, { locale: 'de' })}/quarter, ${formatCurrency(incomeTotals.yearlyCents, { locale: 'de' })}/year`,
        `- recurring expenses (active rows): ${formatCurrency(expenseTotals.monthlyCents, { locale: 'de' })}/month, ${formatCurrency(expenseTotals.quarterlyCents, { locale: 'de' })}/quarter, ${formatCurrency(expenseTotals.yearlyCents, { locale: 'de' })}/year`,
    );

    lines.push('', '## Income streams');
    if (incomeRows.length === 0) {
        lines.push('- (no income streams yet — add the first with `financeIncomeStreamsUpsert`)');
    } else {
        for (const stream of incomeRows) lines.push(`- ${incomeLine(stream)}`);
    }

    if (costRows.length === 0) {
        lines.push('', '## Recurring costs', '- (no recurring costs yet — add the first with `financeRecurringCostsUpsert`)');
        return lines.join('\n');
    }

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

function cadenceUnit(cadence: AdminFinancesIncomeStream['cadence']): string {
    if (cadence === 'yearly') return 'year';
    if (cadence === 'quarterly') return 'quarter';
    return 'month';
}
