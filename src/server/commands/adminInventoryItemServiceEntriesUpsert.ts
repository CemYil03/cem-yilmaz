import { tool } from 'ai';
import { eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { requireAdminUserId } from '../agents/requireAdminUserId';
import { itemServiceEntries } from '../db/schema';
import type { AdminInventoryItemServiceEntryCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { GqlSAdminInventoryItemServiceEntryInputSchema } from '../graphql/generated';
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

// Batch create-or-edit of service-log entries (repairs, services,
// replacements) on an item. Each row is `GqlSAdminInventoryItemServiceEntryInputSchema()` —
// the same shape the resolver validates. Gemini-safe: the only date fields
// (`performedAt` / `nextDueAt`) are `Date` scalars the codegen emits as
// `z.string()`, not `DateTime` (`z.date()`), so no hand-built duplicate is
// needed. See `docs/architecture/agent-delegation.md#tool-input-schemas`.
const toolInventoryServiceEntriesUpsertInputSchema = z.object({
    itemServiceEntries: z.array(GqlSAdminInventoryItemServiceEntryInputSchema()).min(1),
});

interface InventoryAgentToolContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
}

export function toolInventoryServiceEntriesUpsert({ serverRuntime, session }: InventoryAgentToolContext) {
    return tool({
        description: [
            'Batch create-or-edit of service-log entries on an item — repairs, routine services, part replacements,',
            'and other maintenance events. Use when Cem says he had something serviced or repaired ("got the car',
            'serviced yesterday, 180 €"). Each row needs the `itemId` it belongs to, a `kind` (repair | service |',
            'replacement | other), and `performedAt` (ISO date). `costCents` is in CENTS. Set `nextDueAt` for the next',
            'service so it surfaces as a reminder. Every row with a `serviceEntryId` is updated; every row without one',
            'is inserted. Returns `referenceIds` in input order.',
        ].join(' '),
        inputSchema: toolInventoryServiceEntriesUpsertInputSchema,
        execute: async (rawInput) => {
            const inputs = rawInput.itemServiceEntries as GqlSAdminInventoryItemServiceEntryInput[];
            return adminInventoryItemServiceEntriesUpsert(requireAdminUserId(session), inputs, session, serverRuntime);
        },
    });
}
