import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { supplementNutrients, supplements } from '../db/schema';
import type { GqlSAdminNutritionSupplementInput, GqlSAdminNutritionSupplementNutrientInput } from '../graphql/generated';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { adminNutritionSupplementNutrientsReplace } from './adminNutritionSupplementNutrientsReplace';
import { adminNutritionSupplementsDelete } from './adminNutritionSupplementsDelete';
import { adminNutritionSupplementsUpsert } from './adminNutritionSupplementsUpsert';

const baseInput = (overrides: Partial<GqlSAdminNutritionSupplementInput> = {}): GqlSAdminNutritionSupplementInput => ({
    supplementId: null,
    name: 'Creatine Monohydrate',
    brand: 'MyProtein',
    servingSize: '1 scoop (5 g)',
    servingsPerContainer: 100,
    sourceUrl: null,
    notes: null,
    researchedAt: null,
    ...overrides,
});

const nutrient = (overrides: Partial<GqlSAdminNutritionSupplementNutrientInput> = {}): GqlSAdminNutritionSupplementNutrientInput => ({
    name: 'Creatine monohydrate',
    amount: '5',
    unit: 'g',
    percentDailyValue: null,
    sortOrder: null,
    ...overrides,
});

describe('adminNutritionSupplementsUpsert', () => {
    it('inserts a new supplement when no supplementId is supplied', async () => {
        // Arrange
        const { serverRuntime, requestingSession } = await commandSetup();

        // Act
        const result = await adminNutritionSupplementsUpsert(requestingSession.userId!, [baseInput()], requestingSession, serverRuntime);

        // Assert
        expect(result.success).toBe(true);
        expect(result.referenceIds).toHaveLength(1);
        const createdId = result.referenceIds![0]!;
        const rows = await testDb.select().from(supplements).where(eq(supplements.supplementId, createdId));
        expect(rows).toHaveLength(1);
        expect(rows[0]!.name).toBe('Creatine Monohydrate');
        expect(rows[0]!.servingsPerContainer).toBe(100);
        expect(serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: requestingSession.userId });
    });

    it('updates the existing supplement when supplementId is supplied', async () => {
        // Arrange
        const { serverRuntime, requestingSession } = await commandSetup();
        const seeded = await adminNutritionSupplementsUpsert(requestingSession.userId!, [baseInput()], requestingSession, serverRuntime);
        const createdId = seeded.referenceIds![0]!;

        // Act
        const updated = await adminNutritionSupplementsUpsert(
            requestingSession.userId!,
            [baseInput({ supplementId: createdId, name: 'Creatine (renamed)', servingsPerContainer: 60 })],
            requestingSession,
            serverRuntime,
        );

        // Assert — same id, new content, no second row
        expect(updated.referenceIds).toEqual([createdId]);
        const rows = await testDb.select().from(supplements).where(eq(supplements.supplementId, createdId));
        expect(rows).toHaveLength(1);
        expect(rows[0]!.name).toBe('Creatine (renamed)');
        expect(rows[0]!.servingsPerContainer).toBe(60);
    });

    it('throws when updating a supplement that does not exist', async () => {
        // Arrange
        const { serverRuntime, requestingSession } = await commandSetup();

        // Act + Assert
        await expect(
            adminNutritionSupplementsUpsert(
                requestingSession.userId!,
                [baseInput({ supplementId: crypto.randomUUID() })],
                requestingSession,
                serverRuntime,
            ),
        ).rejects.toThrow(/not found/);
    });
});

describe('adminNutritionSupplementNutrientsReplace', () => {
    it('replaces the whole nutrient set with sortOrder = array index', async () => {
        // Arrange — a supplement seeded with two nutrient rows
        const { serverRuntime, requestingSession } = await commandSetup();
        const seeded = await adminNutritionSupplementsUpsert(requestingSession.userId!, [baseInput()], requestingSession, serverRuntime);
        const supplementId = seeded.referenceIds![0]!;
        await adminNutritionSupplementNutrientsReplace(
            requestingSession.userId!,
            supplementId,
            [nutrient({ name: 'Old A' }), nutrient({ name: 'Old B' })],
            requestingSession,
            serverRuntime,
        );

        // Act — replace with a single, different nutrient
        await adminNutritionSupplementNutrientsReplace(
            requestingSession.userId!,
            supplementId,
            [nutrient({ name: 'Vitamin D3', amount: '2000', unit: 'IU', percentDailyValue: 250 })],
            requestingSession,
            serverRuntime,
        );

        // Assert — only the new row survives, sortOrder starts at 0
        const rows = await testDb.select().from(supplementNutrients).where(eq(supplementNutrients.supplementId, supplementId));
        expect(rows).toHaveLength(1);
        expect(rows[0]!.name).toBe('Vitamin D3');
        expect(rows[0]!.sortOrder).toBe(0);
        expect(rows[0]!.percentDailyValue).toBe(250);
    });

    it('clears the composition when given an empty array', async () => {
        // Arrange
        const { serverRuntime, requestingSession } = await commandSetup();
        const seeded = await adminNutritionSupplementsUpsert(requestingSession.userId!, [baseInput()], requestingSession, serverRuntime);
        const supplementId = seeded.referenceIds![0]!;
        await adminNutritionSupplementNutrientsReplace(
            requestingSession.userId!,
            supplementId,
            [nutrient()],
            requestingSession,
            serverRuntime,
        );

        // Act
        await adminNutritionSupplementNutrientsReplace(requestingSession.userId!, supplementId, [], requestingSession, serverRuntime);

        // Assert
        const rows = await testDb.select().from(supplementNutrients).where(eq(supplementNutrients.supplementId, supplementId));
        expect(rows).toHaveLength(0);
    });

    it('throws when the parent supplement does not exist', async () => {
        // Arrange
        const { serverRuntime, requestingSession } = await commandSetup();

        // Act + Assert
        await expect(
            adminNutritionSupplementNutrientsReplace(
                requestingSession.userId!,
                crypto.randomUUID(),
                [nutrient()],
                requestingSession,
                serverRuntime,
            ),
        ).rejects.toThrow(/not found/);
    });
});

describe('adminNutritionSupplementsDelete', () => {
    it('deletes the supplement and cascades its nutrient rows', async () => {
        // Arrange — a supplement with a composition
        const { serverRuntime, requestingSession } = await commandSetup();
        const seeded = await adminNutritionSupplementsUpsert(requestingSession.userId!, [baseInput()], requestingSession, serverRuntime);
        const supplementId = seeded.referenceIds![0]!;
        await adminNutritionSupplementNutrientsReplace(
            requestingSession.userId!,
            supplementId,
            [nutrient()],
            requestingSession,
            serverRuntime,
        );

        // Act
        const result = await adminNutritionSupplementsDelete(requestingSession.userId!, [supplementId], requestingSession, serverRuntime);

        // Assert — parent gone, children gone (FK cascade)
        expect(result.success).toBe(true);
        const parentRows = await testDb.select().from(supplements).where(eq(supplements.supplementId, supplementId));
        expect(parentRows).toHaveLength(0);
        const childRows = await testDb.select().from(supplementNutrients).where(eq(supplementNutrients.supplementId, supplementId));
        expect(childRows).toHaveLength(0);
    });

    it('throws when deleting a supplement that does not exist', async () => {
        // Arrange
        const { serverRuntime, requestingSession } = await commandSetup();

        // Act + Assert
        await expect(
            adminNutritionSupplementsDelete(requestingSession.userId!, [crypto.randomUUID()], requestingSession, serverRuntime),
        ).rejects.toThrow(/not found/);
    });
});
