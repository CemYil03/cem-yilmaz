import { desc, eq, inArray } from 'drizzle-orm';
import { tripActivities, tripDays } from '../db/schema';
import type { TripActivityCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession, GqlSTripActivityInput } from '../graphql/generated';

// Batch upsert of trip activities. Every row with a `tripActivityId` is
// updated; every row without one is inserted. Parent-day existence verified
// in one round-trip. `position` defaults to "one past the current max
// within the parent day" — the tail is read once per `tripDayId` and then
// incremented locally so a same-day batch lays out its new activities
// contiguously without hammering the DB per row.
export async function tripActivitiesUpsert(
    userId: string,
    inputs: readonly GqlSTripActivityInput[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    const now = new Date();

    // Phase 1 — assign ids up front so the returned `referenceIds` echoes
    // input order (position defaults are resolved in the transaction).
    const seeds = inputs.map((activity) => ({
        tripActivityId: activity.tripActivityId ?? crypto.randomUUID(),
        activity,
        isUpdate: Boolean(activity.tripActivityId),
    }));

    // Phase 2 — transactional execution.
    try {
        const parentDayIds = Array.from(new Set(seeds.map((seed) => seed.activity.tripDayId)));
        const updateIds = seeds.filter((seed) => seed.isUpdate).map((seed) => seed.tripActivityId);

        await serverRuntime.db.transaction(async (transaction) => {
            const parents = await transaction
                .select({ tripDayId: tripDays.tripDayId })
                .from(tripDays)
                .where(inArray(tripDays.tripDayId, parentDayIds));
            if (parents.length !== parentDayIds.length) {
                const found = new Set(parents.map((row) => row.tripDayId));
                const missing = parentDayIds.filter((id) => !found.has(id));
                throw new Error(`tripActivitiesUpsert: parent tripDays not found: ${missing.join(', ')}`);
            }
            if (updateIds.length > 0) {
                const existing = await transaction
                    .select({ tripActivityId: tripActivities.tripActivityId })
                    .from(tripActivities)
                    .where(inArray(tripActivities.tripActivityId, updateIds));
                if (existing.length !== updateIds.length) {
                    const found = new Set(existing.map((row) => row.tripActivityId));
                    const missing = updateIds.filter((id) => !found.has(id));
                    throw new Error(`tripActivitiesUpsert: rows not found: ${missing.join(', ')}`);
                }
            }

            const tailByDay = new Map<string, number>();
            for (const { tripActivityId, activity, isUpdate } of seeds) {
                let position = activity.position ?? null;
                if (position === null && !isUpdate) {
                    const cached = tailByDay.get(activity.tripDayId);
                    if (cached === undefined) {
                        const [top] = await transaction
                            .select({ position: tripActivities.position })
                            .from(tripActivities)
                            .where(eq(tripActivities.tripDayId, activity.tripDayId))
                            .orderBy(desc(tripActivities.position))
                            .limit(1);
                        position = top ? top.position + 1 : 0;
                    } else {
                        position = cached + 1;
                    }
                    tailByDay.set(activity.tripDayId, position);
                }
                const payload: TripActivityCreate = {
                    tripActivityId,
                    tripDayId: activity.tripDayId,
                    position: position ?? 0,
                    startsAt: activity.startsAt ?? null,
                    endsAt: activity.endsAt ?? null,
                    title: activity.title,
                    location: activity.location ?? null,
                    url: activity.url ?? null,
                    notes: activity.notes ?? null,
                    updatedAt: now,
                };
                if (isUpdate) {
                    await transaction.update(tripActivities).set(payload).where(eq(tripActivities.tripActivityId, tripActivityId));
                } else {
                    await transaction.insert(tripActivities).values(payload);
                }
            }
        });
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: seeds.map((seed) => seed.tripActivityId) };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
