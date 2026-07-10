import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { financeRecurringCosts } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { adminFinancesRecurringCostsDelete } from './adminFinancesRecurringCostsDelete';
import { adminFinancesRecurringCostsUpsert } from './adminFinancesRecurringCostsUpsert';

const seedRow = async (
    serverRuntime: Awaited<ReturnType<typeof commandSetup>>['serverRuntime'],
    requestingSession: Awaited<ReturnType<typeof commandSetup>>['requestingSession'],
) => {
    const result = await adminFinancesRecurringCostsUpsert(
        requestingSession.userId!,
        [
            {
                costId: null,
                name: 'Netflix',
                categoryKey: 'subscriptionsEntertainment',
                amountCents: 1299,
                cadence: 'monthly',
                currency: null,
                notes: null,
                active: null,
                startsOn: null,
                endsOn: null,
            },
        ],
        requestingSession,
        serverRuntime,
    );
    return result.referenceIds![0]!;
};

describe('adminFinancesRecurringCostsDelete', () => {
    it('removes the row and reports success', async () => {
        // Arrange — seed a row
        const { serverRuntime, requestingSession } = await commandSetup();
        const createdId = await seedRow(serverRuntime, requestingSession);
        // clear publish spy so the assertion below covers only the delete call
        (serverRuntime.publish.userUpdates as unknown as { mockClear: () => void }).mockClear();

        // Act
        const result = await adminFinancesRecurringCostsDelete(requestingSession.userId!, [createdId], requestingSession, serverRuntime);

        // Assert
        expect(result.success).toBe(true);
        expect(result.referenceIds).toEqual([createdId]);
        const rows = await testDb.select().from(financeRecurringCosts).where(eq(financeRecurringCosts.costId, createdId));
        expect(rows).toHaveLength(0);
        expect(serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: requestingSession.userId });
    });

    it('throws when the row does not exist', async () => {
        // Arrange
        const { serverRuntime, requestingSession } = await commandSetup();
        const missingId = crypto.randomUUID();

        // Act + Assert
        await expect(
            adminFinancesRecurringCostsDelete(requestingSession.userId!, [missingId], requestingSession, serverRuntime),
        ).rejects.toThrow(/not found/);
        expect(serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
    });

    it('deletes every id in a batch and echoes them in input order', async () => {
        // Arrange
        const { serverRuntime, requestingSession } = await commandSetup();
        const idA = await seedRow(serverRuntime, requestingSession);
        const idB = await seedRow(serverRuntime, requestingSession);
        const idC = await seedRow(serverRuntime, requestingSession);
        (serverRuntime.publish.userUpdates as unknown as { mockClear: () => void }).mockClear();

        // Act — deliberately non-sorted order to prove input order is preserved
        const result = await adminFinancesRecurringCostsDelete(
            requestingSession.userId!,
            [idB, idC, idA],
            requestingSession,
            serverRuntime,
        );

        // Assert
        expect(result.referenceIds).toEqual([idB, idC, idA]);
        for (const id of [idA, idB, idC]) {
            const rows = await testDb.select().from(financeRecurringCosts).where(eq(financeRecurringCosts.costId, id));
            expect(rows).toHaveLength(0);
        }
        expect(serverRuntime.publish.userUpdates).toHaveBeenCalledTimes(1);
    });

    it('throws when any id in the batch does not exist', async () => {
        // Arrange — one real id and one missing id. Same posture as the
        // singular delete: the batch throws when the caller-supplied ids
        // don't all match a row.
        const { serverRuntime, requestingSession } = await commandSetup();
        const idA = await seedRow(serverRuntime, requestingSession);
        const missingId = crypto.randomUUID();
        (serverRuntime.publish.userUpdates as unknown as { mockClear: () => void }).mockClear();

        // Act + Assert
        await expect(
            adminFinancesRecurringCostsDelete(requestingSession.userId!, [idA, missingId], requestingSession, serverRuntime),
        ).rejects.toThrow(/not found/);
        expect(serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
    });
});
