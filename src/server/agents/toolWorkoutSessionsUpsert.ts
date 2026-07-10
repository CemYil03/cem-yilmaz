import { tool } from 'ai';
import { z } from 'zod';
import { workoutSessionsUpsert } from '../commands/workoutSessionsUpsert';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { GqlSWorkoutSessionInputSchema } from '../graphql/generated';
import type { GqlSSession, GqlSWorkoutSessionInput } from '../graphql/generated';
import type { FitnessAgentMutationLog } from './agentPersonalAssistantFitness';
import { requireAdminUserId } from './requireAdminUserId';

// Batch create-or-edit of gym sessions (the workout header). `date` is a
// `Date` scalar (`YYYY-MM-DD`), so the generated schema is Gemini-safe. Add
// the sets with `workoutSetsUpsert` using the returned `referenceIds` as the
// parent `sessionId`.

const toolWorkoutSessionsUpsertInputSchema = z.object({
    workoutSessions: z.array(GqlSWorkoutSessionInputSchema()).min(1),
});

interface FitnessAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: FitnessAgentMutationLog;
}

export function toolWorkoutSessionsUpsert({ serverRuntime, session, mutations }: FitnessAgentMutationContext) {
    return tool({
        description: [
            'Batch create-or-edit of gym sessions (the workout header: date, title, duration). Logging a workout is',
            'this call (one session) followed by `workoutSetsUpsert` (every set) using the returned `referenceIds`',
            'as the parent `sessionId`. `date` is `YYYY-MM-DD` — use today unless Cem says otherwise. Every row with',
            'a `sessionId` is updated; every row without one is inserted.',
        ].join(' '),
        inputSchema: toolWorkoutSessionsUpsertInputSchema,
        execute: async (rawInput) => {
            const inputs = rawInput.workoutSessions as GqlSWorkoutSessionInput[];
            const result = await workoutSessionsUpsert(requireAdminUserId(session), inputs, session, serverRuntime);
            const referenceIds = result.referenceIds ?? [];
            inputs.forEach((workout, index) => {
                mutations.push({
                    kind: workout.sessionId ? 'sessionUpdate' : 'sessionAdd',
                    id: referenceIds[index] ?? workout.sessionId ?? '',
                    title: workout.title ?? workout.date,
                });
            });
            return result;
        },
    });
}
