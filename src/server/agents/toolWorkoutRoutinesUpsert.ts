import { tool } from 'ai';
import { z } from 'zod';
import { workoutRoutinesUpsert } from '../commands/workoutRoutinesUpsert';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { GqlSWorkoutRoutineInputSchema } from '../graphql/generated';
import type { GqlSSession, GqlSWorkoutRoutineInput } from '../graphql/generated';
import type { FitnessAgentMutationLog } from './agentPersonalAssistantFitness';
import { requireAdminUserId } from './requireAdminUserId';

// Batch create-or-edit of workout routines (the template header). Add the
// routine's exercises with `workoutRoutineItemsUpsert` using the returned
// `referenceIds` as the parent `routineId`.

const toolWorkoutRoutinesUpsertInputSchema = z.object({
    workoutRoutines: z.array(GqlSWorkoutRoutineInputSchema()).min(1),
});

interface FitnessAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: FitnessAgentMutationLog;
}

export function toolWorkoutRoutinesUpsert({ serverRuntime, session, mutations }: FitnessAgentMutationContext) {
    return tool({
        description: [
            'Batch create-or-edit of workout routines (reusable templates like "Push day"). This writes the routine',
            'header only — add its exercises with `workoutRoutineItemsUpsert` using the returned `referenceIds` as',
            'the parent `routineId`. Every row with a `routineId` is updated; every row without one is inserted.',
        ].join(' '),
        inputSchema: toolWorkoutRoutinesUpsertInputSchema,
        execute: async (rawInput) => {
            const inputs = rawInput.workoutRoutines as GqlSWorkoutRoutineInput[];
            const result = await workoutRoutinesUpsert(requireAdminUserId(session), inputs, session, serverRuntime);
            const referenceIds = result.referenceIds ?? [];
            inputs.forEach((routine, index) => {
                mutations.push({
                    kind: routine.routineId ? 'routineUpdate' : 'routineAdd',
                    id: referenceIds[index] ?? routine.routineId ?? '',
                    title: routine.name,
                });
            });
            return result;
        },
    });
}
