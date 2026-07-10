import { tool } from 'ai';
import { z } from 'zod';
import { adminFinancesRecurringCostsUpsert } from '../commands/adminFinancesRecurringCostsUpsert';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { GqlSAdminFinancesRecurringCostInputSchema } from '../graphql/generated';
import type { GqlSAdminFinancesRecurringCostInput, GqlSSession } from '../graphql/generated';
import type { FinanceAgentMutationLog } from './agentPersonalAssistantFinances';
import { requireAdminUserId } from './requireAdminUserId';

// Batch create-or-edit of recurring costs. Each row is
// `GqlSAdminFinancesRecurringCostInputSchema()` — the same shape the resolver
// validates. Gemini-safe: `AdminFinancesRecurringCostInput`'s only date fields
// (`startsOn` / `endsOn`) are `Date` scalars the codegen emits as
// `z.string()`, not `DateTime` (`z.date()`), so no hand-built duplicate is
// needed. See `docs/architecture/agent-delegation.md#tool-input-schemas`.
const toolFinanceRecurringCostsUpsertInputSchema = z.object({
    financeRecurringCosts: z.array(GqlSAdminFinancesRecurringCostInputSchema()).min(1),
});

interface FinanceAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: FinanceAgentMutationLog;
}

export function toolFinanceRecurringCostsUpsert({ serverRuntime, session, mutations }: FinanceAgentMutationContext) {
    return tool({
        description: [
            'Batch create-or-edit of recurring costs — the "add this to my expenses / subscriptions" path. Every row',
            'with a `costId` is updated; every row without one is inserted. Pass a single-element array for one cost,',
            'many for bulk. `amountCents` is the amount in cents for ONE `cadence` period: 25,95 € per month →',
            '`amountCents: 2595, cadence: "monthly"`; 120 € per year → `amountCents: 12000, cadence: "yearly"`.',
            'Infer `cadence` from the phrasing ("im Monat" / "a month" → monthly, "pro Jahr" / "a year" → yearly;',
            'default monthly when unstated). Pick `categoryKey` from the enum — a streaming/media subscription (Netflix,',
            'Disney+, Apple One, iCloud) is `subscriptionsEntertainment`, a dev/work tool (Cursor, Figma, GitHub) is',
            '`subscriptionsWork`, rent (incl. Nebenkosten) is `housing`, mobile/internet (Vodafone) is `connectivity`,',
            'an insurance policy is `insurance`, car tax/transit (Deutschland Ticket) is `transport`, a',
            'gym/sports-club/association fee is `memberships`, a charitable gift is `donations`, a transfer to the',
            'joint/household account is `household`, general savings is `savingsGeneral`, vacation savings is',
            '`savingsVacation`, anything else is `other`. To PAUSE a cost without deleting it, upsert the existing',
            'row with `active: false`; to resume, `active: true`. Paused rows stay in the ledger but drop out of the',
            'totals and Sankey. Returns `referenceIds` in input order.',
        ].join(' '),
        inputSchema: toolFinanceRecurringCostsUpsertInputSchema,
        execute: async (rawInput) => {
            const inputs = rawInput.financeRecurringCosts as GqlSAdminFinancesRecurringCostInput[];
            const result = await adminFinancesRecurringCostsUpsert(requireAdminUserId(session), inputs, session, serverRuntime);
            const referenceIds = result.referenceIds ?? [];
            inputs.forEach((cost, index) => {
                mutations.push({
                    kind: cost.costId ? 'recurringCostUpdate' : 'recurringCostAdd',
                    id: referenceIds[index] ?? cost.costId ?? '',
                    title: cost.name,
                });
            });
            return result;
        },
    });
}
