import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { financeIncomeStreams } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { adminFinancesIncomeStreamsDelete } from './adminFinancesIncomeStreamsDelete';
import { adminFinancesIncomeStreamsUpsert } from './adminFinancesIncomeStreamsUpsert';

const seedRow = async (
    serverRuntime: Awaited<ReturnType<typeof commandSetup>>['serverRuntime'],
    requestingSession: Awaited<ReturnType<typeof commandSetup>>['requestingSession'],
) => {
    const result = await adminFinancesIncomeStreamsUpsert(
        requestingSession.userId!,
        [
            {
                incomeStreamId: null,
                name: 'Salary',
                amountCents: 450000,
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

describe('adminFinancesIncomeStreamsDelete', () => {
    it('removes the row and reports success', async () => {
        const { serverRuntime, requestingSession } = await commandSetup();
        const createdId = await seedRow(serverRuntime, requestingSession);
        (serverRuntime.publish.userUpdates as unknown as { mockClear: () => void }).mockClear();

        const result = await adminFinancesIncomeStreamsDelete(requestingSession.userId!, [createdId], requestingSession, serverRuntime);

        expect(result.success).toBe(true);
        expect(result.referenceIds).toEqual([createdId]);
        const rows = await testDb.select().from(financeIncomeStreams).where(eq(financeIncomeStreams.incomeStreamId, createdId));
        expect(rows).toHaveLength(0);
        expect(serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: requestingSession.userId });
    });

    it('throws when the row does not exist', async () => {
        const { serverRuntime, requestingSession } = await commandSetup();
        const missingId = crypto.randomUUID();

        await expect(
            adminFinancesIncomeStreamsDelete(requestingSession.userId!, [missingId], requestingSession, serverRuntime),
        ).rejects.toThrow(/not found/);
        expect(serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
    });

    it('deletes every id in a batch and echoes them in input order', async () => {
        const { serverRuntime, requestingSession } = await commandSetup();
        const idA = await seedRow(serverRuntime, requestingSession);
        const idB = await seedRow(serverRuntime, requestingSession);
        const idC = await seedRow(serverRuntime, requestingSession);
        (serverRuntime.publish.userUpdates as unknown as { mockClear: () => void }).mockClear();

        const result = await adminFinancesIncomeStreamsDelete(requestingSession.userId!, [idB, idC, idA], requestingSession, serverRuntime);

        expect(result.referenceIds).toEqual([idB, idC, idA]);
        for (const id of [idA, idB, idC]) {
            const rows = await testDb.select().from(financeIncomeStreams).where(eq(financeIncomeStreams.incomeStreamId, id));
            expect(rows).toHaveLength(0);
        }
        expect(serverRuntime.publish.userUpdates).toHaveBeenCalledTimes(1);
    });

    it('throws when any id in the batch does not exist', async () => {
        const { serverRuntime, requestingSession } = await commandSetup();
        const idA = await seedRow(serverRuntime, requestingSession);
        const missingId = crypto.randomUUID();
        (serverRuntime.publish.userUpdates as unknown as { mockClear: () => void }).mockClear();

        await expect(
            adminFinancesIncomeStreamsDelete(requestingSession.userId!, [idA, missingId], requestingSession, serverRuntime),
        ).rejects.toThrow(/not found/);
        expect(serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
    });
});
