import { tool } from 'ai';
import { z } from 'zod';
import { adminFitnessWorkoutSetsUpsert } from '../commands/adminFitnessWorkoutSetsUpsert';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { GqlSAdminFitnessWorkoutSetInputSchema } from '../graphql/generated';
import type { GqlSSession, GqlSAdminFitnessWorkoutSetInput } from '../graphql/generated';
import type { FitnessAgentMutationLog } from './agentPersonalAssistantFitness';
import { requireAdminUserId } from './requireAdminUserId';

// Batch create-or-edit of logged sets. No `DateTime` fields, so the generated
// schema is Gemini-safe. Logging "5×5 squats at 100kg" is one call carrying
// five rows against the session id.

const toolWorkoutSetsUpsertInputSchema = z.object({
    workoutSets: z.array(GqlSAdminFitnessWorkoutSetInputSchema()).min(1),
});

interface FitnessAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: FitnessAgentMutationLog;
}

export function toolWorkoutSetsUpsert({ serverRuntime, session, mutations }: FitnessAgentMutationContext) {
    return tool({
        description: [
            'Batch create-or-edit of logged sets — `weight` × `reps` per set. Every row needs a parent `sessionId`',
            '(from the snapshot or a prior `workoutSessionsUpsert` result) and an `exerciseId`. Logging "5×5 squats',
            'at 100kg" is ONE call carrying five rows (same exercise, weight 100, reps 5). Set `isWarmup` for warmup',
            'sets so they do not count toward PRs. Every row with a `setId` is updated; every row without one is',
            'inserted.',
        ].join(' '),
        inputSchema: toolWorkoutSetsUpsertInputSchema,
        execute: async (rawInput) => {
            const inputs = rawInput.workoutSets as GqlSAdminFitnessWorkoutSetInput[];
            const result = await adminFitnessWorkoutSetsUpsert(requireAdminUserId(session), inputs, session, serverRuntime);
            const referenceIds = result.referenceIds ?? [];
            inputs.forEach((set, index) => {
                mutations.push({
                    kind: set.setId ? 'setUpdate' : 'setAdd',
                    id: referenceIds[index] ?? set.setId ?? '',
                });
            });
            return result;
        },
    });
}
