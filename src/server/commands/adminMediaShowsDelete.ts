import { tool } from 'ai';
import { inArray } from 'drizzle-orm';
import { z } from 'zod';
import { requireAdminUserId } from '../agents/requireAdminUserId';
import { shows } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Batch delete of TV series. `referenceIds` echoes the deleted ids in input
// order — a caller-supplied id that never existed makes the batch throw
// (same posture as the singular delete had).
export async function adminMediaShowsDelete(
    userId: string,
    showIds: readonly string[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const deleted = await serverRuntime.db
            .delete(shows)
            .where(inArray(shows.showId, showIds as string[]))
            .returning({ showId: shows.showId });
        if (deleted.length !== showIds.length) {
            const found = new Set(deleted.map((row) => row.showId));
            const missing = showIds.filter((id) => !found.has(id));
            throw new Error(`adminMediaShowsDelete: rows not found: ${missing.join(', ')}`);
        }
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: [...showIds] };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}

const toolShowsDeleteInputSchema = z.object({
    showIds: z.array(z.uuid()).min(1).describe('Ids of the series to delete.'),
});

interface MediaAgentToolContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
}

export function toolShowsDelete({ serverRuntime, session }: MediaAgentToolContext) {
    return tool({
        description: 'Permanently delete one or more TV series from the library. Irreversible — confirm intent before calling.',
        inputSchema: toolShowsDeleteInputSchema,
        execute: async (input) => {
            return adminMediaShowsDelete(requireAdminUserId(session), input.showIds, session, serverRuntime);
        },
    });
}
