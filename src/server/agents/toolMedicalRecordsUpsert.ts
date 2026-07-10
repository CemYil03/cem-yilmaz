import { tool } from 'ai';
import { z } from 'zod';
import { adminMedicalRecordsUpsert } from '../commands/adminMedicalRecordsUpsert';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { GqlSAdminMedicalCategorySchema, GqlSAdminMedicalRecordSeveritySchema } from '../graphql/generated';
import type { GqlSAdminMedicalRecordInput, GqlSSession } from '../graphql/generated';
import type { MedicalAgentMutationLog } from './agentPersonalAssistantMedical';
import { requireAdminUserId } from './requireAdminUserId';

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

interface MedicalAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: MedicalAgentMutationLog;
}

export function toolMedicalRecordsUpsert({ serverRuntime, session, mutations }: MedicalAgentMutationContext) {
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
            const result = await adminMedicalRecordsUpsert(requireAdminUserId(session), inputs, session, serverRuntime);
            const referenceIds = result.referenceIds ?? [];
            input.medicalRecords.forEach((record, index) => {
                mutations.push({
                    kind: record.recordId ? 'recordUpdate' : 'recordAdd',
                    id: referenceIds[index] ?? record.recordId ?? '',
                    title: record.title,
                });
            });
            return result;
        },
    });
}
