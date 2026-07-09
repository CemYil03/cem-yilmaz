import { tool } from 'ai';
import { z } from 'zod';
import { tripActivitiesUpsert } from '../commands/tripActivitiesUpsert';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { GqlSTripActivityInputSchema } from '../graphql/generated';
import type { GqlSSession, GqlSTripActivityInput } from '../graphql/generated';
import type { TravelAgentMutationLog } from './agentPersonalAssistantTravel';
import { requireAdminUserId } from './requireAdminUserId';

const toolTripActivitiesUpsertInputSchema = z.object({
    tripActivities: z.array(GqlSTripActivityInputSchema()).min(1),
});

interface TravelAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: TravelAgentMutationLog;
}

export function toolTripActivitiesUpsert({ serverRuntime, session, mutations }: TravelAgentMutationContext) {
    return tool({
        description: [
            'Batch create-or-edit of activities across one or many trip days (bookings, sightseeing, meals,',
            'transfers …). Pass every activity of a plan in one call. Every row with a `tripActivityId` is',
            'updated; every row without one is inserted. Times are wall-clock strings `HH:MM` / `HH:MM:SS` in',
            'the local time at the destination — never a timezone offset.',
        ].join(' '),
        inputSchema: toolTripActivitiesUpsertInputSchema,
        execute: async (rawInput) => {
            const inputs = rawInput.tripActivities as GqlSTripActivityInput[];
            const result = await tripActivitiesUpsert(requireAdminUserId(session), inputs, session, serverRuntime);
            const referenceIds = result.referenceIds ?? [];
            inputs.forEach((activity, index) => {
                mutations.push({
                    kind: activity.tripActivityId ? 'tripActivityUpdate' : 'tripActivityAdd',
                    id: referenceIds[index] ?? activity.tripActivityId ?? '',
                    title: activity.title,
                });
            });
            return result;
        },
    });
}
