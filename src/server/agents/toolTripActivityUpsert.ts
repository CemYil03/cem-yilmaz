import { tool } from 'ai';
import { z } from 'zod';
import { tripActivityUpsert } from '../commands/tripActivityUpsert';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import type { TravelAgentMutationLog } from './agentPersonalAssistantTravel';
import { requireAdminUserId } from './requireAdminUserId';

const tripActivityUpsertInputSchema = z.object({
    tripActivityId: z.uuid().nullish().describe('Omit to create. Pass an existing id to edit.'),
    tripDayId: z.uuid().describe('Day this activity belongs to.'),
    position: z.number().int().min(0).nullish().describe('Order within the day. Omit to append at the end.'),
    startsAt: z
        .string()
        .regex(/^\d{2}:\d{2}(:\d{2})?$/)
        .nullish()
        .describe('Wall-clock start time `HH:MM` or `HH:MM:SS`. Optional.'),
    endsAt: z
        .string()
        .regex(/^\d{2}:\d{2}(:\d{2})?$/)
        .nullish()
        .describe('Wall-clock end time `HH:MM` or `HH:MM:SS`. Optional.'),
    title: z.string().min(1).max(300).describe('What the activity is (e.g. "Colosseum tour").'),
    location: z.string().max(300).nullish(),
    url: z.string().max(2000).nullish().describe('Booking, map, or reference URL.'),
    notes: z.string().max(4000).nullish(),
});

interface TravelAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: TravelAgentMutationLog;
}

export function toolTripActivityUpsert({ serverRuntime, session, mutations }: TravelAgentMutationContext) {
    return tool({
        description: 'Create or edit one activity on a trip day (booking, sightseeing, meal, transfer …).',
        inputSchema: tripActivityUpsertInputSchema,
        execute: async (input) => {
            const result = await tripActivityUpsert(
                requireAdminUserId(session),
                {
                    input: {
                        tripActivityId: input.tripActivityId ?? null,
                        tripDayId: input.tripDayId,
                        position: input.position ?? null,
                        startsAt: input.startsAt ?? null,
                        endsAt: input.endsAt ?? null,
                        title: input.title,
                        location: input.location ?? null,
                        url: input.url ?? null,
                        notes: input.notes ?? null,
                    },
                },
                session,
                serverRuntime,
            );
            mutations.push({
                kind: input.tripActivityId ? 'tripActivityUpdate' : 'tripActivityAdd',
                id: result.tripActivityId,
                title: result.title,
            });
            return result;
        },
    });
}
