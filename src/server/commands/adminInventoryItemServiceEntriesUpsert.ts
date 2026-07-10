import { eq, inArray } from 'drizzle-orm';
import { itemServiceEntries } from '../db/schema';
import type { AdminInventoryItemServiceEntryCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminInventoryItemServiceEntryInput, GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Batch upsert of service entries. Every input with a `serviceEntryId` is
// updated; every input without one is inserted under a freshly-minted UUID.
// The whole batch runs inside a single transaction so a partial failure rolls
// back to zero writes. `referenceIds` echoes the id per input row (in input
// order) so the caller can address newly-created rows without a follow-up
// read.
export async function adminInventoryItemServiceEntriesUpsert(
    userId: string,
    inputs: readonly GqlSAdminInventoryItemServiceEntryInput[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    const now = new Date();

    // Phase 1 — payload construction.
    const rows = inputs.map((input) => {
        const serviceEntryId = input.serviceEntryId ?? crypto.randomUUID();
        const payload: AdminInventoryItemServiceEntryCreate = {
            serviceEntryId,
            itemId: input.itemId,
            kind: input.kind,
            performedAt: input.performedAt,
            vendor: input.vendor ?? null,
            costCents: input.costCents ?? null,
            notes: input.notes ?? null,
            nextDueAt: input.nextDueAt ?? null,
            updatedAt: now,
        };
        return { serviceEntryId, isUpdate: Boolean(input.serviceEntryId), payload };
    });

    // Phase 2 — transactional execution.
    try {
        const updateIds = rows.filter((row) => row.isUpdate).map((row) => row.serviceEntryId);
        await serverRuntime.db.transaction(async (transaction) => {
            if (updateIds.length > 0) {
                const existing = await transaction
                    .select({ serviceEntryId: itemServiceEntries.serviceEntryId })
                    .from(itemServiceEntries)
                    .where(inArray(itemServiceEntries.serviceEntryId, updateIds));
                if (existing.length !== updateIds.length) {
                    const found = new Set(existing.map((row) => row.serviceEntryId));
                    const missing = updateIds.filter((id) => !found.has(id));
                    throw new Error(`adminInventoryItemServiceEntriesUpsert: rows not found: ${missing.join(', ')}`);
                }
            }
            for (const row of rows) {
                if (row.isUpdate) {
                    await transaction
                        .update(itemServiceEntries)
                        .set(row.payload)
                        .where(eq(itemServiceEntries.serviceEntryId, row.serviceEntryId));
                } else {
                    await transaction.insert(itemServiceEntries).values(row.payload);
                }
            }
        });
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: rows.map((row) => row.serviceEntryId) };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
