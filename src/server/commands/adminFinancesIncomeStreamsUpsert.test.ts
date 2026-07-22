import { eq, inArray } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { financeIncomeStreams } from '../db/schema';
import type { GqlSAdminFinancesIncomeStreamInput } from '../graphql/generated';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { adminFinancesIncomeStreamsUpsert } from './adminFinancesIncomeStreamsUpsert';

const baseInput = (overrides: Partial<GqlSAdminFinancesIncomeStreamInput> = {}): GqlSAdminFinancesIncomeStreamInput => ({
    incomeStreamId: null,
    name: 'Salary',
    amountCents: 450000,
    cadence: 'monthly',
    currency: null,
    notes: null,
    active: null,
    startsOn: null,
    endsOn: null,
    ...overrides,
});

describe('adminFinancesIncomeStreamsUpsert', () => {
    it('inserts a new row when no incomeStreamId is supplied', async () => {
        const { serverRuntime, requestingSession } = await commandSetup();

        const result = await adminFinancesIncomeStreamsUpsert(requestingSession.userId!, [baseInput()], requestingSession, serverRuntime);

        expect(result.success).toBe(true);
        expect(result.referenceId).toBeNull();
        expect(result.referenceIds).toHaveLength(1);

        const createdId = result.referenceIds![0]!;
        const rows = await testDb.select().from(financeIncomeStreams).where(eq(financeIncomeStreams.incomeStreamId, createdId));
        expect(rows).toHaveLength(1);
        expect(rows[0]!.name).toBe('Salary');
        expect(serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: requestingSession.userId });
    });

    it('coalesces optional fields to their column defaults', async () => {
        const { serverRuntime, requestingSession } = await commandSetup();

        const result = await adminFinancesIncomeStreamsUpsert(requestingSession.userId!, [baseInput()], requestingSession, serverRuntime);

        const createdId = result.referenceIds![0]!;
        const rows = await testDb.select().from(financeIncomeStreams).where(eq(financeIncomeStreams.incomeStreamId, createdId));
        expect(rows[0]!.currency).toBe('EUR');
        expect(rows[0]!.active).toBe(true);
        expect(rows[0]!.notes).toBeNull();
    });

    it('updates the existing row when incomeStreamId is supplied', async () => {
        const { serverRuntime, requestingSession } = await commandSetup();
        const seeded = await adminFinancesIncomeStreamsUpsert(requestingSession.userId!, [baseInput()], requestingSession, serverRuntime);
        const createdId = seeded.referenceIds![0]!;

        const updated = await adminFinancesIncomeStreamsUpsert(
            requestingSession.userId!,
            [baseInput({ incomeStreamId: createdId, name: 'Freelance', amountCents: 120000, active: false })],
            requestingSession,
            serverRuntime,
        );

        expect(updated.referenceIds).toEqual([createdId]);
        const rows = await testDb.select().from(financeIncomeStreams).where(eq(financeIncomeStreams.incomeStreamId, createdId));
        expect(rows).toHaveLength(1);
        expect(rows[0]!.name).toBe('Freelance');
        expect(rows[0]!.amountCents).toBe(120000);
        expect(rows[0]!.active).toBe(false);
    });

    it('throws when updating a row that does not exist', async () => {
        const { serverRuntime, requestingSession } = await commandSetup();
        const missingId = crypto.randomUUID();

        await expect(
            adminFinancesIncomeStreamsUpsert(
                requestingSession.userId!,
                [baseInput({ incomeStreamId: missingId })],
                requestingSession,
                serverRuntime,
            ),
        ).rejects.toThrow(/not found/);
    });

    it('rolls the whole batch back when one row cannot be updated', async () => {
        const { serverRuntime, requestingSession } = await commandSetup();
        const missingId = crypto.randomUUID();
        const insertInput = baseInput({ name: 'Do not persist' });

        await expect(
            adminFinancesIncomeStreamsUpsert(
                requestingSession.userId!,
                [insertInput, baseInput({ incomeStreamId: missingId })],
                requestingSession,
                serverRuntime,
            ),
        ).rejects.toThrow(/not found/);

        const rows = await testDb.select().from(financeIncomeStreams).where(eq(financeIncomeStreams.name, 'Do not persist'));
        expect(rows).toHaveLength(0);
        expect(serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
    });

    it('echoes referenceIds in input order for a mixed insert + update batch', async () => {
        const { serverRuntime, requestingSession } = await commandSetup();
        const seedA = await adminFinancesIncomeStreamsUpsert(
            requestingSession.userId!,
            [baseInput({ name: 'Seed A' })],
            requestingSession,
            serverRuntime,
        );
        const seedB = await adminFinancesIncomeStreamsUpsert(
            requestingSession.userId!,
            [baseInput({ name: 'Seed B' })],
            requestingSession,
            serverRuntime,
        );
        const seededA = seedA.referenceIds![0]!;
        const seededB = seedB.referenceIds![0]!;

        const result = await adminFinancesIncomeStreamsUpsert(
            requestingSession.userId!,
            [
                baseInput({ name: 'Insert 1' }),
                baseInput({ incomeStreamId: seededA, name: 'Updated A' }),
                baseInput({ name: 'Insert 2' }),
                baseInput({ incomeStreamId: seededB, name: 'Updated B' }),
            ],
            requestingSession,
            serverRuntime,
        );

        expect(result.referenceIds).toHaveLength(4);
        expect(result.referenceIds![1]).toBe(seededA);
        expect(result.referenceIds![3]).toBe(seededB);

        const insertedIds = [result.referenceIds![0]!, result.referenceIds![2]!];
        const insertedRows = await testDb
            .select()
            .from(financeIncomeStreams)
            .where(inArray(financeIncomeStreams.incomeStreamId, insertedIds));
        const namesById = Object.fromEntries(insertedRows.map((r) => [r.incomeStreamId, r.name]));
        expect(namesById[insertedIds[0]!]).toBe('Insert 1');
        expect(namesById[insertedIds[1]!]).toBe('Insert 2');
    });
});
