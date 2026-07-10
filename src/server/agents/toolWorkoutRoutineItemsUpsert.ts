import { tool } from 'ai';
import { z } from 'zod';
import { adminFitnessWorkoutRoutineItemsUpsert } from '../commands/adminFitnessWorkoutRoutineItemsUpsert';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { GqlSAdminFitnessWorkoutRoutineItemInputSchema } from '../graphql/generated';
import type { GqlSSession, GqlSAdminFitnessWorkoutRoutineItemInput } from '../graphql/generated';
import type { FitnessAgentMutationLog } from './agentPersonalAssistantFitness';
import { requireAdminUserId } from './requireAdminUserId';

// Batch create-or-edit of routine items (one exercise + optional targets per
// row). Every row needs a parent `routineId` and an `exerciseId`.

const toolWorkoutRoutineItemsUpsertInputSchema = z.object({
    workoutRoutineItems: z.array(GqlSAdminFitnessWorkoutRoutineItemInputSchema()).min(1),
});

interface FitnessAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: FitnessAgentMutationLog;
}

export function toolWorkoutRoutineItemsUpsert({ serverRuntime, session, mutations }: FitnessAgentMutationContext) {
    return tool({
        description: [
            'Batch create-or-edit of routine items — the exercises inside a routine, each with optional target sets,',
            'reps, and weight. Every row needs a parent `routineId` (from the snapshot or a prior',
            '`workoutRoutinesUpsert` result) and an `exerciseId`. Batch all of a routine’s exercises into one call.',
            'Every row with a `routineItemId` is updated; every row without one is inserted.',
        ].join(' '),
        inputSchema: toolWorkoutRoutineItemsUpsertInputSchema,
        execute: async (rawInput) => {
            const inputs = rawInput.workoutRoutineItems as GqlSAdminFitnessWorkoutRoutineItemInput[];
            const result = await adminFitnessWorkoutRoutineItemsUpsert(requireAdminUserId(session), inputs, session, serverRuntime);
            const referenceIds = result.referenceIds ?? [];
            inputs.forEach((item, index) => {
                mutations.push({
                    kind: item.routineItemId ? 'routineItemUpdate' : 'routineItemAdd',
                    id: referenceIds[index] ?? item.routineItemId ?? '',
                });
            });
            return result;
        },
    });
}
