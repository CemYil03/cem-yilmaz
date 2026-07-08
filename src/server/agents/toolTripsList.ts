import { tool } from 'ai';
import { z } from 'zod';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import { tripList } from '../queries/tripList';

// Full-trip read tool. The system-prompt snapshot already lists every trip
// with days + activities + packing progress inline; use this only when the
// sub-agent needs the fully typed shape for downstream reasoning (e.g. to
// echo an activity's `notes` verbatim), which the snapshot deliberately
// trims.

const tripsListInputSchema = z.object({});

interface TravelAgentReadContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
}

export function toolTripsList({ serverRuntime, session }: TravelAgentReadContext) {
    return tool({
        description: [
            'List every trip with fully hydrated days, activities, and packing items. Use only when the snapshot',
            'in the system prompt is not enough — for example, when Cem asks for the exact notes on an activity.',
        ].join(' '),
        inputSchema: tripsListInputSchema,
        execute: async () => {
            return tripList(session, serverRuntime);
        },
    });
}
