import { tool } from 'ai';
import { z } from 'zod';
import { itemsUpsert } from '../commands/itemsUpsert';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { GqlSItemCategorySchema, GqlSItemConditionSchema, GqlSItemDisposalStateSchema } from '../graphql/generated';
import type { GqlSItemInput, GqlSSession } from '../graphql/generated';
import type { InventoryAgentMutationLog } from './agentPersonalAssistantInventory';
import { requireAdminUserId } from './requireAdminUserId';

// Batch create-or-edit of items. Hand-built row schema rather than the
// generated `GqlSItemInputSchema()` because `ItemInput.disposedAt` is a
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
    categoryKey: GqlSItemCategorySchema.describe(
        'appliance | clothing | electronics | furniture | kitchen | sports | tool | vehicle | other',
    ),
    name: z.string().min(1).max(300).describe('Item name, e.g. "MacBook Pro 14".'),
    brand: z.string().max(200).nullish(),
    model: z.string().max(200).nullish(),
    serialNumber: z.string().max(200).nullish(),
    purchasedAt: z.string().nullish().describe('ISO date `YYYY-MM-DD` the item was bought. Optional.'),
    purchasePriceCents: z.number().int().min(0).nullish().describe('Purchase price in cents. 2.500 € → 250000.'),
    condition: GqlSItemConditionSchema.nullish().describe('new | likeNew | good | fair | poor'),
    warrantyEndsAt: z.string().nullish().describe('ISO date `YYYY-MM-DD` the warranty lapses. Optional.'),
    warrantyProvider: z.string().max(200).nullish(),
    warrantyNotes: z.string().max(2000).nullish(),
    notes: z.string().max(4000).nullish(),
    disposalState: GqlSItemDisposalStateSchema.nullish().describe(
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

interface InventoryAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: InventoryAgentMutationLog;
}

export function toolInventoryItemsUpsert({ serverRuntime, session, mutations }: InventoryAgentMutationContext) {
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
            const inputs: GqlSItemInput[] = input.items.map((item) => ({
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
            const result = await itemsUpsert(requireAdminUserId(session), inputs, session, serverRuntime);
            const referenceIds = result.referenceIds ?? [];
            input.items.forEach((item, index) => {
                mutations.push({
                    kind: item.itemId ? 'itemUpdate' : 'itemAdd',
                    id: referenceIds[index] ?? item.itemId ?? '',
                    title: item.name,
                });
            });
            return result;
        },
    });
}
