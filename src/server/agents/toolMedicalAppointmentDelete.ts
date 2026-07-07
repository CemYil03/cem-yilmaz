import { tool } from 'ai';
import { z } from 'zod';
import { medicalAppointmentDelete } from '../commands/medicalAppointmentDelete';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import type { MedicalAgentMutationLog } from './agentPersonalAssistantMedical';
import { requireAdminUserId } from './requireAdminUserId';

const medicalAppointmentDeleteInputSchema = z.object({
    appointmentId: z.uuid().describe('Appointment row id to delete.'),
});

interface MedicalAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: MedicalAgentMutationLog;
}

export function toolMedicalAppointmentDelete({ serverRuntime, session, mutations }: MedicalAgentMutationContext) {
    return tool({
        description: [
            'Permanently delete an appointment. Linked records survive — their `appointmentId` is nulled out. Prefer',
            'editing the appointment to `status: cancelled` or `missed` unless the user really wants the row gone.',
        ].join(' '),
        inputSchema: medicalAppointmentDeleteInputSchema,
        execute: async (input) => {
            const result = await medicalAppointmentDelete(
                requireAdminUserId(session),
                { appointmentId: input.appointmentId },
                session,
                serverRuntime,
            );
            mutations.push({ kind: 'appointmentDelete', id: input.appointmentId });
            return result;
        },
    });
}
