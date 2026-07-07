import { tool } from 'ai';
import { z } from 'zod';
import { medicalAppointmentUpsert } from '../commands/medicalAppointmentUpsert';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { GqlSMedicalAppointmentStatusSchema, GqlSMedicalCategorySchema } from '../graphql/generated';
import type { GqlSSession } from '../graphql/generated';
import type { MedicalAgentMutationLog } from './agentPersonalAssistantMedical';
import { requireAdminUserId } from './requireAdminUserId';

// Direct create-or-edit for medical appointments. Hand-built input schema —
// same rationale as `toolMovieUpsert.ts`: Gemini's structured output rejects
// `z.date()`, so ISO strings ride the wire and the `execute` converts.

const medicalAppointmentUpsertInputSchema = z.object({
    appointmentId: z.uuid().nullish().describe('Omit (or null) to create a new appointment. Pass an existing id to edit.'),
    category: GqlSMedicalCategorySchema.describe('dentist | gp | dermatology | eyes | mentalHealth | ent | physio | other'),
    providerName: z.string().max(200).nullish().describe('e.g. "Dr Schmidt" or "Zahnarztpraxis Am Markt". Optional.'),
    title: z.string().min(1).max(200).describe('Short label for the visit, e.g. "routine check-up".'),
    notes: z.string().max(4000).nullish(),
    scheduledAt: z.string().describe('ISO-8601 timestamp of the intended visit time.'),
    completedAt: z.string().nullish().describe('ISO-8601 stamp when the visit actually happened. Set only when status is completed.'),
    nextDueAt: z.string().nullish().describe('ISO-8601 stamp for the next expected visit. Overrides the category cadence when present.'),
    status: GqlSMedicalAppointmentStatusSchema.describe('scheduled | completed | cancelled | missed'),
    topics: z.array(z.string()).describe('Free-form cluster tags. Empty array if none.'),
});

interface MedicalAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: MedicalAgentMutationLog;
}

export function toolMedicalAppointmentUpsert({ serverRuntime, session, mutations }: MedicalAgentMutationContext) {
    return tool({
        description: [
            'Create or edit a medical appointment (a scheduled or completed visit with a provider). For the common',
            '"I just went to the dentist" case, prefer `medicalAppointmentComplete` — it leaves other fields alone.',
            'This tool is for scheduling a new visit, editing an existing one, or documenting a past visit that',
            "wasn't previously in the system.",
        ].join(' '),
        inputSchema: medicalAppointmentUpsertInputSchema,
        execute: async (input) => {
            const result = await medicalAppointmentUpsert(
                requireAdminUserId(session),
                {
                    input: {
                        appointmentId: input.appointmentId ?? null,
                        category: input.category,
                        providerName: input.providerName ?? null,
                        title: input.title,
                        notes: input.notes ?? null,
                        scheduledAt: new Date(input.scheduledAt),
                        completedAt: input.completedAt ? new Date(input.completedAt) : null,
                        nextDueAt: input.nextDueAt ? new Date(input.nextDueAt) : null,
                        status: input.status,
                        topics: input.topics,
                    },
                },
                session,
                serverRuntime,
            );
            mutations.push({
                kind: input.appointmentId ? 'appointmentUpdate' : 'appointmentBook',
                id: result.appointmentId,
                title: result.title,
            });
            return result;
        },
    });
}
