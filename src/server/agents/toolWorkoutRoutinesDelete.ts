import { tool } from 'ai';
import { z } from 'zod';
import { adminFitnessWorkoutRoutinesDelete } from '../commands/adminFitnessWorkoutRoutinesDelete';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import type { FitnessAgentMutationLog } from './agentPersonalAssistantFitness';
import { requireAdminUserId } from './requireAdminUserId';

const workoutRoutinesDeleteInputSchema = z.object({
    routineIds: z
        .array(z.uuid())
        .min(1)
        .describe('Routine ids to delete. FK cascade removes their items; logged sessions survive (routineId nulled).'),
});

interface FitnessAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: FitnessAgentMutationLog;
}

export function toolWorkoutRoutinesDelete({ serverRuntime, session, mutations }: FitnessAgentMutationContext) {
    return tool({
        description: 'Delete one or more routines and their items. Logged workouts are kept. Use only when Cem explicitly says to delete.',
        inputSchema: workoutRoutinesDeleteInputSchema,
        execute: async (input) => {
            const result = await adminFitnessWorkoutRoutinesDelete(requireAdminUserId(session), input.routineIds, session, serverRuntime);
            for (const routineId of input.routineIds) mutations.push({ kind: 'routineDelete', id: routineId });
            return result;
        },
    });
}
