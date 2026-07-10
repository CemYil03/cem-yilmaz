import { tool } from 'ai';
import { z } from 'zod';
import { adminTravelTripsUpsert } from '../commands/adminTravelTripsUpsert';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { GqlSAdminTravelTripInputSchema } from '../graphql/generated';
import type { GqlSAdminTravelTripInput, GqlSSession } from '../graphql/generated';
import type { TravelAgentMutationLog } from './agentPersonalAssistantTravel';
import { requireAdminUserId } from './requireAdminUserId';

// Batch create-or-edit of trips. Each row is `GqlSTripInputSchema()` —
// same shape the resolver validates against. Gemini-safe because `TripInput`
// uses `Date` scalars (which the codegen emits as `z.string()`) and no
// `DateTime` fields.
const toolTripsUpsertInputSchema = z.object({
    trips: z.array(GqlSAdminTravelTripInputSchema()).min(1),
});

interface TravelAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: TravelAgentMutationLog;
}

export function toolTripsUpsert({ serverRuntime, session, mutations }: TravelAgentMutationContext) {
    return tool({
        description: [
            'Batch create-or-edit of trips — trip roots only (title, destination, dates, status, transport,',
            'accommodation, notes). Every row with a `tripId` is updated; every row without one is inserted.',
            'Pass a single-element array for a one-off edit; pass many for bulk work. Returns `referenceIds`',
            'in input order — the id of every row you touched, ready to use as parent ids when calling',
            '`tripDaysUpsert` / `tripPackingItemsUpsert` in the same turn.',
        ].join(' '),
        inputSchema: toolTripsUpsertInputSchema,
        execute: async (rawInput) => {
            const inputs = rawInput.trips as GqlSAdminTravelTripInput[];
            const result = await adminTravelTripsUpsert(requireAdminUserId(session), inputs, session, serverRuntime);
            const referenceIds = result.referenceIds ?? [];
            inputs.forEach((trip, index) => {
                mutations.push({
                    kind: trip.tripId ? 'tripUpdate' : 'tripAdd',
                    id: referenceIds[index] ?? trip.tripId ?? '',
                    title: trip.title,
                });
            });
            return result;
        },
    });
}
