import { tool } from 'ai';
import { z } from 'zod';
import { medicalAppointmentsUpsert } from '../commands/medicalAppointmentsUpsert';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { GqlSMedicalAppointmentStatusSchema, GqlSMedicalCategorySchema } from '../graphql/generated';
import type { GqlSMedicalAppointmentInput, GqlSSession } from '../graphql/generated';
import type { MedicalAgentMutationLog } from './agentPersonalAssistantMedical';
import { requireAdminUserId } from './requireAdminUserId';

// Batch create-or-edit of medical appointments. Hand-built item schema —
// same rationale as `toolMoviesUpsert.ts`: Gemini's structured output rejects
// `z.date()`, so the DateTime fields ride the wire as ISO strings and the
// `execute` converts with `new Date(...)`. Only the GraphQL enum schemas are
// reused so a future enum addition surfaces as a TS error here.

const medicalAppointmentItemSchema = z.object({
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

const toolMedicalAppointmentsUpsertInputSchema = z.object({
    medicalAppointments: z
        .array(medicalAppointmentItemSchema)
        .min(1)
        .describe('One or more appointments to create or edit. Pass a one-element array for a single edit.'),
});

interface MedicalAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: MedicalAgentMutationLog;
}

export function toolMedicalAppointmentsUpsert({ serverRuntime, session, mutations }: MedicalAgentMutationContext) {
    return tool({
        description: [
            'Batch create-or-edit of medical appointments (scheduled or completed visits with a provider). Every row',
            'with an `appointmentId` is updated; every row without one is inserted. To COMPLETE a visit, pass a',
            'one-element array carrying the existing appointment plus `status: completed` and `completedAt` set',
            '(may be earlier than now). Batch same-shape writes into one call. Returns `referenceIds` in input order.',
        ].join(' '),
        inputSchema: toolMedicalAppointmentsUpsertInputSchema,
        execute: async (input) => {
            const inputs: GqlSMedicalAppointmentInput[] = input.medicalAppointments.map((appointment) => ({
                appointmentId: appointment.appointmentId ?? null,
                category: appointment.category,
                providerName: appointment.providerName ?? null,
                title: appointment.title,
                notes: appointment.notes ?? null,
                scheduledAt: new Date(appointment.scheduledAt),
                completedAt: appointment.completedAt ? new Date(appointment.completedAt) : null,
                nextDueAt: appointment.nextDueAt ? new Date(appointment.nextDueAt) : null,
                status: appointment.status,
                topics: appointment.topics,
            }));
            const result = await medicalAppointmentsUpsert(requireAdminUserId(session), inputs, session, serverRuntime);
            const referenceIds = result.referenceIds ?? [];
            input.medicalAppointments.forEach((appointment, index) => {
                mutations.push({
                    kind: appointment.appointmentId ? 'appointmentUpdate' : 'appointmentBook',
                    id: referenceIds[index] ?? appointment.appointmentId ?? '',
                    title: appointment.title,
                });
            });
            return result;
        },
    });
}
