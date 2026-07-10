import { tool } from 'ai';
import { z } from 'zod';
import { adminTaxDocumentsUpsert } from '../commands/adminTaxDocumentsUpsert';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { GqlSAdminTaxDocumentInputSchema } from '../graphql/generated';
import type { GqlSAdminTaxDocumentInput, GqlSSession } from '../graphql/generated';
import type { TaxAgentMutationLog } from './agentPersonalAssistantTax';
import { requireAdminUserId } from './requireAdminUserId';

// Batch create-or-edit of checklist documents. Each row is
// `GqlSAdminTaxDocumentInputSchema()` — no date fields, Gemini-safe verbatim.
// See `docs/architecture/agent-delegation.md#tool-input-schemas`.
const toolTaxDocumentsUpsertInputSchema = z.object({
    taxDocuments: z.array(GqlSAdminTaxDocumentInputSchema()).min(1),
});

interface TaxAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: TaxAgentMutationLog;
}

export function toolTaxDocumentsUpsert({ serverRuntime, session, mutations }: TaxAgentMutationContext) {
    return tool({
        description: [
            'Batch create-or-edit of checklist documents within a tax year. Every row with a `documentId` is updated —',
            'this is how you tick a document off: upsert the existing row with `status: "received"`. Every row without',
            'an id is inserted. Each row needs a `taxYearId`, a `kind`, and a `title`. Use to add a document Cem needs',
            'to collect, or to mark one received / notApplicable. You CANNOT attach the scan file here — tell Cem to',
            'add it in the Documents section of the tax page. Returns `referenceIds` in input order.',
        ].join(' '),
        inputSchema: toolTaxDocumentsUpsertInputSchema,
        execute: async (rawInput) => {
            const inputs = rawInput.taxDocuments as GqlSAdminTaxDocumentInput[];
            const result = await adminTaxDocumentsUpsert(requireAdminUserId(session), inputs, session, serverRuntime);
            const referenceIds = result.referenceIds ?? [];
            inputs.forEach((doc, index) => {
                mutations.push({
                    kind: doc.documentId ? 'documentUpdate' : 'documentAdd',
                    id: referenceIds[index] ?? doc.documentId ?? '',
                    title: doc.title,
                });
            });
            return result;
        },
    });
}
