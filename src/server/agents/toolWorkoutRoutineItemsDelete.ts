import { tool } from 'ai';
import { z } from 'zod';
import { workoutRoutineItemsDelete } from '../commands/workoutRoutineItemsDelete';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import type { FitnessAgentMutationLog } from './agentPersonalAssistantFitness';
import { requireAdminUserId } from './requireAdminUserId';

const workoutRoutineItemsDeleteInputSchema = z.object({
    routineItemIds: z.array(z.uuid()).min(1).describe('Routine item ids to remove.'),
});

interface FitnessAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: FitnessAgentMutationLog;
}

export function toolWorkoutRoutineItemsDelete({ serverRuntime, session, mutations }: FitnessAgentMutationContext) {
    return tool({
        description: 'Remove one or more exercises from a routine. Use when Cem wants to drop an exercise from a template.',
        inputSchema: workoutRoutineItemsDeleteInputSchema,
        execute: async (input) => {
            const result = await workoutRoutineItemsDelete(requireAdminUserId(session), input.routineItemIds, session, serverRuntime);
            for (const routineItemId of input.routineItemIds) mutations.push({ kind: 'routineItemDelete', id: routineItemId });
            return result;
        },
    });
}
