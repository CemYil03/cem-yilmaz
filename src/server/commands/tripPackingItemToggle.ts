import { eq } from 'drizzle-orm';
import { tripPackingItems } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession, GqlSTripPackingItem } from '../graphql/generated';
import { toGqlTripPackingItem } from '../mappers/toGqlTripPackingItem';

// Flip `packed` on a packing item. Used by the checkbox in the UI and by
// the agent when the user says "mark X as packed" — the shortcut avoids
// sending a whole `TripPackingItemInput` for a one-bit change.
export interface TripPackingItemToggleInput {
    tripPackingItemId: string;
}

export async function tripPackingItemToggle(
    userId: string,
    input: TripPackingItemToggleInput,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSTripPackingItem> {
    const now = new Date();
    try {
        const [existing] = await serverRuntime.db
            .select()
            .from(tripPackingItems)
            .where(eq(tripPackingItems.tripPackingItemId, input.tripPackingItemId))
            .limit(1);
        if (!existing) throw new Error(`tripPackingItemToggle: row ${input.tripPackingItemId} not found`);

        const [updated] = await serverRuntime.db
            .update(tripPackingItems)
            .set({ packed: !existing.packed, updatedAt: now })
            .where(eq(tripPackingItems.tripPackingItemId, input.tripPackingItemId))
            .returning();
        if (!updated) throw new Error(`tripPackingItemToggle: update returned no rows`);

        await serverRuntime.publish.userUpdates({ userId });
        return toGqlTripPackingItem(updated);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
