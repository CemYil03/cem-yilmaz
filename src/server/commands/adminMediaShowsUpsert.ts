import { tool } from 'ai';
import { eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { requireAdminUserId } from '../agents/requireAdminUserId';
import { shows } from '../db/schema';
import type { AdminMediaShowCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { GqlSAdminMediaShowInputSchema } from '../graphql/generated';
import type { GqlSAdminMediaShowInput, GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Batch upsert of TV series. Every input with a `showId` is updated; every
// input without one is inserted under a freshly-minted UUID. The whole batch
// runs inside a single transaction so a partial failure rolls back to zero
// writes. `referenceIds` echoes the id per input row (in input order). When
// `isCompleted` is true, next-season date fields are cleared so a finished
// show never carries a stale "next season" hint.
export async function adminMediaShowsUpsert(
    userId: string,
    inputs: readonly GqlSAdminMediaShowInput[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    const now = new Date();

    // Phase 1 — payload construction.
    const rows = inputs.map((input) => {
        const showId = input.showId ?? crypto.randomUUID();
        const isCompleted = input.isCompleted;
        const payload: AdminMediaShowCreate = {
            showId,
            title: input.title,
            tmdbId: input.tmdbId ?? null,
            posterUrl: input.posterUrl ?? null,
            backdropUrl: input.backdropUrl ?? null,
            firstAirDate: input.firstAirDate ?? null,
            overview: input.overview ?? null,
            status: input.status,
            rating: input.rating ?? null,
            notes: input.notes ?? null,
            topics: input.topics,
            isCompleted,
            nextSeasonReleaseDate: isCompleted ? null : (input.nextSeasonReleaseDate ?? null),
            nextSeasonReleaseRough: isCompleted ? null : (input.nextSeasonReleaseRough ?? null),
            updatedAt: now,
        };
        return { showId, isUpdate: Boolean(input.showId), payload };
    });

    // Phase 2 — transactional execution.
    try {
        const updateIds = rows.filter((row) => row.isUpdate).map((row) => row.showId);
        await serverRuntime.db.transaction(async (transaction) => {
            if (updateIds.length > 0) {
                const existing = await transaction.select({ showId: shows.showId }).from(shows).where(inArray(shows.showId, updateIds));
                if (existing.length !== updateIds.length) {
                    const found = new Set(existing.map((row) => row.showId));
                    const missing = updateIds.filter((id) => !found.has(id));
                    throw new Error(`adminMediaShowsUpsert: rows not found: ${missing.join(', ')}`);
                }
            }
            for (const row of rows) {
                if (row.isUpdate) {
                    await transaction.update(shows).set(row.payload).where(eq(shows.showId, row.showId));
                } else {
                    await transaction.insert(shows).values(row.payload);
                }
            }
        });
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: rows.map((row) => row.showId) };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}

// Batch create-or-edit of TV series. Each row is `GqlSAdminMediaShowInputSchema()` —
// same shape the resolver validates against. Gemini-safe because `AdminMediaShowInput`
// uses `Date` scalars (codegen emits `z.string()`) and no `DateTime` fields.
const toolShowsUpsertInputSchema = z.object({
    shows: z.array(GqlSAdminMediaShowInputSchema()).min(1),
});

interface MediaAgentToolContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
}

export function toolShowsUpsert({ serverRuntime, session }: MediaAgentToolContext) {
    return tool({
        description: [
            'Batch create-or-edit of TV series. For NEW series, prefer `showsAddFromTmdb` — it auto-fills poster,',
            'first-air date, overview, completed flag and next-season date from TMDB. Use this tool for: (a) edits',
            'to existing rows (rating, notes, topics, completed / next-season fields), (b) manual entries when TMDB',
            'has no match. Every row with a `showId` is updated; every row without one is inserted. When marking a',
            'series completed, set `isCompleted: true` (next-season fields clear automatically). Batch same-shape',
            'writes into one call. Returns `referenceIds` in input order.',
        ].join(' '),
        inputSchema: toolShowsUpsertInputSchema,
        execute: async (rawInput) => {
            const inputs = rawInput.shows as GqlSAdminMediaShowInput[];
            return adminMediaShowsUpsert(requireAdminUserId(session), inputs, session, serverRuntime);
        },
    });
}
