import { tool } from 'ai';
import { z } from 'zod';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import { adminNutritionMealPlanFindMany } from '../queries/adminNutritionMealPlanFindMany';

// Meal-plan read tool. The snapshot lists upcoming slots inline; use this when
// the agent needs every plan slot with its referenced recipe hydrated.

interface NutritionAgentReadContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
}

const mealPlanListInputSchema = z.object({});

export function toolMealPlanList({ serverRuntime, session }: NutritionAgentReadContext) {
    return tool({
        description: 'List every soft-plan slot (date + meal type + recipe or free-text idea). Use when the snapshot is not enough.',
        inputSchema: mealPlanListInputSchema,
        execute: async () => {
            return adminNutritionMealPlanFindMany(session, serverRuntime);
        },
    });
}
