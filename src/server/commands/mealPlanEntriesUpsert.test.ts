import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { mealPlanEntries } from '../db/schema';
import type { GqlSMealPlanEntryInput, GqlSRecipeInput } from '../graphql/generated';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { mealPlanEntriesUpsert } from './mealPlanEntriesUpsert';
import { recipesUpsert } from './recipesUpsert';

const baseInput = (overrides: Partial<GqlSMealPlanEntryInput> = {}): GqlSMealPlanEntryInput => ({
    entryId: null,
    date: '2026-07-13',
    mealType: 'dinner',
    recipeId: null,
    customText: 'Leftovers',
    notes: null,
    ...overrides,
});

describe('mealPlanEntriesUpsert', () => {
    it('inserts a free-text slot when no entryId is supplied', async () => {
        const { serverRuntime, requestingSession } = await commandSetup();

        const result = await mealPlanEntriesUpsert(requestingSession.userId!, [baseInput()], requestingSession, serverRuntime);

        expect(result.success).toBe(true);
        expect(result.referenceIds).toHaveLength(1);
        const createdId = result.referenceIds![0]!;
        const rows = await testDb.select().from(mealPlanEntries).where(eq(mealPlanEntries.entryId, createdId));
        expect(rows).toHaveLength(1);
        expect(rows[0]!.customText).toBe('Leftovers');
        expect(rows[0]!.date).toBe('2026-07-13');
        expect(serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: requestingSession.userId });
    });

    it('links a slot to an existing recipe', async () => {
        const { serverRuntime, requestingSession } = await commandSetup();
        const recipeInput: GqlSRecipeInput = {
            recipeId: null,
            title: 'Chili',
            mealType: 'dinner',
            ingredients: [],
            steps: null,
            tags: [],
            isFavorite: null,
            rating: null,
            prepTimeMinutes: null,
            servings: null,
            sourceUrl: null,
            notes: null,
            lastMadeAt: null,
        };
        const seededRecipe = await recipesUpsert(requestingSession.userId!, [recipeInput], requestingSession, serverRuntime);
        const recipeId = seededRecipe.referenceIds![0]!;

        const result = await mealPlanEntriesUpsert(
            requestingSession.userId!,
            [baseInput({ recipeId, customText: null })],
            requestingSession,
            serverRuntime,
        );

        const rows = await testDb.select().from(mealPlanEntries).where(eq(mealPlanEntries.entryId, result.referenceIds![0]!));
        expect(rows[0]!.recipeId).toBe(recipeId);
    });

    it('throws when the referenced recipe does not exist', async () => {
        const { serverRuntime, requestingSession } = await commandSetup();
        const missingRecipeId = crypto.randomUUID();

        await expect(
            mealPlanEntriesUpsert(requestingSession.userId!, [baseInput({ recipeId: missingRecipeId })], requestingSession, serverRuntime),
        ).rejects.toThrow(/recipes not found/);
    });

    it('throws when updating a slot that does not exist', async () => {
        const { serverRuntime, requestingSession } = await commandSetup();
        const missingId = crypto.randomUUID();

        await expect(
            mealPlanEntriesUpsert(requestingSession.userId!, [baseInput({ entryId: missingId })], requestingSession, serverRuntime),
        ).rejects.toThrow(/not found/);
    });
});
