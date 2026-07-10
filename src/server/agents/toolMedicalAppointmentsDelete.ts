import { tool } from 'ai';
import { z } from 'zod';
import { adminMedicalAppointmentsDelete } from '../commands/adminMedicalAppointmentsDelete';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import type { MedicalAgentMutationLog } from './agentPersonalAssistantMedical';
import { requireAdminUserId } from './requireAdminUserId';

const toolMedicalAppointmentsDeleteInputSchema = z.object({
    appointmentIds: z
        .array(z.uuid())
        .min(1)
        .describe('Appointment row ids to delete. Linked records survive — their `appointmentId` is nulled out.'),
});

interface MedicalAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: MedicalAgentMutationLog;
}

export function toolMedicalAppointmentsDelete({ serverRuntime, session, mutations }: MedicalAgentMutationContext) {
    return tool({
        description: [
            'Permanently delete one or more appointments. Linked records survive — their `appointmentId` is nulled',
            'out. Prefer editing the appointment to `status: cancelled` or `missed` unless the user really wants the',
            'row gone.',
        ].join(' '),
        inputSchema: toolMedicalAppointmentsDeleteInputSchema,
        execute: async (input) => {
            const result = await adminMedicalAppointmentsDelete(requireAdminUserId(session), input.appointmentIds, session, serverRuntime);
            for (const appointmentId of input.appointmentIds) mutations.push({ kind: 'appointmentDelete', id: appointmentId });
            return result;
        },
    });
}
