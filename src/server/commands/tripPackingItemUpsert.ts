import { and, desc, eq } from 'drizzle-orm';
import { tripPackingItems, trips } from '../db/schema';
import type { TripPackingItemCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession, GqlSTripPackingItem, GqlSTripPackingItemInput } from '../graphql/generated';
import { toGqlTripPackingItem } from '../mappers/toGqlTripPackingItem';

// Upsert a packing item. Verifies the parent trip exists. `position`
// defaults to "one past the current max within `(tripId, category)`" so a
// new item lands at the end of its category bucket.
export async function tripPackingItemUpsert(
    userId: string,
    input: GqlSTripPackingItemInput,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSTripPackingItem> {
    const tripPackingItemId = input.tripPackingItemId ?? crypto.randomUUID();
    const now = new Date();

    try {
        const [parent] = await serverRuntime.db.select({ tripId: trips.tripId }).from(trips).where(eq(trips.tripId, input.tripId)).limit(1);
        if (!parent) throw new Error(`tripPackingItemUpsert: trip ${input.tripId} not found`);

        let position = input.position ?? null;
        if (position === null && !input.tripPackingItemId) {
            const [top] = await serverRuntime.db
                .select({ position: tripPackingItems.position })
                .from(tripPackingItems)
                .where(and(eq(tripPackingItems.tripId, input.tripId), eq(tripPackingItems.category, input.category)))
                .orderBy(desc(tripPackingItems.position))
                .limit(1);
            position = top ? top.position + 1 : 0;
        }

        const payload: TripPackingItemCreate = {
            tripPackingItemId,
            tripId: input.tripId,
            category: input.category,
            label: input.label,
            quantity: input.quantity ?? 1,
            packed: input.packed ?? false,
            position: position ?? 0,
            notes: input.notes ?? null,
            updatedAt: now,
        };

        let row;
        if (input.tripPackingItemId) {
            const [updated] = await serverRuntime.db
                .update(tripPackingItems)
                .set(payload)
                .where(eq(tripPackingItems.tripPackingItemId, input.tripPackingItemId))
                .returning();
            if (!updated) throw new Error(`tripPackingItemUpsert: row ${input.tripPackingItemId} not found`);
            row = updated;
        } else {
            const [inserted] = await serverRuntime.db.insert(tripPackingItems).values(payload).returning();
            if (!inserted) throw new Error('tripPackingItemUpsert: insert returned no rows');
            row = inserted;
        }

        await serverRuntime.publish.userUpdates({ userId });
        return toGqlTripPackingItem(row);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
