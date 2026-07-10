import { tool } from 'ai';
import { z } from 'zod';
import { workoutSetsDelete } from '../commands/workoutSetsDelete';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import type { FitnessAgentMutationLog } from './agentPersonalAssistantFitness';
import { requireAdminUserId } from './requireAdminUserId';

const workoutSetsDeleteInputSchema = z.object({
    setIds: z.array(z.uuid()).min(1).describe('Logged set ids to delete.'),
});

interface FitnessAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: FitnessAgentMutationLog;
}

export function toolWorkoutSetsDelete({ serverRuntime, session, mutations }: FitnessAgentMutationContext) {
    return tool({
        description: 'Delete one or more logged sets. Use when Cem wants to remove a set he logged.',
        inputSchema: workoutSetsDeleteInputSchema,
        execute: async (input) => {
            const result = await workoutSetsDelete(requireAdminUserId(session), input.setIds, session, serverRuntime);
            for (const setId of input.setIds) mutations.push({ kind: 'setDelete', id: setId });
            return result;
        },
    });
}
