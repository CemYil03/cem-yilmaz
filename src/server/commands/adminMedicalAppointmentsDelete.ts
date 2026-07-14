import { tool } from 'ai';
import { inArray } from 'drizzle-orm';
import { z } from 'zod';
import { requireAdminUserId } from '../agents/requireAdminUserId';
import { medicalAppointments } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Batch delete of appointments. Linked `MedicalRecords.appointmentId` are
// set to null via the FK's `on delete set null` — records survive the
// deletion. A caller-supplied id that never existed makes the batch throw.
export async function adminMedicalAppointmentsDelete(
    userId: string,
    appointmentIds: readonly string[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const deleted = await serverRuntime.db
            .delete(medicalAppointments)
            .where(inArray(medicalAppointments.appointmentId, appointmentIds as string[]))
            .returning({ appointmentId: medicalAppointments.appointmentId });
        if (deleted.length !== appointmentIds.length) {
            const found = new Set(deleted.map((row) => row.appointmentId));
            const missing = appointmentIds.filter((id) => !found.has(id));
            throw new Error(`adminMedicalAppointmentsDelete: rows not found: ${missing.join(', ')}`);
        }
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: [...appointmentIds] };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}

const toolMedicalAppointmentsDeleteInputSchema = z.object({
    appointmentIds: z
        .array(z.uuid())
        .min(1)
        .describe('Appointment row ids to delete. Linked records survive — their `appointmentId` is nulled out.'),
});

interface MedicalAgentToolContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
}

export function toolMedicalAppointmentsDelete({ serverRuntime, session }: MedicalAgentToolContext) {
    return tool({
        description: [
            'Permanently delete one or more appointments. Linked records survive — their `appointmentId` is nulled',
            'out. Prefer editing the appointment to `status: cancelled` or `missed` unless the user really wants the',
            'row gone.',
        ].join(' '),
        inputSchema: toolMedicalAppointmentsDeleteInputSchema,
        execute: async (input) => {
            return adminMedicalAppointmentsDelete(requireAdminUserId(session), input.appointmentIds, session, serverRuntime);
        },
    });
}
