import { tool } from 'ai';
import { inArray } from 'drizzle-orm';
import { z } from 'zod';
import { requireAdminUserId } from '../agents/requireAdminUserId';
import { itemFiles } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Batch remove of item ↔ upload joins. The underlying `FileUploads` rows are
// preserved (same posture as `adminProjectFilesDelete`) — the upload belongs to the
// user, not the item. `referenceIds` echoes the deleted ids in input order; a
// caller-supplied id that never existed makes the batch throw.
export async function adminInventoryItemFilesDelete(
    userId: string,
    itemFileIds: readonly string[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const deleted = await serverRuntime.db
            .delete(itemFiles)
            .where(inArray(itemFiles.itemFileId, itemFileIds as string[]))
            .returning({ itemFileId: itemFiles.itemFileId });
        if (deleted.length !== itemFileIds.length) {
            const found = new Set(deleted.map((row) => row.itemFileId));
            const missing = itemFileIds.filter((id) => !found.has(id));
            throw new Error(`adminInventoryItemFilesDelete: rows not found: ${missing.join(', ')}`);
        }
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: [...itemFileIds] };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}

const toolInventoryFilesDeleteInputSchema = z.object({
    itemFileIds: z
        .array(z.uuid())
        .min(1)
        .describe('AdminInventoryItem-file row ids to detach. Removes the link only; the uploaded file itself is kept.'),
});

interface InventoryAgentToolContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
}

export function toolInventoryFilesDelete({ serverRuntime, session }: InventoryAgentToolContext) {
    return tool({
        description: [
            'Detach one or more files from an item — removes the link between the item and the uploaded file. The',
            'upload itself is preserved (it belongs to Cem). Use when he wants a receipt / manual / photo removed from',
            'an item.',
        ].join(' '),
        inputSchema: toolInventoryFilesDeleteInputSchema,
        execute: async (input) => {
            return adminInventoryItemFilesDelete(requireAdminUserId(session), input.itemFileIds, session, serverRuntime);
        },
    });
}
