import { tool } from 'ai';
import { z } from 'zod';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import { adminTravelTripFindOne } from '../queries/adminTravelTripFindOne';

const tripGetInputSchema = z.object({
    tripId: z.uuid().describe('The trip id to fetch. Get this from the snapshot or from a prior tool result.'),
});

interface TravelAgentReadContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
}

export function toolTripGet({ serverRuntime, session }: TravelAgentReadContext) {
    return tool({
        description:
            'Fetch one trip by id, fully hydrated (days, activities, packing). Prefer the snapshot when the trip already appears there.',
        inputSchema: tripGetInputSchema,
        execute: async (input) => {
            return adminTravelTripFindOne(input.tripId, session, serverRuntime);
        },
    });
}
