import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import { adminTaxYearFindMany } from '../queries/adminTaxYearFindMany';

// Compact text snapshot of every tax year for embedding in the tax sub-agent's
// system prompt. Same shape as `financesSnapshotForAgent`: each entity keeps
// its id inline so the agent can lift ids for edits without a list call.
// Re-fetched on every delegation — tax volume is tiny.
export async function taxSnapshotForAgent(session: GqlSSession, serverRuntime: ServerRuntime): Promise<string> {
    const years = await adminTaxYearFindMany(session, serverRuntime);

    if (years.length === 0) {
        return ['## Tax', '', '- (no tax year yet — create one with `taxYearsUpsert`; its default checklist is seeded automatically)'].join(
            '\n',
        );
    }

    const lines: string[] = ['## Tax'];
    for (const year of [...years].sort((a, b) => b.year - a.year)) {
        const deadline = year.filingDeadline ? ` — deadline ${year.filingDeadline}` : '';
        lines.push('', `### ${year.year} (status: ${year.status}${deadline}) (id: ${year.taxYearId})`);
        lines.push(`- totals: income ${formatEur(year.totalIncomeCents)}, deductible ${formatEur(year.totalDeductibleCents)}`);

        if (year.incomeSources.length > 0) {
            lines.push('- income sources:');
            for (const src of year.incomeSources) {
                const amount = src.grossAmountCents != null ? formatEur(src.grossAmountCents) : '(amount TBD)';
                lines.push(`  - [${src.kind}] ${src.label}: ${amount} (id: ${src.incomeSourceId})`);
            }
        }

        if (year.expenses.length > 0) {
            lines.push('- expenses:');
            for (const exp of year.expenses) {
                const flag = exp.deductible ? '' : ' [not deductible]';
                const files = exp.files.length > 0 ? ` [${exp.files.length} file(s)]` : '';
                lines.push(
                    `  - [${exp.categoryKey}] ${exp.description}: ${formatEur(exp.amountCents)}${flag}${files} (id: ${exp.expenseId})`,
                );
            }
        }

        const received = year.documents.filter((d) => d.status === 'received').length;
        const relevant = year.documents.filter((d) => d.status !== 'notApplicable').length;
        lines.push(`- checklist: ${received}/${relevant} received`);
        for (const doc of year.documents) {
            lines.push(`  - [${doc.status}] ${doc.title} (id: ${doc.documentId})`);
        }
    }

    return lines.join('\n');
}

function formatEur(cents: number): string {
    return `${(cents / 100).toFixed(2)} €`;
}
