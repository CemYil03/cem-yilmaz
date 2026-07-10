import { tool } from 'ai';
import { z } from 'zod';
import { adminInventoryItemServiceEntriesUpsert } from '../commands/adminInventoryItemServiceEntriesUpsert';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { GqlSAdminInventoryItemServiceEntryInputSchema } from '../graphql/generated';
import type { GqlSAdminInventoryItemServiceEntryInput, GqlSSession } from '../graphql/generated';
import type { InventoryAgentMutationLog } from './agentPersonalAssistantInventory';
import { requireAdminUserId } from './requireAdminUserId';

// Batch create-or-edit of service-log entries (repairs, services,
// replacements) on an item. Each row is `GqlSAdminInventoryItemServiceEntryInputSchema()` —
// the same shape the resolver validates. Gemini-safe: the only date fields
// (`performedAt` / `nextDueAt`) are `Date` scalars the codegen emits as
// `z.string()`, not `DateTime` (`z.date()`), so no hand-built duplicate is
// needed. See `docs/architecture/agent-delegation.md#tool-input-schemas`.
const toolInventoryServiceEntriesUpsertInputSchema = z.object({
    itemServiceEntries: z.array(GqlSAdminInventoryItemServiceEntryInputSchema()).min(1),
});

interface InventoryAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: InventoryAgentMutationLog;
}

export function toolInventoryServiceEntriesUpsert({ serverRuntime, session, mutations }: InventoryAgentMutationContext) {
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
            const result = await adminInventoryItemServiceEntriesUpsert(requireAdminUserId(session), inputs, session, serverRuntime);
            const referenceIds = result.referenceIds ?? [];
            inputs.forEach((entry, index) => {
                mutations.push({
                    kind: 'serviceEntryUpsert',
                    id: referenceIds[index] ?? entry.serviceEntryId ?? '',
                    title: entry.kind,
                });
            });
            return result;
        },
    });
}
