import { eq, inArray } from 'drizzle-orm';
import { trips } from '../db/schema';
import type { TripCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession, GqlSTripInput } from '../graphql/generated';

// Batch upsert of trips. Every row with a `tripId` is updated; every row
// without one is inserted under a freshly-minted UUID. The whole batch runs
// inside a single transaction so a failure anywhere rolls the plan back —
// nothing lands half-written. `referenceIds` echoes the id per input row (in
// input order) so the caller can address newly-created rows without a
// follow-up read.
export async function tripsUpsert(
    userId: string,
    inputs: readonly GqlSTripInput[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    const now = new Date();

    // Phase 1 — payload construction.
    const rows = inputs.map((trip) => {
        const tripId = trip.tripId ?? crypto.randomUUID();
        const payload: TripCreate = {
            tripId,
            title: trip.title,
            destination: trip.destination,
            startsOn: trip.startsOn ?? null,
            endsOn: trip.endsOn ?? null,
            status: trip.status,
            transportMode: trip.transportMode ?? null,
            accommodation: trip.accommodation ?? null,
            notes: trip.notes ?? null,
            updatedAt: now,
        };
        return { tripId, isUpdate: Boolean(trip.tripId), payload };
    });

    // Phase 2 — transactional execution.
    try {
        const updateIds = rows.filter((row) => row.isUpdate).map((row) => row.tripId);
        await serverRuntime.db.transaction(async (transaction) => {
            if (updateIds.length > 0) {
                const existing = await transaction.select({ tripId: trips.tripId }).from(trips).where(inArray(trips.tripId, updateIds));
                if (existing.length !== updateIds.length) {
                    const found = new Set(existing.map((row) => row.tripId));
                    const missing = updateIds.filter((id) => !found.has(id));
                    throw new Error(`tripsUpsert: rows not found: ${missing.join(', ')}`);
                }
            }
            for (const row of rows) {
                if (row.isUpdate) {
                    await transaction.update(trips).set(row.payload).where(eq(trips.tripId, row.tripId));
                } else {
                    await transaction.insert(trips).values(row.payload);
                }
            }
        });
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: rows.map((row) => row.tripId) };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
