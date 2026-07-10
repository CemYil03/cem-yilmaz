import { tool } from 'ai';
import { z } from 'zod';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import { adminFitnessRoutineFindMany } from '../queries/adminFitnessRoutineFindMany';

interface FitnessAgentReadContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
}

const routinesListInputSchema = z.object({});

export function toolRoutinesList({ serverRuntime, session }: FitnessAgentReadContext) {
    return tool({
        description: 'List workout routines with their items (exercise + target sets/reps/weight). Use when the snapshot is not enough.',
        inputSchema: routinesListInputSchema,
        execute: async () => {
            return adminFitnessRoutineFindMany(session, serverRuntime);
        },
    });
}
