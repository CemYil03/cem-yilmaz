import { tool } from 'ai';
import { z } from 'zod';
import { medicalRecordUpsert } from '../commands/medicalRecordUpsert';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { GqlSMedicalCategorySchema, GqlSMedicalRecordSeveritySchema } from '../graphql/generated';
import type { GqlSSession } from '../graphql/generated';
import type { MedicalAgentMutationLog } from './agentPersonalAssistantMedical';
import { requireAdminUserId } from './requireAdminUserId';

// Primary write path for the sub-agent: file a health-journal record from a
// chat conversation. `fileUploadIds` lets the same call attach photos the
// user pasted into the current turn — the orchestrator forwards those ids
// through the delegate brief and this tool consumes them.

const medicalRecordUpsertInputSchema = z.object({
    recordId: z.uuid().nullish().describe('Omit (or null) to create a new record. Pass an existing id to edit.'),
    category: GqlSMedicalCategorySchema.describe('dentist | gp | dermatology | eyes | mentalHealth | ent | physio | other'),
    title: z.string().min(1).max(200).describe('Short title, e.g. "Rash on forearm".'),
    summary: z
        .string()
        .min(1)
        .max(8000)
        .describe(
            "Structured writeup of what the user described, in the user's language. Include: what happened, when it started, symptoms, what makes it better/worse, any relevant history. End with the standard disclaimer.",
        ),
    severity: GqlSMedicalRecordSeveritySchema.nullish().describe('info | mild | moderate | severe. Omit if genuinely unclear.'),
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

interface MedicalAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: MedicalAgentMutationLog;
}

export function toolMedicalRecordUpsert({ serverRuntime, session, mutations }: MedicalAgentMutationContext) {
    return tool({
        description: [
            'Create or edit a medical record — the primary write. Use for filing a health-journal entry from a chat',
            'conversation (symptoms, timeline, what the user described). `fileUploadIds` attaches images the user',
            'included in this turn.',
        ].join(' '),
        inputSchema: medicalRecordUpsertInputSchema,
        execute: async (input) => {
            const result = await medicalRecordUpsert(
                requireAdminUserId(session),
                {
                    input: {
                        recordId: input.recordId ?? null,
                        category: input.category,
                        title: input.title,
                        summary: input.summary,
                        severity: input.severity ?? null,
                        symptoms: input.symptoms,
                        bodyAreas: input.bodyAreas,
                        occurredAt: input.occurredAt ? new Date(input.occurredAt) : null,
                        resolvedAt: input.resolvedAt ? new Date(input.resolvedAt) : null,
                        appointmentId: input.appointmentId ?? null,
                        topics: input.topics,
                        fileUploadIds: input.fileUploadIds ?? null,
                    },
                },
                session,
                serverRuntime,
            );
            mutations.push({
                kind: input.recordId ? 'recordUpdate' : 'recordAdd',
                id: result.recordId,
                title: result.title,
            });
            return result;
        },
    });
}
