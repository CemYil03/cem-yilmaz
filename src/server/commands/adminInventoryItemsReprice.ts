import { tool } from 'ai';
import { eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { requireAdminUserId } from '../agents/requireAdminUserId';
import { items, itemValuations } from '../db/schema';
import type { AdminInventoryItemValuationCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminInventoryItemRepriceInput, GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Batch repricing. For each input, insert one `ItemValuations` journal row and
// update the cached `items.currentValueCents` so list / overview reads never
// hit the journal. The whole batch runs in a single transaction so a partial
// failure rolls back to zero writes. `valuedAt` is settable so a back-dated
// appraisal is honoured; callers typically write "now"-timestamped rows so we
// simply overwrite the cache — the sparkline reads the journal directly, and
// the cache is a convenience. `referenceIds` echoes the `itemId` per input in
// input order.
//
// Kept separate from `adminInventoryItemsUpsert` because a reprice is more than a field-set:
// it appends a journal row, so a naive upsert could silently overwrite the
// cache without a matching journal entry.
export async function adminInventoryItemsReprice(
    userId: string,
    inputs: readonly GqlSAdminInventoryItemRepriceInput[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    const now = new Date();

    // Phase 1 — payload construction.
    const rows = inputs.map((input) => {
        const valuation: AdminInventoryItemValuationCreate = {
            valuationId: crypto.randomUUID(),
            itemId: input.itemId,
            valueCents: input.valueCents,
            valuedAt: input.valuedAt ?? now,
            note: input.note ?? null,
        };
        return { itemId: input.itemId, valueCents: input.valueCents, valuation };
    });

    // Phase 2 — transactional execution.
    try {
        const itemIds = Array.from(new Set(rows.map((row) => row.itemId)));
        await serverRuntime.db.transaction(async (transaction) => {
            const existing = await transaction.select({ itemId: items.itemId }).from(items).where(inArray(items.itemId, itemIds));
            if (existing.length !== itemIds.length) {
                const found = new Set(existing.map((row) => row.itemId));
                const missing = itemIds.filter((id) => !found.has(id));
                throw new Error(`adminInventoryItemsReprice: rows not found: ${missing.join(', ')}`);
            }
            for (const row of rows) {
                await transaction.insert(itemValuations).values(row.valuation);
                await transaction
                    .update(items)
                    .set({ currentValueCents: row.valueCents, updatedAt: now })
                    .where(eq(items.itemId, row.itemId));
            }
        });
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: rows.map((row) => row.itemId) };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}

// Batch reprice of items — the "it's worth X now" path. Kept separate from
// `inventoryItemsUpsert` because a reprice is more than a field-set: it appends
// an `ItemValuations` journal row AND updates the cached current value in one
// transaction, so the valuations sparkline stays honest.
//
// Hand-built row schema because `AdminInventoryItemRepriceInput.valuedAt` is a `DateTime`
// scalar the codegen emits as `z.date()`, which Gemini's constrained decoding
// rejects. `valuedAt` rides the wire as an ISO string and `execute` converts
// with `new Date(...)`. See `docs/architecture/agent-delegation.md#tool-input-schemas`.
const repriceRowSchema = z.object({
    itemId: z.uuid().describe('The item being repriced. Required — reprice always targets an existing item.'),
    valueCents: z.number().int().min(0).describe('The new current value in cents. 1.800 € → 180000.'),
    valuedAt: z.string().nullish().describe('ISO-8601 timestamp of the appraisal. Defaults to now; set only for a back-dated valuation.'),
    note: z.string().max(2000).nullish().describe('Optional note on the valuation, e.g. "market check on eBay".'),
});

const toolInventoryItemsRepriceInputSchema = z.object({
    inputs: z.array(repriceRowSchema).min(1).describe('One or more repricing instructions. Pass a one-element array for a single reprice.'),
});

interface InventoryAgentToolContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
}

export function toolInventoryItemsReprice({ serverRuntime, session }: InventoryAgentToolContext) {
    return tool({
        description: [
            'Reprice one or more items — use whenever Cem says an item is worth a new amount today ("my bike is worth',
            '800 now"). This journals a valuation AND updates the cached current value in one transaction, so the',
            "item's value history and material net worth both stay correct. Do NOT use `inventoryItemsUpsert` to",
            'change what something is worth — that path deliberately cannot touch the current value. `valueCents` is in',
            'CENTS (1.800 € → 180000). Returns `referenceIds` (the item ids) in input order.',
        ].join(' '),
        inputSchema: toolInventoryItemsRepriceInputSchema,
        execute: async (input) => {
            const inputs: GqlSAdminInventoryItemRepriceInput[] = input.inputs.map((reprice) => ({
                itemId: reprice.itemId,
                valueCents: reprice.valueCents,
                valuedAt: reprice.valuedAt ? new Date(reprice.valuedAt) : null,
                note: reprice.note ?? null,
            }));
            return adminInventoryItemsReprice(requireAdminUserId(session), inputs, session, serverRuntime);
        },
    });
}
