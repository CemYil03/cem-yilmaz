import { tool } from 'ai';
import { eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { requireAdminUserId } from '../agents/requireAdminUserId';
import { items } from '../db/schema';
import type { AdminInventoryItemCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import {
    GqlSAdminInventoryItemCategorySchema,
    GqlSAdminInventoryItemConditionSchema,
    GqlSAdminInventoryItemDisposalStateSchema,
} from '../graphql/generated';
import type { GqlSAdminInventoryItemInput, GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Batch upsert of items. Every input with an `itemId` is updated; every input
// without one is inserted under a freshly-minted UUID. The whole batch runs
// inside a single transaction so a partial failure rolls back to zero writes.
// `referenceIds` echoes the id per input row (in input order) so the caller
// can address newly-created rows without a follow-up read.
//
// Disposal is a plain field-set carried here — there is no separate
// `itemDispose` mutation. `disposedAt` is forced null whenever `disposalState`
// is `owned`, and defaults to now when transitioning into a disposal state
// without an explicit stamp. Editing an item preserves its current disposal
// state because the caller spreads the existing row (which carries
// `disposalState` + `disposedAt`).
//
// `currentValueCents` is *not* editable through this mutation — it is owned
// by `adminInventoryItemsReprice`, which writes the valuations journal in the same
// transaction. On create the cache is seeded with the purchase price so the
// material-net-worth number is non-zero from the first save.
export async function adminInventoryItemsUpsert(
    userId: string,
    inputs: readonly GqlSAdminInventoryItemInput[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    const now = new Date();

    // Phase 1 — payload construction.
    const rows = inputs.map((input) => {
        const itemId = input.itemId ?? crypto.randomUUID();
        const isUpdate = Boolean(input.itemId);
        const disposalState = input.disposalState ?? 'owned';
        const disposedAt = disposalState === 'owned' ? null : (input.disposedAt ?? now);
        const payload: AdminInventoryItemCreate = {
            itemId,
            categoryKey: input.categoryKey,
            name: input.name,
            brand: input.brand ?? null,
            model: input.model ?? null,
            serialNumber: input.serialNumber ?? null,
            purchasedAt: input.purchasedAt ?? null,
            purchasePriceCents: input.purchasePriceCents ?? null,
            condition: input.condition ?? null,
            disposalState,
            disposedAt,
            warrantyEndsAt: input.warrantyEndsAt ?? null,
            warrantyProvider: input.warrantyProvider ?? null,
            warrantyNotes: input.warrantyNotes ?? null,
            notes: input.notes ?? null,
            updatedAt: now,
        };
        // The cached current value belongs to `adminInventoryItemsReprice`; only seed it on
        // create so the net-worth number is non-zero from the first save. On
        // update the column is left untouched (omitted from the `set`).
        if (!isUpdate) payload.currentValueCents = input.purchasePriceCents ?? null;
        return { itemId, isUpdate, payload };
    });

    // Phase 2 — transactional execution.
    try {
        const updateIds = rows.filter((row) => row.isUpdate).map((row) => row.itemId);
        await serverRuntime.db.transaction(async (transaction) => {
            if (updateIds.length > 0) {
                const existing = await transaction.select({ itemId: items.itemId }).from(items).where(inArray(items.itemId, updateIds));
                if (existing.length !== updateIds.length) {
                    const found = new Set(existing.map((row) => row.itemId));
                    const missing = updateIds.filter((id) => !found.has(id));
                    throw new Error(`adminInventoryItemsUpsert: rows not found: ${missing.join(', ')}`);
                }
            }
            for (const row of rows) {
                if (row.isUpdate) {
                    await transaction.update(items).set(row.payload).where(eq(items.itemId, row.itemId));
                } else {
                    await transaction.insert(items).values(row.payload);
                }
            }
        });
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: rows.map((row) => row.itemId) };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}

// Batch create-or-edit of items. Hand-built row schema rather than the
// generated `GqlSAdminInventoryItemInputSchema()` because `AdminInventoryItemInput.disposedAt` is a
// `DateTime` scalar, which the codegen emits as `z.date()`; Gemini's
// constrained decoding rejects `z.date()` and yields `MALFORMED_FUNCTION_CALL`.
// `disposedAt` therefore rides the wire as an ISO string and `execute`
// converts with `new Date(...)`. The `Date`-scalar fields (`purchasedAt`,
// `warrantyEndsAt`) are already `z.string()` in the codegen, so only the
// `DateTime` field needs the workaround. Enum schemas are reused verbatim so a
// future enum addition surfaces as a TS error here rather than a runtime
// mismatch. See `docs/architecture/agent-delegation.md#tool-input-schemas`.
const itemRowSchema = z.object({
    itemId: z.uuid().nullish().describe('Omit (or null) to create a new item. Pass an existing id to edit.'),
    categoryKey: GqlSAdminInventoryItemCategorySchema.describe(
        'appliance | clothing | electronics | furniture | kitchen | sports | tool | vehicle | other',
    ),
    name: z.string().min(1).max(300).describe('AdminInventoryItem name, e.g. "MacBook Pro 14".'),
    brand: z.string().max(200).nullish(),
    model: z.string().max(200).nullish(),
    serialNumber: z.string().max(200).nullish(),
    purchasedAt: z.string().nullish().describe('ISO date `YYYY-MM-DD` the item was bought. Optional.'),
    purchasePriceCents: z.number().int().min(0).nullish().describe('Purchase price in cents. 2.500 € → 250000.'),
    condition: GqlSAdminInventoryItemConditionSchema.nullish().describe('new | likeNew | good | fair | poor'),
    warrantyEndsAt: z.string().nullish().describe('ISO date `YYYY-MM-DD` the warranty lapses. Optional.'),
    warrantyProvider: z.string().max(200).nullish(),
    warrantyNotes: z.string().max(2000).nullish(),
    notes: z.string().max(4000).nullish(),
    disposalState: GqlSAdminInventoryItemDisposalStateSchema.nullish().describe(
        'owned (default) | sold | gifted | lost | disposed. Set to dispose of an item — the row is kept so net worth stays reconcilable.',
    ),
    disposedAt: z
        .string()
        .nullish()
        .describe('ISO-8601 timestamp of disposal. Only meaningful when `disposalState` is not `owned`; defaults to now.'),
});

const toolInventoryItemsUpsertInputSchema = z.object({
    items: z.array(itemRowSchema).min(1).describe('One or more items to create or edit. Pass a one-element array for a single edit.'),
});

interface InventoryAgentToolContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
}

export function toolInventoryItemsUpsert({ serverRuntime, session }: InventoryAgentToolContext) {
    return tool({
        description: [
            'Batch create-or-edit of inventory items. Every row with an `itemId` is updated; every row without one is',
            'inserted. Pass a single-element array for one item, many for bulk. `purchasePriceCents` is in CENTS',
            '(2.500 € → 250000). On create, the current value is seeded from the purchase price — do NOT try to set',
            'the current value here; use `inventoryItemsReprice` to change what an item is worth today (it journals the',
            'valuation). To dispose of an item (sold / gifted / lost / disposed) set `disposalState`; the row is kept',
            'so material net worth stays reconcilable, and reverting to `owned` clears the disposal stamp. Returns',
            '`referenceIds` in input order.',
        ].join(' '),
        inputSchema: toolInventoryItemsUpsertInputSchema,
        execute: async (input) => {
            const inputs: GqlSAdminInventoryItemInput[] = input.items.map((item) => ({
                itemId: item.itemId ?? null,
                categoryKey: item.categoryKey,
                name: item.name,
                brand: item.brand ?? null,
                model: item.model ?? null,
                serialNumber: item.serialNumber ?? null,
                purchasedAt: item.purchasedAt ?? null,
                purchasePriceCents: item.purchasePriceCents ?? null,
                condition: item.condition ?? null,
                warrantyEndsAt: item.warrantyEndsAt ?? null,
                warrantyProvider: item.warrantyProvider ?? null,
                warrantyNotes: item.warrantyNotes ?? null,
                notes: item.notes ?? null,
                disposalState: item.disposalState ?? null,
                disposedAt: item.disposedAt ? new Date(item.disposedAt) : null,
            }));
            return adminInventoryItemsUpsert(requireAdminUserId(session), inputs, session, serverRuntime);
        },
    });
}
