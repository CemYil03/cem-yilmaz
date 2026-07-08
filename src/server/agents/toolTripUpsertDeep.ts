import { tool } from 'ai';
import { z } from 'zod';
import { tripUpsertDeep } from '../commands/tripUpsertDeep';
import type { TripUpsertDeepInput } from '../commands/tripUpsertDeep';
import type { ServerRuntime } from '../domain/ServerRuntime';
import {
    GqlSTripActivityInputSchema,
    GqlSTripDayInputSchema,
    GqlSTripInputSchema,
    GqlSTripPackingItemInputSchema,
} from '../graphql/generated';
import type { GqlSSession } from '../graphql/generated';
import type { TravelAgentMutationLog } from './agentPersonalAssistantTravel';
import { requireAdminUserId } from './requireAdminUserId';

// One tool that plans a whole trip in a single call. Composed from the
// generated GraphQL input schemas — the same source of truth the resolvers
// validate against. Nested `days` drop their `tripId` (inferred from the
// outer trip) and each carries an inline `activities` list; each nested
// activity drops its `tripDayId` (inferred from its parent day). Same rule
// for `packingItems`, which drops `tripId`.
//
// Merge-only nested payload — omitting a day never deletes it. Use the
// explicit `removeDayIds` / `removeActivityIds` / `removePackingItemIds`
// arrays to remove existing rows in the same call.
//
// See `docs/features/workspace-travel.md#deep-command`.

const tripUpsertDeepInputSchema = z.object({
    trip: GqlSTripInputSchema(),
    days: z
        .array(
            GqlSTripDayInputSchema()
                .omit({ tripId: true })
                .extend({
                    activities: z
                        .array(GqlSTripActivityInputSchema().omit({ tripDayId: true }))
                        .nullish()
                        .describe('Activities on this day. Merge-only — omit an existing activity to leave it in place.'),
                }),
        )
        .nullish()
        .describe('Days to create or edit. Merge-only — omit an existing day to leave it in place.'),
    packingItems: z
        .array(GqlSTripPackingItemInputSchema().omit({ tripId: true }))
        .nullish()
        .describe('Packing items on this trip. Merge-only — omit an existing item to leave it in place.'),
    removeDayIds: z.array(z.uuid()).nullish().describe('Existing tripDay ids to delete. FK cascade removes activities on those days.'),
    removeActivityIds: z.array(z.uuid()).nullish().describe('Existing tripActivity ids to delete.'),
    removePackingItemIds: z.array(z.uuid()).nullish().describe('Existing tripPackingItem ids to delete.'),
});

interface TravelAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: TravelAgentMutationLog;
}

export function toolTripUpsertDeep({ serverRuntime, session, mutations }: TravelAgentMutationContext) {
    return tool({
        description: [
            'PREFERRED for whole-trip planning: create or edit a trip together with its days, activities, and packing items in one call.',
            'Merge-only nested payloads — omitting a day / activity / packing item does NOT delete it. Use the explicit',
            '`removeDayIds` / `removeActivityIds` / `removePackingItemIds` arrays to remove existing rows in the same call.',
            'Use this instead of chaining `tripUpsert` + several `tripDayUpsert` / `tripActivityUpsert` / `tripPackingItemUpsert` calls.',
        ].join(' '),
        inputSchema: tripUpsertDeepInputSchema,
        execute: async (rawInput) => {
            // The `as` cast is a workaround for the generated `Properties<T>`
            // phantom on the codegen'd `GqlS*InputSchema()` returns — `z.infer`
            // widens nullish fields to `unknown`. Runtime validation is
            // unaffected. See `toolTripUpsert.ts` for the full explainer.
            const input = rawInput as {
                trip: TripUpsertDeepInput['trip'];
                days?: TripUpsertDeepInput['days'];
                packingItems?: TripUpsertDeepInput['packingItems'];
                removeDayIds?: TripUpsertDeepInput['removeDayIds'];
                removeActivityIds?: TripUpsertDeepInput['removeActivityIds'];
                removePackingItemIds?: TripUpsertDeepInput['removePackingItemIds'];
            };
            const result = await tripUpsertDeep(
                requireAdminUserId(session),
                {
                    trip: input.trip,
                    days: input.days ?? null,
                    packingItems: input.packingItems ?? null,
                    removeDayIds: input.removeDayIds ?? null,
                    removeActivityIds: input.removeActivityIds ?? null,
                    removePackingItemIds: input.removePackingItemIds ?? null,
                },
                session,
                serverRuntime,
            );

            // Push one mutation-log entry per touched row so the
            // orchestrator's narration can name what changed. The kinds
            // reuse the existing granular vocabulary — no new
            // `TravelAgentMutationKind` values needed.
            mutations.push({
                kind: input.trip.tripId ? 'tripUpdate' : 'tripAdd',
                id: result.tripId,
                title: result.title,
            });
            for (const day of input.days ?? []) {
                const matched = result.days.find((d) => (day.tripDayId ? d.tripDayId === day.tripDayId : d.dayNumber === day.dayNumber));
                if (matched) {
                    mutations.push({
                        kind: day.tripDayId ? 'tripDayUpdate' : 'tripDayAdd',
                        id: matched.tripDayId,
                        title: matched.title ?? `Day ${matched.dayNumber}`,
                    });
                    for (const activity of day.activities ?? []) {
                        const matchedActivity = matched.activities.find((a) =>
                            activity.tripActivityId ? a.tripActivityId === activity.tripActivityId : a.title === activity.title,
                        );
                        if (matchedActivity) {
                            mutations.push({
                                kind: activity.tripActivityId ? 'tripActivityUpdate' : 'tripActivityAdd',
                                id: matchedActivity.tripActivityId,
                                title: matchedActivity.title,
                            });
                        }
                    }
                }
            }
            for (const item of input.packingItems ?? []) {
                const matched = result.packingItems.find((p) =>
                    item.tripPackingItemId
                        ? p.tripPackingItemId === item.tripPackingItemId
                        : p.label === item.label && p.category === item.category,
                );
                if (matched) {
                    mutations.push({
                        kind: item.tripPackingItemId ? 'tripPackingItemUpdate' : 'tripPackingItemAdd',
                        id: matched.tripPackingItemId,
                        title: matched.label,
                    });
                }
            }
            for (const removedId of input.removeDayIds ?? []) {
                mutations.push({ kind: 'tripDayDelete', id: removedId });
            }
            for (const removedId of input.removeActivityIds ?? []) {
                mutations.push({ kind: 'tripActivityDelete', id: removedId });
            }
            for (const removedId of input.removePackingItemIds ?? []) {
                mutations.push({ kind: 'tripPackingItemDelete', id: removedId });
            }

            return result;
        },
    });
}
