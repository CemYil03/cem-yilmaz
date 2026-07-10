import { tool } from 'ai';
import { z } from 'zod';
import { adminTravelTripDaysUpsert } from '../commands/adminTravelTripDaysUpsert';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { GqlSAdminTravelTripDayInputSchema } from '../graphql/generated';
import type { GqlSAdminTravelTripDayInput, GqlSSession } from '../graphql/generated';
import type { TravelAgentMutationLog } from './agentPersonalAssistantTravel';
import { requireAdminUserId } from './requireAdminUserId';

const toolTripDaysUpsertInputSchema = z.object({
    tripDays: z.array(GqlSAdminTravelTripDayInputSchema()).min(1),
});

interface TravelAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: TravelAgentMutationLog;
}

export function toolTripDaysUpsert({ serverRuntime, session, mutations }: TravelAgentMutationContext) {
    return tool({
        description: [
            'Batch create-or-edit of trip days. Days are the buckets activities live under. Pass all the days',
            'of a plan in one call — `dayNumber` is 1-based and unique per trip. Every row with a `tripDayId`',
            'is updated; every row without one is inserted. Returns `referenceIds` in input order — use those',
            'as the parent `tripDayId` when calling `tripActivitiesUpsert` in the same turn.',
        ].join(' '),
        inputSchema: toolTripDaysUpsertInputSchema,
        execute: async (rawInput) => {
            const inputs = rawInput.tripDays as GqlSAdminTravelTripDayInput[];
            const result = await adminTravelTripDaysUpsert(requireAdminUserId(session), inputs, session, serverRuntime);
            const referenceIds = result.referenceIds ?? [];
            inputs.forEach((day, index) => {
                mutations.push({
                    kind: day.tripDayId ? 'tripDayUpdate' : 'tripDayAdd',
                    id: referenceIds[index] ?? day.tripDayId ?? '',
                    title: day.title ?? `Day ${day.dayNumber}`,
                });
            });
            return result;
        },
    });
}
