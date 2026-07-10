import { tool } from 'ai';
import { z } from 'zod';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import { adminNutritionFoodLogFindMany } from '../queries/adminNutritionFoodLogFindMany';

// Diary read tool. The snapshot lists the last 15 entries; use this when the
// agent needs the full history (e.g. "how many coffees this week?").

interface NutritionAgentReadContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
}

const foodLogListInputSchema = z.object({});

export function toolFoodLogList({ serverRuntime, session }: NutritionAgentReadContext) {
    return tool({
        description: 'List every food/drink diary entry, newest first. Use when the recent-diary snapshot is not enough.',
        inputSchema: foodLogListInputSchema,
        execute: async () => {
            return adminNutritionFoodLogFindMany(session, serverRuntime);
        },
    });
}
