import { eq, inArray } from 'drizzle-orm';
import { medicalAppointments } from '../db/schema';
import type { MedicalAppointmentCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMedicalAppointmentInput, GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Batch upsert of medical appointments. Every input with an `appointmentId`
// is updated; every input without one is inserted under a freshly-minted
// UUID. The whole batch runs inside a single transaction so a partial
// failure rolls back to zero writes. `referenceIds` echoes the id per input
// row (in input order) so the caller can address newly-created rows without
// a follow-up read.
//
// Completing an appointment is a one-element upsert with `status: completed`
// and `completedAt` set — the caller spreads the existing row (from the
// subscription payload) and overrides those fields. There is no separate
// "complete" path.
export async function medicalAppointmentsUpsert(
    userId: string,
    inputs: readonly GqlSMedicalAppointmentInput[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    const now = new Date();

    // Phase 1 — payload construction.
    const rows = inputs.map((input) => {
        const appointmentId = input.appointmentId ?? crypto.randomUUID();
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
        return { appointmentId, isUpdate: Boolean(input.appointmentId), payload };
    });

    // Phase 2 — transactional execution.
    try {
        const updateIds = rows.filter((row) => row.isUpdate).map((row) => row.appointmentId);
        await serverRuntime.db.transaction(async (transaction) => {
            if (updateIds.length > 0) {
                const existing = await transaction
                    .select({ appointmentId: medicalAppointments.appointmentId })
                    .from(medicalAppointments)
                    .where(inArray(medicalAppointments.appointmentId, updateIds));
                if (existing.length !== updateIds.length) {
                    const found = new Set(existing.map((row) => row.appointmentId));
                    const missing = updateIds.filter((id) => !found.has(id));
                    throw new Error(`medicalAppointmentsUpsert: rows not found: ${missing.join(', ')}`);
                }
            }
            for (const row of rows) {
                if (row.isUpdate) {
                    await transaction
                        .update(medicalAppointments)
                        .set(row.payload)
                        .where(eq(medicalAppointments.appointmentId, row.appointmentId));
                } else {
                    await transaction.insert(medicalAppointments).values(row.payload);
                }
            }
        });
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: rows.map((row) => row.appointmentId) };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
