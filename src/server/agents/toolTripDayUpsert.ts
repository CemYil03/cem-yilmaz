import { tool } from 'ai';
import { z } from 'zod';
import { tripDayUpsert } from '../commands/tripDayUpsert';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import type { TravelAgentMutationLog } from './agentPersonalAssistantTravel';
import { requireAdminUserId } from './requireAdminUserId';

const tripDayUpsertInputSchema = z.object({
    tripDayId: z.uuid().nullish().describe('Omit to create a new day. Pass an existing id to edit.'),
    tripId: z.uuid().describe('Trip this day belongs to.'),
    dayNumber: z.number().int().min(1).max(365).describe('1-based day ordinal. Unique per trip.'),
    date: z.string().nullish().describe('Calendar date `YYYY-MM-DD`. Optional when the trip has no fixed dates yet.'),
    title: z.string().max(200).nullish().describe('Short label for the day (e.g. "Vatican + Trastevere").'),
    summary: z.string().max(4000).nullish().describe('Longer paragraph describing what the day is about.'),
});

interface TravelAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: TravelAgentMutationLog;
}

export function toolTripDayUpsert({ serverRuntime, session, mutations }: TravelAgentMutationContext) {
    return tool({
        description: 'Create or edit one day within a trip. Days are the buckets activities live under.',
        inputSchema: tripDayUpsertInputSchema,
        execute: async (input) => {
            const result = await tripDayUpsert(
                requireAdminUserId(session),
                {
                    input: {
                        tripDayId: input.tripDayId ?? null,
                        tripId: input.tripId,
                        dayNumber: input.dayNumber,
                        date: input.date ?? null,
                        title: input.title ?? null,
                        summary: input.summary ?? null,
                    },
                },
                session,
                serverRuntime,
            );
            mutations.push({
                kind: input.tripDayId ? 'tripDayUpdate' : 'tripDayAdd',
                id: result.tripDayId,
                title: result.title ?? `Day ${result.dayNumber}`,
            });
            return result;
        },
    });
}
