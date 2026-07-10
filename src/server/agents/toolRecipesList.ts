import { tool } from 'ai';
import { z } from 'zod';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import { adminNutritionRecipeFindMany } from '../queries/adminNutritionRecipeFindMany';

// Cookbook read tool. The system-prompt snapshot already lists every recipe
// with ids inline; use this only when the snapshot is trimmed too far — e.g.
// to read a recipe's full ingredient list or steps before suggesting it.

interface NutritionAgentReadContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
}

const recipesListInputSchema = z.object({
    mealType: z
        .enum(['breakfast', 'lunch', 'dinner', 'snack', 'other'])
        .nullish()
        .describe('Optional: narrow to one meal type (e.g. `snack` for a snack idea).'),
    favorite: z.boolean().nullish().describe('Optional: only starred recipes.'),
});

export function toolRecipesList({ serverRuntime, session }: NutritionAgentReadContext) {
    return tool({
        description: [
            'List cookbook recipes with full ingredients, steps, tags, rating and last-made date. Optional filters:',
            '`mealType` and `favorite`. Use when the system-prompt snapshot is not detailed enough — for example to',
            'read the exact ingredients of a dish before recommending it.',
        ].join(' '),
        inputSchema: recipesListInputSchema,
        execute: async (input) => {
            return adminNutritionRecipeFindMany(
                { mealType: input.mealType ?? null, favorite: input.favorite ?? null },
                session,
                serverRuntime,
            );
        },
    });
}
