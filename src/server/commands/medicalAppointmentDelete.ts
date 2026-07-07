import { eq } from 'drizzle-orm';
import { medicalAppointments } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutationMedicalAppointmentDeleteArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Delete an appointment. Linked `MedicalRecords.appointmentId` are set to
// null via the FK's `on delete set null` — records survive the deletion.
export async function medicalAppointmentDelete(
    userId: string,
    args: GqlSAdminMutationMedicalAppointmentDeleteArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const deleted = await serverRuntime.db
            .delete(medicalAppointments)
            .where(eq(medicalAppointments.appointmentId, args.appointmentId))
            .returning({ appointmentId: medicalAppointments.appointmentId });
        if (deleted.length === 0) throw new Error(`medicalAppointmentDelete: row ${args.appointmentId} not found`);
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
