import { tool } from 'ai';
import { z } from 'zod';
import { exercisesDelete } from '../commands/exercisesDelete';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import type { FitnessAgentMutationLog } from './agentPersonalAssistantFitness';
import { requireAdminUserId } from './requireAdminUserId';

const exercisesDeleteInputSchema = z.object({
    exerciseIds: z
        .array(z.uuid())
        .min(1)
        .describe('Exercise ids to delete. FK cascade also removes every logged set and routine item using them.'),
});

interface FitnessAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: FitnessAgentMutationLog;
}

export function toolExercisesDelete({ serverRuntime, session, mutations }: FitnessAgentMutationContext) {
    return tool({
        description:
            'Permanently delete exercises and every logged set / routine item that uses them. Use only when Cem explicitly says to delete.',
        inputSchema: exercisesDeleteInputSchema,
        execute: async (input) => {
            const result = await exercisesDelete(requireAdminUserId(session), input.exerciseIds, session, serverRuntime);
            for (const exerciseId of input.exerciseIds) mutations.push({ kind: 'exerciseDelete', id: exerciseId });
            return result;
        },
    });
}
