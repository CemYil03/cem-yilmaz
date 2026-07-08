import { tool } from 'ai';
import { z } from 'zod';
import { tripUpsert } from '../commands/tripUpsert';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { GqlSTransportModeSchema, GqlSTripStatusSchema } from '../graphql/generated';
import type { GqlSSession } from '../graphql/generated';
import type { TravelAgentMutationLog } from './agentPersonalAssistantTravel';
import { requireAdminUserId } from './requireAdminUserId';

// Direct create-or-edit of a trip. Hand-built input schema (see the
// `toolProjectUpsert` note in `docs/architecture/agent-delegation.md`):
// ISO strings ride the wire and `execute` converts, since Gemini rejects
// `z.date()` under `structuredOutputs: true`.

const tripUpsertInputSchema = z.object({
    tripId: z.uuid().nullish().describe('Omit (or null) to create a new trip. Pass an existing id to edit.'),
    title: z.string().min(1).max(200).describe('Short label, e.g. "Rome long weekend".'),
    destination: z.string().min(1).max(200).describe('Where the trip goes to — city, country, region.'),
    startsOn: z.string().nullish().describe('Departure date `YYYY-MM-DD`. Optional for drafts.'),
    endsOn: z.string().nullish().describe('Return date `YYYY-MM-DD`. Optional for drafts.'),
    status: GqlSTripStatusSchema.describe('draft | planned | active | completed | cancelled'),
    transportMode: GqlSTransportModeSchema.nullish().describe('flight | train | car | ferry | mixed'),
    accommodation: z.string().max(1000).nullish(),
    notes: z.string().max(4000).nullish(),
});

interface TravelAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: TravelAgentMutationLog;
}

export function toolTripUpsert({ serverRuntime, session, mutations }: TravelAgentMutationContext) {
    return tool({
        description: 'Create a new trip or edit an existing one. Set `tripId` to edit; omit it to create.',
        inputSchema: tripUpsertInputSchema,
        execute: async (input) => {
            const result = await tripUpsert(
                requireAdminUserId(session),
                {
                    input: {
                        tripId: input.tripId ?? null,
                        title: input.title,
                        destination: input.destination,
                        startsOn: input.startsOn ?? null,
                        endsOn: input.endsOn ?? null,
                        status: input.status,
                        transportMode: input.transportMode ?? null,
                        accommodation: input.accommodation ?? null,
                        notes: input.notes ?? null,
                    },
                },
                session,
                serverRuntime,
            );
            mutations.push({
                kind: input.tripId ? 'tripUpdate' : 'tripAdd',
                id: result.tripId,
                title: result.title,
            });
            return result;
        },
    });
}
