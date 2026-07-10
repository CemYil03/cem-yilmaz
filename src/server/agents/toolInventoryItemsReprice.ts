import { tool } from 'ai';
import { z } from 'zod';
import { adminInventoryItemsReprice } from '../commands/adminInventoryItemsReprice';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminInventoryItemRepriceInput, GqlSSession } from '../graphql/generated';
import type { InventoryAgentMutationLog } from './agentPersonalAssistantInventory';
import { requireAdminUserId } from './requireAdminUserId';

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

interface InventoryAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: InventoryAgentMutationLog;
}

export function toolInventoryItemsReprice({ serverRuntime, session, mutations }: InventoryAgentMutationContext) {
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
            const result = await adminInventoryItemsReprice(requireAdminUserId(session), inputs, session, serverRuntime);
            for (const reprice of input.inputs) {
                mutations.push({ kind: 'reprice', id: reprice.itemId });
            }
            return result;
        },
    });
}
