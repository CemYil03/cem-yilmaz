import { tool } from 'ai';
import { z } from 'zod';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';

// Live TMDB search for the media sub-agent. Same underlying client the
// GraphQL `Admin.media.tmdbSearch` resolver uses. Empty result on missing
// key or TMDB outage — the sub-agent handles that by falling back to
// `movieUpsert` with a manual title.

const tmdbSearchInputSchema = z.object({
    query: z.string().min(1).max(200).describe('Free-form movie title. TMDB matches loosely, but a year in the query narrows results.'),
});

interface MediaAgentReadContext {
    serverRuntime: ServerRuntime;
    // Session is unused here (TMDB is a stateless third-party read), but the
    // read-context shape is uniform across every media tool so the call site
    // in `agentPersonalAssistantMedia` stays symmetric.
    session: GqlSSession;
}

export function toolTmdbSearch({ serverRuntime }: MediaAgentReadContext) {
    return tool({
        description: [
            'Search The Movie Database (TMDB) for a movie by title. Returns up to 10 results with `tmdbId`, title,',
            'release date, poster URL, and short overview. Use this BEFORE `movieAddFromTmdb` when Cem names a',
            'film he has not tracked yet — feed the chosen `tmdbId` into that tool. Empty results mean no match,',
            'no TMDB key, or TMDB is unreachable; in all three cases fall back to `movieUpsert` with a manual',
            'title.',
        ].join(' '),
        inputSchema: tmdbSearchInputSchema,
        execute: async (input) => {
            return serverRuntime.tmdb.searchMovies(input.query);
        },
    });
}
