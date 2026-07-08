import { tool } from 'ai';
import { z } from 'zod';
import { tripDayDelete } from '../commands/tripDayDelete';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import type { TravelAgentMutationLog } from './agentPersonalAssistantTravel';
import { requireAdminUserId } from './requireAdminUserId';

const tripDayDeleteInputSchema = z.object({
    tripDayId: z.uuid().describe('Day row id to delete. Cascade removes the activities on that day.'),
});

interface TravelAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: TravelAgentMutationLog;
}

export function toolTripDayDelete({ serverRuntime, session, mutations }: TravelAgentMutationContext) {
    return tool({
        description: 'Delete one day of a trip. Activities on that day cascade.',
        inputSchema: tripDayDeleteInputSchema,
        execute: async (input) => {
            const result = await tripDayDelete(requireAdminUserId(session), { tripDayId: input.tripDayId }, session, serverRuntime);
            mutations.push({ kind: 'tripDayDelete', id: input.tripDayId });
            return result;
        },
    });
}
