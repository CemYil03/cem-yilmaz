import { and, desc, eq, inArray } from 'drizzle-orm';
import { tripActivities, tripDays, tripPackingItems, trips } from '../db/schema';
import type { TripActivityCreate, TripCreate, TripDayCreate, TripPackingItemCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSSession,
    GqlSTrip,
    GqlSTripActivityInput,
    GqlSTripDayInput,
    GqlSTripInput,
    GqlSTripPackingItemInput,
} from '../graphql/generated';
import { tripGet } from '../queries/tripGet';

// One-shot deep upsert of a whole trip plan. The AI use-case is planning a
// multi-day trip in a single turn: the sub-agent otherwise fans out into
// `tripUpsert` + N × `tripDayUpsert` + M × `tripActivityUpsert` + K ×
// `tripPackingItemUpsert` — 10+ tool calls that brush against
// `isStepCount(10)`. This command collapses that to one call inside a single
// transaction.
//
// Merge-only semantics: nested `days` / `packingItems` are upserts. To
// remove existing children pass explicit ids in `removeDayIds` /
// `removeActivityIds` / `removePackingItemIds`. Omitting a day never
// deletes it — safer for the agent than a `replace: true` toggle.
//
// Not exposed as a GraphQL mutation. The UI uses the granular commands
// directly; this exists to give the agent a single call for whole-plan
// writes.

// Nested day payload: same shape as `TripDayInput` minus `tripId` (inferred
// from the outer trip after the root upsert lands) plus an optional
// `activities` list.
export type TripDayUpsertDeepInput = Omit<GqlSTripDayInput, 'tripId'> & {
    activities?: Array<Omit<GqlSTripActivityInput, 'tripDayId'>> | null;
};

// Nested packing payload: same shape as `TripPackingItemInput` minus
// `tripId`.
export type TripPackingItemUpsertDeepInput = Omit<GqlSTripPackingItemInput, 'tripId'>;

export interface TripUpsertDeepInput {
    trip: GqlSTripInput;
    days?: TripDayUpsertDeepInput[] | null;
    packingItems?: TripPackingItemUpsertDeepInput[] | null;
    removeDayIds?: string[] | null;
    removeActivityIds?: string[] | null;
    removePackingItemIds?: string[] | null;
}

