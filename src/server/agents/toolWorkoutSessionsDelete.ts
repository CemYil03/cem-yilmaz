import { tool } from 'ai';
import { z } from 'zod';
import { adminFitnessWorkoutSessionsDelete } from '../commands/adminFitnessWorkoutSessionsDelete';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import type { FitnessAgentMutationLog } from './agentPersonalAssistantFitness';
import { requireAdminUserId } from './requireAdminUserId';

const workoutSessionsDeleteInputSchema = z.object({
    sessionIds: z.array(z.uuid()).min(1).describe('Session ids to delete. FK cascade removes their sets.'),
});

interface FitnessAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: FitnessAgentMutationLog;
}

export function toolWorkoutSessionsDelete({ serverRuntime, session, mutations }: FitnessAgentMutationContext) {
    return tool({
        description: 'Delete one or more gym sessions and all their sets. Use only when Cem explicitly says to delete.',
        inputSchema: workoutSessionsDeleteInputSchema,
        execute: async (input) => {
            const result = await adminFitnessWorkoutSessionsDelete(requireAdminUserId(session), input.sessionIds, session, serverRuntime);
            for (const sessionId of input.sessionIds) mutations.push({ kind: 'sessionDelete', id: sessionId });
            return result;
        },
    });
}
