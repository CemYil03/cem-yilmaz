import { tool } from 'ai';
import { z } from 'zod';
import { tripActivityDelete } from '../commands/tripActivityDelete';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import type { TravelAgentMutationLog } from './agentPersonalAssistantTravel';
import { requireAdminUserId } from './requireAdminUserId';

const tripActivityDeleteInputSchema = z.object({
    tripActivityId: z.uuid().describe('Activity row id to delete.'),
});

interface TravelAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: TravelAgentMutationLog;
}

export function toolTripActivityDelete({ serverRuntime, session, mutations }: TravelAgentMutationContext) {
    return tool({
        description: 'Delete one activity from a trip day.',
        inputSchema: tripActivityDeleteInputSchema,
        execute: async (input) => {
            const result = await tripActivityDelete(
                requireAdminUserId(session),
                { tripActivityId: input.tripActivityId },
                session,
                serverRuntime,
            );
            mutations.push({ kind: 'tripActivityDelete', id: input.tripActivityId });
            return result;
        },
    });
}
