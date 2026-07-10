import { tool } from 'ai';
import { z } from 'zod';
import { recipesUpsert } from '../commands/recipesUpsert';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { GqlSMealTypeSchema } from '../graphql/generated';
import type { GqlSRecipeInput, GqlSSession } from '../graphql/generated';
import type { NutritionAgentMutationLog } from './agentPersonalAssistantNutrition';
import { requireAdminUserId } from './requireAdminUserId';

// Batch create-or-edit of cookbook recipes. Hand-built item schema — same
// rationale as `toolMoviesUpsert.ts`: Gemini's structured output rejects
// `z.date()`, so `lastMadeAt` rides the wire as an ISO string and `execute`
// converts with `new Date(...)`. The `MealType` enum schema is reused so a
// future enum addition surfaces as a TS error here.

const recipeItemSchema = z.object({
    recipeId: z.uuid().nullish().describe('Omit (or null) to create a new recipe. Pass an existing id to edit.'),
    title: z.string().min(1).max(300).describe('Dish name.'),
    mealType: GqlSMealTypeSchema.describe('breakfast | lunch | dinner | snack | other'),
    ingredients: z.array(z.string()).describe('Ingredient list. Empty array if none.'),
    steps: z.string().max(8000).nullish().describe('Preparation steps, free text.'),
    tags: z.array(z.string()).describe('Free-form tags (e.g. high-protein, quick, vegetarian). Empty array if none.'),
    isFavorite: z.boolean().nullish().describe('Star the recipe. Favourites rank first in snack suggestions.'),
    rating: z.number().int().min(1).max(10).nullish().describe("Cem's rating out of 10."),
    prepTimeMinutes: z.number().int().min(0).max(1440).nullish(),
    servings: z.number().int().min(0).max(100).nullish(),
    sourceUrl: z.string().max(2000).nullish(),
    notes: z.string().max(4000).nullish(),
    lastMadeAt: z.string().nullish().describe('ISO-8601 timestamp Cem last cooked this. Set it when he says he made a dish.'),
});

const toolRecipesUpsertInputSchema = z.object({
    recipes: z.array(recipeItemSchema).min(1).describe('One or more recipes to create or edit. One-element array for a single edit.'),
});

interface NutritionAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: NutritionAgentMutationLog;
}

export function toolRecipesUpsert({ serverRuntime, session, mutations }: NutritionAgentMutationContext) {
    return tool({
        description: [
            'Batch create-or-edit of cookbook recipes. Use to add a favourite dish, edit one, star it as a',
            'favourite, or stamp `lastMadeAt` when Cem says he cooked it. Every row with a `recipeId` is updated;',
            'every row without one is inserted. Batch same-shape writes into one call. Returns `referenceIds` in',
            'input order.',
        ].join(' '),
        inputSchema: toolRecipesUpsertInputSchema,
        execute: async (input) => {
            const inputs: GqlSRecipeInput[] = input.recipes.map((recipe) => ({
                recipeId: recipe.recipeId ?? null,
                title: recipe.title,
                mealType: recipe.mealType,
                ingredients: recipe.ingredients,
                steps: recipe.steps ?? null,
                tags: recipe.tags,
                isFavorite: recipe.isFavorite ?? null,
                rating: recipe.rating ?? null,
                prepTimeMinutes: recipe.prepTimeMinutes ?? null,
                servings: recipe.servings ?? null,
                sourceUrl: recipe.sourceUrl ?? null,
                notes: recipe.notes ?? null,
                lastMadeAt: recipe.lastMadeAt ? new Date(recipe.lastMadeAt) : null,
            }));
            const result = await recipesUpsert(requireAdminUserId(session), inputs, session, serverRuntime);
            const referenceIds = result.referenceIds ?? [];
            input.recipes.forEach((recipe, index) => {
                mutations.push({
                    kind: recipe.recipeId ? 'recipeUpdate' : 'recipeAdd',
                    id: referenceIds[index] ?? recipe.recipeId ?? '',
                    title: recipe.title,
                });
            });
            return result;
        },
    });
}
