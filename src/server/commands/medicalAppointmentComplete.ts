import { eq } from 'drizzle-orm';
import { medicalAppointments } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutationMedicalAppointmentCompleteArgs, GqlSMedicalAppointment, GqlSSession } from '../graphql/generated';
import { toGqlMedicalAppointment } from '../mappers/toGqlMedicalAppointment';

// Convenience shortcut over `medicalAppointmentUpsert`: flips an appointment
// to `status='completed'`, stamps `completedAt` (defaults to now), and
// optionally writes `nextDueAt` for the "book me in six months" follow-up.
// Untouched fields stay as-is. The overview tab's "Mark completed" button
// binds to this so the common flow is one click, not a full form.
export async function medicalAppointmentComplete(
    userId: string,
    args: GqlSAdminMutationMedicalAppointmentCompleteArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMedicalAppointment> {
    const { appointmentId, completedAt, nextDueAt } = args;
    const now = new Date();
    try {
        const [updated] = await serverRuntime.db
            .update(medicalAppointments)
            .set({
                status: 'completed',
                completedAt: completedAt ?? now,
                ...(nextDueAt !== null && nextDueAt !== undefined ? { nextDueAt } : {}),
                updatedAt: now,
            })
            .where(eq(medicalAppointments.appointmentId, appointmentId))
            .returning();
        if (!updated) throw new Error(`medicalAppointmentComplete: row ${appointmentId} not found`);
        await serverRuntime.publish.userUpdates({ userId });
        return toGqlMedicalAppointment(updated);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
