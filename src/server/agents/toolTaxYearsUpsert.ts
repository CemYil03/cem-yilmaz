import { tool } from 'ai';
import { z } from 'zod';
import { adminTaxYearsUpsert } from '../commands/adminTaxYearsUpsert';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { GqlSAdminTaxYearInputSchema } from '../graphql/generated';
import type { GqlSAdminTaxYearInput, GqlSSession } from '../graphql/generated';
import type { TaxAgentMutationLog } from './agentPersonalAssistantTax';
import { requireAdminUserId } from './requireAdminUserId';

// Batch create-or-edit of tax years. Each row is `GqlSAdminTaxYearInputSchema()`
// — the same shape the resolver validates. Gemini-safe: the only date field
// (`filingDeadline`) is a `Date` scalar the codegen emits as `z.string()`, not
// `DateTime`, so no hand-built duplicate is needed. Inserting a new year seeds
// its default checklist server-side. See
// `docs/architecture/agent-delegation.md#tool-input-schemas`.
const toolTaxYearsUpsertInputSchema = z.object({
    taxYears: z.array(GqlSAdminTaxYearInputSchema()).min(1),
});

interface TaxAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: TaxAgentMutationLog;
}

export function toolTaxYearsUpsert({ serverRuntime, session, mutations }: TaxAgentMutationContext) {
    return tool({
        description: [
            'Batch create-or-edit of tax years. Every row with a `taxYearId` is updated; every row without one is',
            'inserted (and its default document checklist — Anlage N, S/EÜR, minijob, insurance — is seeded',
            'automatically). Use to start a new year, set its filing deadline, or move its `status` (open → collecting',
            '→ filing → submitted → closed). `year` is the calendar year the return covers and must be unique. Returns',
            '`referenceIds` in input order.',
        ].join(' '),
        inputSchema: toolTaxYearsUpsertInputSchema,
        execute: async (rawInput) => {
            const inputs = rawInput.taxYears as GqlSAdminTaxYearInput[];
            const result = await adminTaxYearsUpsert(requireAdminUserId(session), inputs, session, serverRuntime);
            const referenceIds = result.referenceIds ?? [];
            inputs.forEach((year, index) => {
                mutations.push({
                    kind: year.taxYearId ? 'taxYearUpdate' : 'taxYearAdd',
                    id: referenceIds[index] ?? year.taxYearId ?? '',
                    title: String(year.year),
                });
            });
            return result;
        },
    });
}
