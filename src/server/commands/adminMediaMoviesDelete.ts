import { tool } from 'ai';
import { inArray } from 'drizzle-orm';
import { z } from 'zod';
import { requireAdminUserId } from '../agents/requireAdminUserId';
import { movies } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Batch delete of movies. `referenceIds` echoes the deleted ids in input
// order — a caller-supplied id that never existed makes the batch throw
// (same posture as the singular delete had).
export async function adminMediaMoviesDelete(
    userId: string,
    movieIds: readonly string[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const deleted = await serverRuntime.db
            .delete(movies)
            .where(inArray(movies.movieId, movieIds as string[]))
            .returning({ movieId: movies.movieId });
        if (deleted.length !== movieIds.length) {
            const found = new Set(deleted.map((row) => row.movieId));
            const missing = movieIds.filter((id) => !found.has(id));
            throw new Error(`adminMediaMoviesDelete: rows not found: ${missing.join(', ')}`);
        }
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: [...movieIds] };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}

const toolMoviesDeleteInputSchema = z.object({
    movieIds: z.array(z.uuid()).min(1).describe('AdminMediaMovie row ids to delete.'),
});

interface MediaAgentToolContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
}

export function toolMoviesDelete({ serverRuntime, session }: MediaAgentToolContext) {
    return tool({
        description:
            'Permanently delete one or more movies from the library. There is no soft-delete. Prefer `moviesUpsert` with `status: dropped` if Cem is only losing interest.',
        inputSchema: toolMoviesDeleteInputSchema,
        execute: async (input) => {
            return adminMediaMoviesDelete(requireAdminUserId(session), input.movieIds, session, serverRuntime);
        },
    });
}
