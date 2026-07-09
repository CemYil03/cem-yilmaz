import { tool } from 'ai';
import { z } from 'zod';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import { adminMediaMovieFindMany } from '../queries/adminMediaMovieFindMany';

// Read tool for `agentPersonalAssistantMedia`. Thin wrapper around
// `movieList` — same data the media page renders. The system prompt already
// embeds a compact snapshot (see `mediaSnapshotForAgent.ts`); use this when
// the sub-agent needs the full row for a specific movie (notes, overview,
// runtime).

const moviesListInputSchema = z.object({
    status: z
        .enum(['watchlist', 'watching', 'watched', 'dropped'])
        .optional()
        .describe('Narrow to a single status bucket. Omit to list every bucket.'),
});

interface MediaAgentReadContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
}

export function toolMoviesList({ serverRuntime, session }: MediaAgentReadContext) {
    return tool({
        description: [
            'List movies with full metadata (poster, overview, runtime, rating, notes).',
            'Use only when the system-prompt snapshot is not enough — typically when Cem asks about the overview',
            'or notes of a specific movie. For "what am I planning to watch?" the snapshot already answers.',
        ].join(' '),
        inputSchema: moviesListInputSchema,
        execute: async (input) => {
            const rows = await adminMediaMovieFindMany(session, serverRuntime);
            return input.status ? rows.filter((r) => r.status === input.status) : rows;
        },
    });
}
