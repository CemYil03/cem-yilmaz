import { tool } from 'ai';
import { eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { requireAdminUserId } from '../agents/requireAdminUserId';
import { taxDocuments } from '../db/schema';
import type { AdminTaxDocumentCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { GqlSAdminTaxDocumentInputSchema } from '../graphql/generated';
import type { GqlSAdminTaxDocumentInput, GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Batch upsert of checklist documents. Rows with a `documentId` update (this
// is how the page flips `needed` → `received`), rows without insert. `status`
// defaults to `needed`. `referenceIds` echoes the id per input row in order.
export async function adminTaxDocumentsUpsert(
    userId: string,
    inputs: readonly GqlSAdminTaxDocumentInput[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    const now = new Date();

    // Phase 1 — payload construction.
    const rows = inputs.map((input) => {
        const documentId = input.documentId ?? crypto.randomUUID();
        const payload: AdminTaxDocumentCreate = {
            documentId,
            taxYearId: input.taxYearId,
            kind: input.kind,
            title: input.title,
            status: input.status ?? 'needed',
            notes: input.notes ?? null,
            updatedAt: now,
        };
        return { documentId, isUpdate: Boolean(input.documentId), payload };
    });

    // Phase 2 — transactional execution.
    try {
        const updateIds = rows.filter((row) => row.isUpdate).map((row) => row.documentId);
        await serverRuntime.db.transaction(async (transaction) => {
            if (updateIds.length > 0) {
                const existing = await transaction
                    .select({ documentId: taxDocuments.documentId })
                    .from(taxDocuments)
                    .where(inArray(taxDocuments.documentId, updateIds));
                if (existing.length !== updateIds.length) {
                    const found = new Set(existing.map((row) => row.documentId));
                    const missing = updateIds.filter((id) => !found.has(id));
                    throw new Error(`adminTaxDocumentsUpsert: rows not found: ${missing.join(', ')}`);
                }
            }
            for (const row of rows) {
                if (row.isUpdate) {
                    await transaction.update(taxDocuments).set(row.payload).where(eq(taxDocuments.documentId, row.documentId));
                } else {
                    await transaction.insert(taxDocuments).values(row.payload);
                }
            }
        });
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: rows.map((row) => row.documentId) };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}

// Batch create-or-edit of checklist documents. Each row is
// `GqlSAdminTaxDocumentInputSchema()` — no date fields, Gemini-safe verbatim.
// See `docs/architecture/agent-delegation.md#tool-input-schemas`.
const toolTaxDocumentsUpsertInputSchema = z.object({
    taxDocuments: z.array(GqlSAdminTaxDocumentInputSchema()).min(1),
});

interface TaxAgentToolContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
}

export function toolTaxDocumentsUpsert({ serverRuntime, session }: TaxAgentToolContext) {
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
            return adminTaxDocumentsUpsert(requireAdminUserId(session), inputs, session, serverRuntime);
        },
    });
}
