import { tool } from 'ai';
import { z } from 'zod';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';

const tmdbTvSearchInputSchema = z.object({
    query: z.string().min(1).max(200).describe('Free-form TV series title. TMDB matches loosely, but a year in the query narrows results.'),
});

interface MediaAgentReadContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
}

export function toolTmdbTvSearch({ serverRuntime }: MediaAgentReadContext) {
    return tool({
        description: [
            'Search The Movie Database (TMDB) for a TV series by title. Returns up to 10 results with `tmdbId`,',
            'title, first-air date, poster URL, and short overview. Use this BEFORE `showAddFromTmdb` when Cem',
            'names a series he has not tracked yet — feed the chosen `tmdbId` into that tool. Empty results mean',
            'no match, no TMDB key, or TMDB is unreachable; in all three cases fall back to `showUpsert` with a',
            'manual title.',
        ].join(' '),
        inputSchema: tmdbTvSearchInputSchema,
        execute: async (input) => {
            return serverRuntime.tmdb.searchTv(input.query);
        },
    });
}
