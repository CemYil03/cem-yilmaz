import { tool } from 'ai';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { requireAdminUserId } from '../agents/requireAdminUserId';
import { tripPackingItems, trips } from '../db/schema';
import type { AdminTravelTripPackingItemCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { GqlSAdminTravelTripPackingItemInputSchema } from '../graphql/generated';
import type { GqlSAdminTravelTripPackingItemInput, GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Batch upsert of trip packing items. Every row with a `tripPackingItemId`
// is updated; every row without one is inserted. Parent-trip existence
// verified in one round-trip. `position` defaults to "one past the current
// max within `(tripId, category)`" — the tail is read once per bucket and
// then incremented locally so a same-bucket batch lays out its new items
// contiguously.
export async function adminTravelTripPackingItemsUpsert(
    userId: string,
    inputs: readonly GqlSAdminTravelTripPackingItemInput[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    const now = new Date();

    // Phase 1 — assign ids up front.
    const seeds = inputs.map((item) => ({
        tripPackingItemId: item.tripPackingItemId ?? crypto.randomUUID(),
        item,
        isUpdate: Boolean(item.tripPackingItemId),
    }));

    // Phase 2 — transactional execution.
    try {
        const parentTripIds = Array.from(new Set(seeds.map((seed) => seed.item.tripId)));
        const updateIds = seeds.filter((seed) => seed.isUpdate).map((seed) => seed.tripPackingItemId);

        await serverRuntime.db.transaction(async (transaction) => {
            const parents = await transaction.select({ tripId: trips.tripId }).from(trips).where(inArray(trips.tripId, parentTripIds));
            if (parents.length !== parentTripIds.length) {
                const found = new Set(parents.map((row) => row.tripId));
                const missing = parentTripIds.filter((id) => !found.has(id));
                throw new Error(`adminTravelTripPackingItemsUpsert: parent trips not found: ${missing.join(', ')}`);
            }
            if (updateIds.length > 0) {
                const existing = await transaction
                    .select({ tripPackingItemId: tripPackingItems.tripPackingItemId })
                    .from(tripPackingItems)
                    .where(inArray(tripPackingItems.tripPackingItemId, updateIds));
                if (existing.length !== updateIds.length) {
                    const found = new Set(existing.map((row) => row.tripPackingItemId));
                    const missing = updateIds.filter((id) => !found.has(id));
                    throw new Error(`adminTravelTripPackingItemsUpsert: rows not found: ${missing.join(', ')}`);
                }
            }

            const tailByBucket = new Map<string, number>();
            for (const { tripPackingItemId, item, isUpdate } of seeds) {
                let position = item.position ?? null;
                if (position === null && !isUpdate) {
                    const bucketKey = `${item.tripId}\u0000${item.category}`;
                    const cached = tailByBucket.get(bucketKey);
                    if (cached === undefined) {
                        const [top] = await transaction
                            .select({ position: tripPackingItems.position })
                            .from(tripPackingItems)
                            .where(and(eq(tripPackingItems.tripId, item.tripId), eq(tripPackingItems.category, item.category)))
                            .orderBy(desc(tripPackingItems.position))
                            .limit(1);
                        position = top ? top.position + 1 : 0;
                    } else {
                        position = cached + 1;
                    }
                    tailByBucket.set(bucketKey, position);
                }
                const payload: AdminTravelTripPackingItemCreate = {
                    tripPackingItemId,
                    tripId: item.tripId,
                    category: item.category,
                    label: item.label,
                    quantity: item.quantity ?? 1,
                    packed: item.packed ?? false,
                    position: position ?? 0,
                    notes: item.notes ?? null,
                    updatedAt: now,
                };
                if (isUpdate) {
                    await transaction
                        .update(tripPackingItems)
                        .set(payload)
                        .where(eq(tripPackingItems.tripPackingItemId, tripPackingItemId));
                } else {
                    await transaction.insert(tripPackingItems).values(payload);
                }
            }
        });
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: seeds.map((seed) => seed.tripPackingItemId) };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}

interface TravelAgentToolContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
}

export function toolTripPackingItemsUpsert({ serverRuntime, session }: TravelAgentToolContext) {
    return tool({
        description: [
            'Batch create-or-edit of packing-list items for a trip. Every row with a `tripPackingItemId` is',
            'updated; every row without one is inserted. Also the "mark X as packed / unpacked" surface — pass',
            'the existing row plus `packed: true|false` in a one-element array.',
        ].join(' '),
        inputSchema: z.object({
            tripPackingItems: z.array(GqlSAdminTravelTripPackingItemInputSchema()).min(1),
        }),
        execute: async (rawInput) => {
            const inputs = rawInput.tripPackingItems as GqlSAdminTravelTripPackingItemInput[];
            return adminTravelTripPackingItemsUpsert(requireAdminUserId(session), inputs, session, serverRuntime);
        },
    });
}
