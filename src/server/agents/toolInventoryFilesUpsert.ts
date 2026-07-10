import { tool } from 'ai';
import { z } from 'zod';
import { itemFilesUpsert } from '../commands/itemFilesUpsert';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { GqlSItemFileUpsertSchema } from '../graphql/generated';
import type { GqlSItemFileUpsert, GqlSSession } from '../graphql/generated';
import type { InventoryAgentMutationLog } from './agentPersonalAssistantInventory';
import { requireAdminUserId } from './requireAdminUserId';

// Edit-only update of item-file rows (rename / pin toggle). Each row is
// `GqlSItemFileUpsertSchema()` — the same shape the resolver validates, no date
// fields so Gemini-safe. This tool NEVER creates file rows: attaching a new
// file requires uploading bytes via `POST /api/file-uploads` first, which a
// chat sub-agent cannot do — the agent's system prompt tells it to point Cem
// at the item detail page to upload. See
// `docs/features/workspace-inventory.md` (Assistant integration).
const toolInventoryFilesUpsertInputSchema = z.object({
    itemFiles: z.array(GqlSItemFileUpsertSchema()).min(1),
});

interface InventoryAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: InventoryAgentMutationLog;
}

export function toolInventoryFilesUpsert({ serverRuntime, session, mutations }: InventoryAgentMutationContext) {
    return tool({
        description: [
            'Edit existing item-file rows — rename a file (`label`) or pin / unpin it (`pinned`). This does NOT attach',
            'new files: uploading bytes happens on the item detail page, not from chat, so if Cem wants to add a',
            'receipt / manual / photo, tell him to open the item and use its Files section. Every input targets an',
            'existing row by `itemFileId`.',
        ].join(' '),
        inputSchema: toolInventoryFilesUpsertInputSchema,
        execute: async (rawInput) => {
            const inputs = rawInput.itemFiles as GqlSItemFileUpsert[];
            const result = await itemFilesUpsert(requireAdminUserId(session), inputs, session, serverRuntime);
            for (const file of inputs) mutations.push({ kind: 'fileEdit', id: file.itemFileId, title: file.label ?? undefined });
            return result;
        },
    });
}
