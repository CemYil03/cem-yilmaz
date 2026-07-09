import { tool } from 'ai';
import { z } from 'zod';
import { showAddFromTmdb } from '../commands/showAddFromTmdb';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { GqlSMovieStatusSchema } from '../graphql/generated';
import type { GqlSSession } from '../graphql/generated';
import type { MediaAgentMutationLog } from './agentPersonalAssistantMedia';
import { requireAdminUserId } from './requireAdminUserId';

const showAddFromTmdbInputSchema = z.object({
    tmdbId: z.number().int().min(1).describe('TMDB TV id, from an earlier `tmdbTvSearch` result.'),
    status: GqlSMovieStatusSchema.optional().describe(
        'Starting status for the new series. Defaults to `watchlist`. Use `watching` when Cem is mid-season.',
    ),
});

interface MediaAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: MediaAgentMutationLog;
}

export function toolShowAddFromTmdb({ serverRuntime, session, mutations }: MediaAgentMutationContext) {
    return tool({
        description: [
            'Add a TV series to the library by TMDB id (poster, first-air date, overview, completed flag, and',
            'best-effort next-season date auto-filled). Preferred add path over `showUpsert`. If a series with',
            'the same `tmdbId` already exists, this refreshes metadata without duplicating and returns that same',
            'row.',
        ].join(' '),
        inputSchema: showAddFromTmdbInputSchema,
        execute: async (input) => {
            const result = await showAddFromTmdb(
                requireAdminUserId(session),
                { tmdbId: input.tmdbId, status: input.status ?? null },
                session,
                serverRuntime,
            );
            mutations.push({ kind: 'showAdd', id: result.showId, title: result.title });
            return result;
        },
    });
}
