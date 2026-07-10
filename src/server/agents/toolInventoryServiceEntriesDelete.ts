import { tool } from 'ai';
import { z } from 'zod';
import { adminInventoryItemServiceEntriesDelete } from '../commands/adminInventoryItemServiceEntriesDelete';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import type { InventoryAgentMutationLog } from './agentPersonalAssistantInventory';
import { requireAdminUserId } from './requireAdminUserId';

const toolInventoryServiceEntriesDeleteInputSchema = z.object({
    serviceEntryIds: z.array(z.uuid()).min(1).describe('Service-log entry ids to permanently delete.'),
});

interface InventoryAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: InventoryAgentMutationLog;
}

export function toolInventoryServiceEntriesDelete({ serverRuntime, session, mutations }: InventoryAgentMutationContext) {
    return tool({
        description:
            'Permanently delete one or more service-log entries. Use when Cem asks to remove a repair / service record he no longer wants.',
        inputSchema: toolInventoryServiceEntriesDeleteInputSchema,
        execute: async (input) => {
            const result = await adminInventoryItemServiceEntriesDelete(
                requireAdminUserId(session),
                input.serviceEntryIds,
                session,
                serverRuntime,
            );
            for (const serviceEntryId of input.serviceEntryIds) mutations.push({ kind: 'serviceEntryDelete', id: serviceEntryId });
            return result;
        },
    });
}
