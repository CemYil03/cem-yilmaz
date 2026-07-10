import { tool } from 'ai';
import { z } from 'zod';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import { adminInventoryItemFindMany } from '../queries/adminInventoryItemFindMany';

// Full item read tool. The system-prompt snapshot already lists every OWNED
// item with its current value, condition, warranty, and id inline; use this
// only when the snapshot is not enough — most importantly to reach DISPOSED
// rows (sold / gifted / lost / disposed), which the snapshot omits, by passing
// `includeDisposed: true`.

const inventoryItemsListInputSchema = z.object({
    includeDisposed: z
        .boolean()
        .describe('Pass true to include sold / gifted / lost / disposed items. Default false lists only currently-owned items.'),
});

interface InventoryAgentReadContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
}

export function toolInventoryItemsList({ serverRuntime, session }: InventoryAgentReadContext) {
    return tool({
        description: [
            'List tracked items with fully hydrated fields. Use only when the snapshot in the system prompt is not',
            'enough — most importantly to see DISPOSED items (sold / gifted / lost / disposed) by passing',
            '`includeDisposed: true`, since the snapshot lists owned items only.',
        ].join(' '),
        inputSchema: inventoryItemsListInputSchema,
        execute: async (input) => {
            return adminInventoryItemFindMany(input.includeDisposed, session, serverRuntime);
        },
    });
}
