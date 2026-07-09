import { inArray } from 'drizzle-orm';
import { medicalAppointments } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Batch delete of appointments. Linked `MedicalRecords.appointmentId` are
// set to null via the FK's `on delete set null` — records survive the
// deletion. A caller-supplied id that never existed makes the batch throw.
export async function medicalAppointmentsDelete(
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
            throw new Error(`medicalAppointmentsDelete: rows not found: ${missing.join(', ')}`);
        }
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: [...appointmentIds] };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
