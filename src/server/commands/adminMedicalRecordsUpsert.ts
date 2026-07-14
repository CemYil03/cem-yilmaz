import { tool } from 'ai';
import { and, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { requireAdminUserId } from '../agents/requireAdminUserId';
import { fileUploads, medicalRecordFiles, medicalRecords } from '../db/schema';
import type { AdminMedicalRecordCreate, AdminMedicalRecordFileCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { GqlSAdminMedicalCategorySchema, GqlSAdminMedicalRecordSeveritySchema } from '../graphql/generated';
import type { GqlSAdminMedicalRecordInput, GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Batch upsert of health-journal records with a per-row inline
// `fileUploadIds` attach path. Every input with a `recordId` is updated;
// every input without one is inserted under a freshly-minted UUID. The whole
// batch runs inside a single transaction so a partial failure rolls back to
// zero writes. `referenceIds` echoes the id per input row (in input order).
//
// The optional `fileUploadIds` on each row lets the sub-agent (and the
// manual editor) file a record and pin photos in the same mutation.
// Ownership of every referenced upload is validated up-front against `userId`
// (across all rows) — a foreign or non-existent id fails the whole batch
// rather than half-persisting.
export async function adminMedicalRecordsUpsert(
    userId: string,
    inputs: readonly GqlSAdminMedicalRecordInput[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    const now = new Date();

    // Phase 1 — payload construction.
    const rows = inputs.map((input) => {
        const recordId = input.recordId ?? crypto.randomUUID();
        const payload: AdminMedicalRecordCreate = {
            recordId,
            category: input.category,
            title: input.title,
            summary: input.summary,
            severity: input.severity ?? null,
            symptoms: input.symptoms,
            bodyAreas: input.bodyAreas,
            occurredAt: input.occurredAt ?? null,
            resolvedAt: input.resolvedAt ?? null,
            appointmentId: input.appointmentId ?? null,
            topics: input.topics,
            updatedAt: now,
        };
        const fileUploadIds = Array.from(new Set(input.fileUploadIds ?? []));
        return { recordId, isUpdate: Boolean(input.recordId), payload, fileUploadIds };
    });

    // Phase 2 — transactional execution.
    try {
        const requestedFileUploadIds = Array.from(new Set(rows.flatMap((row) => row.fileUploadIds)));
        if (requestedFileUploadIds.length > 0) {
            const owned = await serverRuntime.db
                .select({ fileUploadId: fileUploads.fileUploadId })
                .from(fileUploads)
                .where(and(eq(fileUploads.userId, userId), inArray(fileUploads.fileUploadId, requestedFileUploadIds)));
            if (owned.length !== requestedFileUploadIds.length) {
                throw new Error(
                    `adminMedicalRecordsUpsert: ${requestedFileUploadIds.length - owned.length} of ${requestedFileUploadIds.length} fileUploadId(s) are not owned by user ${userId}`,
                );
            }
        }

        const updateIds = rows.filter((row) => row.isUpdate).map((row) => row.recordId);
        await serverRuntime.db.transaction(async (transaction) => {
            if (updateIds.length > 0) {
                const existing = await transaction
                    .select({ recordId: medicalRecords.recordId })
                    .from(medicalRecords)
                    .where(inArray(medicalRecords.recordId, updateIds));
                if (existing.length !== updateIds.length) {
                    const found = new Set(existing.map((row) => row.recordId));
                    const missing = updateIds.filter((id) => !found.has(id));
                    throw new Error(`adminMedicalRecordsUpsert: rows not found: ${missing.join(', ')}`);
                }
            }
            for (const row of rows) {
                if (row.isUpdate) {
                    await transaction.update(medicalRecords).set(row.payload).where(eq(medicalRecords.recordId, row.recordId));
                } else {
                    await transaction.insert(medicalRecords).values(row.payload);
                }

                if (row.fileUploadIds.length === 0) continue;
                // Skip ids already joined to this record so an
                // update-with-fileUploadIds is idempotent.
                const attached = await transaction
                    .select({ fileUploadId: medicalRecordFiles.fileUploadId })
                    .from(medicalRecordFiles)
                    .where(eq(medicalRecordFiles.recordId, row.recordId));
                const attachedIds = new Set(attached.map((r) => r.fileUploadId));
                const toAttach = row.fileUploadIds.filter((id) => !attachedIds.has(id));
                if (toAttach.length > 0) {
                    const inserts: AdminMedicalRecordFileCreate[] = toAttach.map((fileUploadId) => ({
                        recordFileId: crypto.randomUUID(),
                        recordId: row.recordId,
                        fileUploadId,
                        updatedAt: now,
                    }));
                    await transaction.insert(medicalRecordFiles).values(inserts);
                }
            }
        });
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: rows.map((row) => row.recordId) };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}

// Primary write path for the sub-agent: file health-journal records from a
// chat conversation. Hand-built item schema — same rationale as
// `toolMoviesUpsert.ts`: Gemini's structured output rejects `z.date()`, so
// the DateTime fields ride the wire as ISO strings and the `execute`
// converts with `new Date(...)`. `fileUploadIds` lets the same call attach
// photos the user pasted into the current turn.

const medicalRecordItemSchema = z.object({
    recordId: z.uuid().nullish().describe('Omit (or null) to create a new record. Pass an existing id to edit.'),
    category: GqlSAdminMedicalCategorySchema.describe('dentist | gp | dermatology | eyes | mentalHealth | ent | physio | other'),
    title: z.string().min(1).max(200).describe('Short title, e.g. "Rash on forearm".'),
    summary: z
        .string()
        .min(1)
        .max(8000)
        .describe(
            "Structured writeup of what the user described, in the user's language. Include: what happened, when it started, symptoms, what makes it better/worse, any relevant history. End with the standard disclaimer.",
        ),
    severity: GqlSAdminMedicalRecordSeveritySchema.nullish().describe('info | mild | moderate | severe. Omit if genuinely unclear.'),
    symptoms: z.array(z.string()).describe('Symptom words the user named, lightly normalized. e.g. ["itch", "redness"]. Empty if none.'),
    bodyAreas: z.array(z.string()).describe('Body regions involved, lightly normalized. e.g. ["forearm", "left wrist"]. Empty if none.'),
    occurredAt: z.string().nullish().describe('ISO-8601 stamp when the issue occurred / was noticed. Optional.'),
    resolvedAt: z.string().nullish().describe('ISO-8601 stamp when the issue resolved. Optional.'),
    appointmentId: z.uuid().nullish().describe('Link to a related appointment (the visit that produced this record, or a follow-up).'),
    topics: z.array(z.string()).describe('Free-form cluster tags. Empty array if none.'),
    fileUploadIds: z
        .array(z.uuid())
        .nullish()
        .describe(
            'File-upload ids to attach to this record — typically photos the user included in their message this turn. The orchestrator forwards these to you via the delegate brief; pass them through verbatim.',
        ),
});

const toolMedicalRecordsUpsertInputSchema = z.object({
    medicalRecords: z
        .array(medicalRecordItemSchema)
        .min(1)
        .describe('One or more records to create or edit. Pass a one-element array for a single write.'),
});

interface MedicalAgentToolContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
}

export function toolMedicalRecordsUpsert({ serverRuntime, session }: MedicalAgentToolContext) {
    return tool({
        description: [
            'Batch create-or-edit of medical records — the primary write. Use for filing health-journal entries from',
            'a chat conversation (symptoms, timeline, what the user described). Every row with a `recordId` is',
            'updated; every row without one is inserted. `fileUploadIds` attaches images the user included this turn.',
            'Batch same-shape writes into one call. Returns `referenceIds` in input order.',
        ].join(' '),
        inputSchema: toolMedicalRecordsUpsertInputSchema,
        execute: async (input) => {
            const inputs: GqlSAdminMedicalRecordInput[] = input.medicalRecords.map((record) => ({
                recordId: record.recordId ?? null,
                category: record.category,
                title: record.title,
                summary: record.summary,
                severity: record.severity ?? null,
                symptoms: record.symptoms,
                bodyAreas: record.bodyAreas,
                occurredAt: record.occurredAt ? new Date(record.occurredAt) : null,
                resolvedAt: record.resolvedAt ? new Date(record.resolvedAt) : null,
                appointmentId: record.appointmentId ?? null,
                topics: record.topics,
                fileUploadIds: record.fileUploadIds ?? null,
            }));
            return adminMedicalRecordsUpsert(requireAdminUserId(session), inputs, session, serverRuntime);
        },
    });
}
