import { tool } from 'ai';
import { z } from 'zod';
import { showUpsert } from '../commands/showUpsert';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { GqlSMovieStatusSchema } from '../graphql/generated';
import type { GqlSSession } from '../graphql/generated';
import type { MediaAgentMutationLog } from './agentPersonalAssistantMedia';
import { requireAdminUserId } from './requireAdminUserId';

const showUpsertInputSchema = z.object({
    showId: z.uuid().nullish().describe('Omit (or null) to create a new series. Pass an existing id to edit.'),
    title: z.string().min(1).max(300).describe('Series title.'),
    tmdbId: z.number().int().min(1).nullish().describe('Optional TMDB TV reference id.'),
    posterUrl: z.url().nullish().describe('Poster image URL. Typically from TMDB.'),
    backdropUrl: z.url().nullish(),
    firstAirDate: z.string().nullish().describe('ISO date `YYYY-MM-DD`. Optional.'),
    overview: z.string().max(4000).nullish(),
    status: GqlSMovieStatusSchema.describe('watchlist | watching | watched | dropped'),
    rating: z.number().int().min(1).max(10).nullish().describe("Cem's rating out of 10."),
    notes: z.string().max(4000).nullish(),
    topics: z.array(z.string()).describe('Free-form genre / cluster tags. Empty array if none.'),
    isCompleted: z.boolean().describe('True when the series has ended (no more seasons expected).'),
    nextSeasonReleaseDate: z
        .string()
        .nullish()
        .describe('Exact next-season air date as ISO `YYYY-MM-DD`. Clear when `isCompleted` is true.'),
    nextSeasonReleaseRough: z
        .string()
        .max(120)
        .nullish()
        .describe('Rough next-season timing when exact date is unknown, e.g. "Fall 2026" or "Q3 2027".'),
});

interface MediaAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: MediaAgentMutationLog;
}

export function toolShowUpsert({ serverRuntime, session, mutations }: MediaAgentMutationContext) {
    return tool({
        description: [
            'Create or edit a TV series directly. For NEW series, prefer `showAddFromTmdb` — it auto-fills poster,',
            'first-air date, overview, completed flag and next-season date from TMDB. Use this tool for: (a) edits',
            'to an existing row (rating, notes, topics, completed / next-season fields), (b) manual entries when',
            'TMDB has no match.',
        ].join(' '),
        inputSchema: showUpsertInputSchema,
        execute: async (input) => {
            const result = await showUpsert(
                requireAdminUserId(session),
                {
                    input: {
                        showId: input.showId ?? null,
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
                        isCompleted: input.isCompleted,
                        nextSeasonReleaseDate: input.nextSeasonReleaseDate ?? null,
                        nextSeasonReleaseRough: input.nextSeasonReleaseRough ?? null,
                    },
                },
                session,
                serverRuntime,
            );
            mutations.push({
                kind: input.showId ? 'showUpdate' : 'showAdd',
                id: result.showId,
                title: result.title,
            });
            return result;
        },
    });
}
