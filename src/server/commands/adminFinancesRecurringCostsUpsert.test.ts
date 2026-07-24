import { eq, inArray } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { financeRecurringCosts } from '../db/schema';
import type { GqlSAdminFinancesRecurringCostInput } from '../graphql/generated';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { adminFinancesRecurringCostsUpsert } from './adminFinancesRecurringCostsUpsert';

const baseInput = (overrides: Partial<GqlSAdminFinancesRecurringCostInput> = {}): GqlSAdminFinancesRecurringCostInput => ({
    costId: null,
    name: 'Netflix',
    categoryKey: 'entertainment',
    amountCents: 1299,
    cadence: 'monthly',
    currency: null,
    notes: null,
    active: null,
    startsOn: null,
    endsOn: null,
    ...overrides,
});

describe('adminFinancesRecurringCostsUpsert', () => {
    it('inserts a new row when no costId is supplied', async () => {
        // Arrange
        const { serverRuntime, requestingSession } = await commandSetup();

        // Act
        const result = await adminFinancesRecurringCostsUpsert(requestingSession.userId!, [baseInput()], requestingSession, serverRuntime);

        // Assert — batch result echoes the id of the freshly-created row
        expect(result.success).toBe(true);
        expect(result.referenceId).toBeNull();
        expect(result.referenceIds).toHaveLength(1);

        const createdId = result.referenceIds![0]!;
        const rows = await testDb.select().from(financeRecurringCosts).where(eq(financeRecurringCosts.costId, createdId));
        expect(rows).toHaveLength(1);
        expect(rows[0]!.name).toBe('Netflix');
        expect(serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: requestingSession.userId });
    });

    it('coalesces optional fields to their column defaults', async () => {
        // Arrange — a partial payload from the "New cost" dialog
        const { serverRuntime, requestingSession } = await commandSetup();

        // Act
        const result = await adminFinancesRecurringCostsUpsert(requestingSession.userId!, [baseInput()], requestingSession, serverRuntime);

        // Assert — currency falls back to EUR, active to true
        const createdId = result.referenceIds![0]!;
        const rows = await testDb.select().from(financeRecurringCosts).where(eq(financeRecurringCosts.costId, createdId));
        expect(rows[0]!.currency).toBe('EUR');
        expect(rows[0]!.active).toBe(true);
        expect(rows[0]!.notes).toBeNull();
    });

    it('updates the existing row when costId is supplied', async () => {
        // Arrange — seed a row, then upsert with the same id and new values
        const { serverRuntime, requestingSession } = await commandSetup();
        const seeded = await adminFinancesRecurringCostsUpsert(requestingSession.userId!, [baseInput()], requestingSession, serverRuntime);
        const createdId = seeded.referenceIds![0]!;

        // Act
        const updated = await adminFinancesRecurringCostsUpsert(
            requestingSession.userId!,
            [baseInput({ costId: createdId, name: 'Disney+', amountCents: 899, active: false })],
            requestingSession,
            serverRuntime,
        );

        // Assert — the same id, new content, no second row
        expect(updated.referenceIds).toEqual([createdId]);
        const rows = await testDb.select().from(financeRecurringCosts).where(eq(financeRecurringCosts.costId, createdId));
        expect(rows).toHaveLength(1);
        expect(rows[0]!.name).toBe('Disney+');
        expect(rows[0]!.amountCents).toBe(899);
        expect(rows[0]!.active).toBe(false);
    });

    it('throws when updating a row that does not exist', async () => {
        // Arrange
        const { serverRuntime, requestingSession } = await commandSetup();
        const missingId = crypto.randomUUID();

        // Act + Assert
        await expect(
            adminFinancesRecurringCostsUpsert(
                requestingSession.userId!,
                [baseInput({ costId: missingId })],
                requestingSession,
                serverRuntime,
            ),
        ).rejects.toThrow(/not found/);
    });

    it('rolls the whole batch back when one row cannot be updated', async () => {
        // Arrange — one insert alongside one update targeting a missing id.
        // The transactional posture means the insert must not survive.
        const { serverRuntime, requestingSession } = await commandSetup();
        const missingId = crypto.randomUUID();
        const insertInput = baseInput({ name: 'Do not persist' });

        // Act + Assert
        await expect(
            adminFinancesRecurringCostsUpsert(
                requestingSession.userId!,
                [insertInput, baseInput({ costId: missingId })],
                requestingSession,
                serverRuntime,
            ),
        ).rejects.toThrow(/not found/);

        // The insert side of the batch must not have leaked through.
        const rows = await testDb.select().from(financeRecurringCosts).where(eq(financeRecurringCosts.name, 'Do not persist'));
        expect(rows).toHaveLength(0);
        expect(serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
    });

    it('echoes referenceIds in input order for a mixed insert + update batch', async () => {
        // Arrange — seed two rows we can update, then hand back a batch that
        // interleaves inserts and updates. The point of the assertion is that
        // `referenceIds[i]` corresponds to `inputs[i]`, regardless of whether
        // the row already existed.
        const { serverRuntime, requestingSession } = await commandSetup();
        const seedA = await adminFinancesRecurringCostsUpsert(
            requestingSession.userId!,
            [baseInput({ name: 'Seed A' })],
            requestingSession,
            serverRuntime,
        );
        const seedB = await adminFinancesRecurringCostsUpsert(
            requestingSession.userId!,
            [baseInput({ name: 'Seed B' })],
            requestingSession,
            serverRuntime,
        );
        const seededA = seedA.referenceIds![0]!;
        const seededB = seedB.referenceIds![0]!;

        // Act — insert, update, insert, update in that specific order.
        const result = await adminFinancesRecurringCostsUpsert(
            requestingSession.userId!,
            [
                baseInput({ name: 'Insert 1' }),
                baseInput({ costId: seededA, name: 'Updated A' }),
                baseInput({ name: 'Insert 2' }),
                baseInput({ costId: seededB, name: 'Updated B' }),
            ],
            requestingSession,
            serverRuntime,
        );

        // Assert — length, index-aligned ids for the two updates, and the two
        // inserts got freshly-minted ids that also line up with the DB rows.
        expect(result.referenceIds).toHaveLength(4);
        expect(result.referenceIds![1]).toBe(seededA);
        expect(result.referenceIds![3]).toBe(seededB);

        const insertedIds = [result.referenceIds![0]!, result.referenceIds![2]!];
        const insertedRows = await testDb.select().from(financeRecurringCosts).where(inArray(financeRecurringCosts.costId, insertedIds));
        const namesById = Object.fromEntries(insertedRows.map((r) => [r.costId, r.name]));
        expect(namesById[insertedIds[0]!]).toBe('Insert 1');
        expect(namesById[insertedIds[1]!]).toBe('Insert 2');
    });
});
