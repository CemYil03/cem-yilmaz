import { tool } from 'ai';
import { z } from 'zod';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import { adminFitnessExerciseFindMany } from '../queries/adminFitnessExerciseFindMany';

interface FitnessAgentReadContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
}

const exercisesListInputSchema = z.object({});

export function toolExercisesList({ serverRuntime, session }: FitnessAgentReadContext) {
    return tool({
        description:
            'List the exercise catalog. Use when the system-prompt snapshot is not enough — e.g. to confirm an exercise exists before logging a set.',
        inputSchema: exercisesListInputSchema,
        execute: async () => {
            return adminFitnessExerciseFindMany(session, serverRuntime);
        },
    });
}