export async function tripUpsertDeep(
    userId: string,
    input: TripUpsertDeepInput,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSTrip> {
    const now = new Date();
    const tripId = input.trip.tripId ?? crypto.randomUUID();

    try {
        await serverRuntime.db.transaction(async (transaction) => {
            // --- root trip ---
            const tripPayload: TripCreate = {
                tripId,
                title: input.trip.title,
                destination: input.trip.destination,
                startsOn: input.trip.startsOn ?? null,
                endsOn: input.trip.endsOn ?? null,
                status: input.trip.status,
                transportMode: input.trip.transportMode ?? null,
                accommodation: input.trip.accommodation ?? null,
                notes: input.trip.notes ?? null,
                updatedAt: now,
            };
            if (input.trip.tripId) {
                const [updated] = await transaction.update(trips).set(tripPayload).where(eq(trips.tripId, input.trip.tripId)).returning();
                if (!updated) throw new Error(`tripUpsertDeep: trip ${input.trip.tripId} not found`);
            } else {
                const [inserted] = await transaction.insert(trips).values(tripPayload).returning();
                if (!inserted) throw new Error('tripUpsertDeep: trip insert returned no rows');
            }

            // --- explicit removes, in reverse-dependency order so cascades
            // never fight anything explicit. Every id is scoped to `tripId`
            // (and its descendants) to prevent cross-trip damage from a
            // hallucinated id in the input.
            if (input.removeActivityIds && input.removeActivityIds.length > 0) {
                // Restrict to activities whose parent day belongs to this
                // trip. Sub-select rather than a JOIN so the drizzle types
                // stay clean.
                const dayIdsForTrip = await transaction
                    .select({ tripDayId: tripDays.tripDayId })
                    .from(tripDays)
                    .where(eq(tripDays.tripId, tripId));
                const dayIdSet = new Set(dayIdsForTrip.map((row) => row.tripDayId));
                if (dayIdSet.size > 0) {
                    await transaction
                        .delete(tripActivities)
                        .where(
                            and(
                                inArray(tripActivities.tripActivityId, input.removeActivityIds),
                                inArray(tripActivities.tripDayId, Array.from(dayIdSet)),
                            ),
                        );
                }
            }
            if (input.removeDayIds && input.removeDayIds.length > 0) {
                await transaction.delete(tripDays).where(and(inArray(tripDays.tripDayId, input.removeDayIds), eq(tripDays.tripId, tripId)));
            }
            if (input.removePackingItemIds && input.removePackingItemIds.length > 0) {
                await transaction
                    .delete(tripPackingItems)
                    .where(
                        and(inArray(tripPackingItems.tripPackingItemId, input.removePackingItemIds), eq(tripPackingItems.tripId, tripId)),
                    );
            }

            // --- nested days (+ their activities) ---
            if (input.days && input.days.length > 0) {
                for (const day of input.days) {
                    const tripDayId = day.tripDayId ?? crypto.randomUUID();
                    const dayPayload: TripDayCreate = {
                        tripDayId,
                        tripId,
                        dayNumber: day.dayNumber,
                        date: day.date ?? null,
                        title: day.title ?? null,
                        summary: day.summary ?? null,
                        updatedAt: now,
                    };
                    if (day.tripDayId) {
                        const [updated] = await transaction
                            .update(tripDays)
                            .set(dayPayload)
                            .where(and(eq(tripDays.tripDayId, day.tripDayId), eq(tripDays.tripId, tripId)))
                            .returning();
                        if (!updated) throw new Error(`tripUpsertDeep: tripDay ${day.tripDayId} not found on trip ${tripId}`);
                    } else {
                        const [inserted] = await transaction.insert(tripDays).values(dayPayload).returning();
                        if (!inserted) throw new Error('tripUpsertDeep: tripDay insert returned no rows');
                    }

                    if (day.activities && day.activities.length > 0) {
                        // Compute the "one past current max" tail position
                        // once per day for any activity that omits its
                        // `position`. Reads from the DB so newly-inserted
                        // rows earlier in this loop are seen.
                        let tailPosition: number | null = null;
                        for (const activity of day.activities) {
                            const tripActivityId = activity.tripActivityId ?? crypto.randomUUID();
                            let position = activity.position ?? null;
                            if (position === null && !activity.tripActivityId) {
                                if (tailPosition === null) {
                                    const [top] = await transaction
                                        .select({ position: tripActivities.position })
                                        .from(tripActivities)
                                        .where(eq(tripActivities.tripDayId, tripDayId))
                                        .orderBy(desc(tripActivities.position))
                                        .limit(1);
                                    tailPosition = top ? top.position + 1 : 0;
                                } else {
                                    tailPosition += 1;
                                }
                                position = tailPosition;
                            }
                            const activityPayload: TripActivityCreate = {
                                tripActivityId,
                                tripDayId,
                                position: position ?? 0,
                                startsAt: activity.startsAt ?? null,
                                endsAt: activity.endsAt ?? null,
                                title: activity.title,
                                location: activity.location ?? null,
                                url: activity.url ?? null,
                                notes: activity.notes ?? null,
                                updatedAt: now,
                            };
                            if (activity.tripActivityId) {
                                const [updated] = await transaction
                                    .update(tripActivities)
                                    .set(activityPayload)
                                    .where(
                                        and(
                                            eq(tripActivities.tripActivityId, activity.tripActivityId),
                                            eq(tripActivities.tripDayId, tripDayId),
                                        ),
                                    )
                                    .returning();
                                if (!updated)
                                    throw new Error(
                                        `tripUpsertDeep: tripActivity ${activity.tripActivityId} not found on tripDay ${tripDayId}`,
                                    );
                            } else {
                                const [inserted] = await transaction.insert(tripActivities).values(activityPayload).returning();
                                if (!inserted) throw new Error('tripUpsertDeep: tripActivity insert returned no rows');
                            }
                        }
                    }
                }
            }

            // --- packing items ---
            if (input.packingItems && input.packingItems.length > 0) {
                // Same tail-position trick as activities, but per
                // `(tripId, category)`.
                const tailByCategory = new Map<string, number>();
                for (const item of input.packingItems) {
                    const tripPackingItemId = item.tripPackingItemId ?? crypto.randomUUID();
                    let position = item.position ?? null;
                    if (position === null && !item.tripPackingItemId) {
                        const cached = tailByCategory.get(item.category);
                        if (cached === undefined) {
                            const [top] = await transaction
                                .select({ position: tripPackingItems.position })
                                .from(tripPackingItems)
                                .where(and(eq(tripPackingItems.tripId, tripId), eq(tripPackingItems.category, item.category)))
                                .orderBy(desc(tripPackingItems.position))
                                .limit(1);
                            position = top ? top.position + 1 : 0;
                        } else {
                            position = cached + 1;
                        }
                        tailByCategory.set(item.category, position);
                    }
                    const packingPayload: TripPackingItemCreate = {
                        tripPackingItemId,
                        tripId,
                        category: item.category,
                        label: item.label,
                        quantity: item.quantity ?? 1,
                        packed: item.packed ?? false,
                        position: position ?? 0,
                        notes: item.notes ?? null,
                        updatedAt: now,
                    };
                    if (item.tripPackingItemId) {
                        const [updated] = await transaction
                            .update(tripPackingItems)
                            .set(packingPayload)
                            .where(and(eq(tripPackingItems.tripPackingItemId, item.tripPackingItemId), eq(tripPackingItems.tripId, tripId)))
                            .returning();
                        if (!updated)
                            throw new Error(`tripUpsertDeep: tripPackingItem ${item.tripPackingItemId} not found on trip ${tripId}`);
                    } else {
                        const [inserted] = await transaction.insert(tripPackingItems).values(packingPayload).returning();
                        if (!inserted) throw new Error('tripUpsertDeep: tripPackingItem insert returned no rows');
                    }
                }
            }
        });

        const trip = await tripGet(tripId, requestingSession, serverRuntime);
        if (!trip) throw new Error(`tripUpsertDeep: could not re-read trip ${tripId}`);
        await serverRuntime.publish.userUpdates({ userId });
        return trip;
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
