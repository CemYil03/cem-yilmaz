import { tool } from 'ai';
import { z } from 'zod';
import { exercisesUpsert } from '../commands/exercisesUpsert';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { GqlSExerciseInputSchema } from '../graphql/generated';
import type { GqlSExerciseInput, GqlSSession } from '../graphql/generated';
import type { FitnessAgentMutationLog } from './agentPersonalAssistantFitness';
import { requireAdminUserId } from './requireAdminUserId';

// Batch create-or-edit of catalog exercises. Reuses the generated input schema
// (no `DateTime` fields, so Gemini-safe).

const toolExercisesUpsertInputSchema = z.object({
    exercises: z.array(GqlSExerciseInputSchema()).min(1),
});

interface FitnessAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: FitnessAgentMutationLog;
}

export function toolExercisesUpsert({ serverRuntime, session, mutations }: FitnessAgentMutationContext) {
    return tool({
        description: [
            'Batch create-or-edit of catalog exercises (name + muscle group + equipment). Add an exercise here',
            'before logging sets against it if it does not exist yet. Every row with an `exerciseId` is updated;',
            'every row without one is inserted. Returns `referenceIds` in input order.',
        ].join(' '),
        inputSchema: toolExercisesUpsertInputSchema,
        execute: async (rawInput) => {
            const inputs = rawInput.exercises as GqlSExerciseInput[];
            const result = await exercisesUpsert(requireAdminUserId(session), inputs, session, serverRuntime);
            const referenceIds = result.referenceIds ?? [];
            inputs.forEach((exercise, index) => {
                mutations.push({
                    kind: exercise.exerciseId ? 'exerciseUpdate' : 'exerciseAdd',
                    id: referenceIds[index] ?? exercise.exerciseId ?? '',
                    title: exercise.name,
                });
            });
            return result;
        },
    });
}
