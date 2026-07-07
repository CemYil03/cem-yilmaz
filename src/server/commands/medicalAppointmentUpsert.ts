import { eq } from 'drizzle-orm';
import { medicalAppointments } from '../db/schema';
import type { MedicalAppointmentCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutationMedicalAppointmentUpsertArgs, GqlSMedicalAppointment, GqlSSession } from '../graphql/generated';
import { toGqlMedicalAppointment } from '../mappers/toGqlMedicalAppointment';

// Two-phase upsert (same shape as `movieUpsert`). `appointmentId` set →
// update; absent → insert. The medical page and the sub-agent both call
// this — the agent to file a visit dictated in chat, the editor to draft
// a new booking. Every write publishes `userUpdates` so the workspace
// medical page reconciles without a refetch.
export async function medicalAppointmentUpsert(
    userId: string,
    args: GqlSAdminMutationMedicalAppointmentUpsertArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMedicalAppointment> {
    const { input } = args;
    const appointmentId = input.appointmentId ?? crypto.randomUUID();
    const now = new Date();

    const payload: MedicalAppointmentCreate = {
        appointmentId,
        category: input.category,
        providerName: input.providerName ?? null,
        title: input.title,
        notes: input.notes ?? null,
        scheduledAt: input.scheduledAt,
        completedAt: input.completedAt ?? null,
        nextDueAt: input.nextDueAt ?? null,
        status: input.status,
        topics: input.topics,
        updatedAt: now,
    };

    try {
        let row;
        if (input.appointmentId) {
            const [updated] = await serverRuntime.db
                .update(medicalAppointments)
                .set(payload)
                .where(eq(medicalAppointments.appointmentId, input.appointmentId))
                .returning();
            if (!updated) throw new Error(`medicalAppointmentUpsert: row ${input.appointmentId} not found`);
            row = updated;
        } else {
            const [inserted] = await serverRuntime.db.insert(medicalAppointments).values(payload).returning();
            if (!inserted) throw new Error('medicalAppointmentUpsert: insert returned no rows');
            row = inserted;
        }
        await serverRuntime.publish.userUpdates({ userId });
        return toGqlMedicalAppointment(row);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
