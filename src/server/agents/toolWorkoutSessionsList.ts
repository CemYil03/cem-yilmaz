import { tool } from 'ai';
import { z } from 'zod';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import { adminFitnessSessionFindMany } from '../queries/adminFitnessSessionFindMany';

interface FitnessAgentReadContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
}

const workoutSessionsListInputSchema = z.object({});

export function toolWorkoutSessionsList({ serverRuntime, session }: FitnessAgentReadContext) {
    return tool({
        description: [
            'List gym sessions with their sets (exercise, weight, reps) newest first. Use when the snapshot is not',
            'enough — e.g. to read the full set-by-set history of a recent workout.',
        ].join(' '),
        inputSchema: workoutSessionsListInputSchema,
        execute: async () => {
            return adminFitnessSessionFindMany(session, serverRuntime);
        },
    });
}
