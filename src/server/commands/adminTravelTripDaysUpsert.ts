import { eq, inArray } from 'drizzle-orm';
import { adminTravelTripDays, adminTravelTrips } from '../db/schema';
import type { AdminTravelTripDayCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminTravelTripDayInput, GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Batch upsert of trip days. Every row with a `tripDayId` is updated; every
// row without one is inserted. Parent trip existence is verified in one
// round-trip regardless of batch size — a hallucinated `tripId` fails the
// transaction rather than landing as an FK violation. `dayNumber` is unique
// per trip; a collision surfaces as the DB unique-index violation.
export async function adminTravelTripDaysUpsert(
    userId: string,
    inputs: readonly GqlSAdminTravelTripDayInput[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    const now = new Date();

    // Phase 1 — payload construction.
    const rows = inputs.map((day) => {
        const tripDayId = day.tripDayId ?? crypto.randomUUID();
        const payload: AdminTravelTripDayCreate = {
            tripDayId,
            tripId: day.tripId,
            dayNumber: day.dayNumber,
            date: day.date ?? null,
            title: day.title ?? null,
            summary: day.summary ?? null,
            updatedAt: now,
        };
        return { tripDayId, tripId: day.tripId, isUpdate: Boolean(day.tripDayId), payload };
    });

    // Phase 2 — transactional execution.
    try {
        const parentTripIds = Array.from(new Set(rows.map((row) => row.tripId)));
        const updateIds = rows.filter((row) => row.isUpdate).map((row) => row.tripDayId);
        await serverRuntime.db.transaction(async (transaction) => {
            const parents = await transaction
                .select({ tripId: adminTravelTrips.tripId })
                .from(adminTravelTrips)
                .where(inArray(adminTravelTrips.tripId, parentTripIds));
            if (parents.length !== parentTripIds.length) {
                const found = new Set(parents.map((row) => row.tripId));
                const missing = parentTripIds.filter((id) => !found.has(id));
                throw new Error(`adminTravelTripDaysUpsert: parent trips not found: ${missing.join(', ')}`);
            }
            if (updateIds.length > 0) {
                const existing = await transaction
                    .select({ tripDayId: adminTravelTripDays.tripDayId })
                    .from(adminTravelTripDays)
                    .where(inArray(adminTravelTripDays.tripDayId, updateIds));
                if (existing.length !== updateIds.length) {
                    const found = new Set(existing.map((row) => row.tripDayId));
                    const missing = updateIds.filter((id) => !found.has(id));
                    throw new Error(`adminTravelTripDaysUpsert: rows not found: ${missing.join(', ')}`);
                }
            }
            for (const row of rows) {
                if (row.isUpdate) {
                    await transaction.update(adminTravelTripDays).set(row.payload).where(eq(adminTravelTripDays.tripDayId, row.tripDayId));
                } else {
                    await transaction.insert(adminTravelTripDays).values(row.payload);
                }
            }
        });
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: rows.map((row) => row.tripDayId) };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
