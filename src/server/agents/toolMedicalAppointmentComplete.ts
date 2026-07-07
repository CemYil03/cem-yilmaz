import { tool } from 'ai';
import { z } from 'zod';
import { medicalAppointmentComplete } from '../commands/medicalAppointmentComplete';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import type { MedicalAgentMutationLog } from './agentPersonalAssistantMedical';
import { requireAdminUserId } from './requireAdminUserId';

const medicalAppointmentCompleteInputSchema = z.object({
    appointmentId: z.uuid().describe('Existing appointment row id.'),
    completedAt: z.string().nullish().describe('ISO-8601 stamp when the visit happened. Defaults to now.'),
    nextDueAt: z
        .string()
        .nullish()
        .describe('Optional ISO-8601 stamp for the next expected visit, e.g. when the doctor sets a specific follow-up date.'),
});

interface MedicalAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: MedicalAgentMutationLog;
}

export function toolMedicalAppointmentComplete({ serverRuntime, session, mutations }: MedicalAgentMutationContext) {
    return tool({
        description: [
            'Mark an appointment as completed. Flips status to `completed`, stamps `completedAt`, optionally writes',
            '`nextDueAt` for the follow-up. Prefer this over `medicalAppointmentUpsert` for the common "I just went to',
            'the dentist" case — leaves every other field alone.',
        ].join(' '),
        inputSchema: medicalAppointmentCompleteInputSchema,
        execute: async (input) => {
            const result = await medicalAppointmentComplete(
                requireAdminUserId(session),
                {
                    appointmentId: input.appointmentId,
                    completedAt: input.completedAt ? new Date(input.completedAt) : null,
                    nextDueAt: input.nextDueAt ? new Date(input.nextDueAt) : null,
                },
                session,
                serverRuntime,
            );
            mutations.push({ kind: 'appointmentComplete', id: result.appointmentId, title: result.title });
            return result;
        },
    });
}
