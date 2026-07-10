import { tool } from 'ai';
import { z } from 'zod';
import { adminMediaShowsAddFromTmdb } from '../commands/adminMediaShowsAddFromTmdb';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { GqlSAdminMediaMovieStatusSchema } from '../graphql/generated';
import type { GqlSSession, GqlSAdminMediaShowAddFromTmdbInput } from '../graphql/generated';
import type { MediaAgentMutationLog } from './agentPersonalAssistantMedia';
import { requireAdminUserId } from './requireAdminUserId';

const showAddItemSchema = z.object({
    tmdbId: z.number().int().min(1).describe('TMDB TV id, from an earlier `tmdbTvSearch` result.'),
    status: GqlSAdminMediaMovieStatusSchema.optional().describe(
        'Starting status for the new series. Defaults to `watchlist`. Use `watching` when Cem is mid-season.',
    ),
});

const toolShowsAddFromTmdbInputSchema = z.object({
    inputs: z.array(showAddItemSchema).min(1).describe('One or more TMDB series to add. Batch a whole set of adds into one call.'),
});

interface MediaAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: MediaAgentMutationLog;
}

export function toolShowsAddFromTmdb({ serverRuntime, session, mutations }: MediaAgentMutationContext) {
    return tool({
        description: [
            'Batch add TV series to the library by TMDB id (poster, first-air date, overview, completed flag, and',
            'best-effort next-season date auto-filled). Preferred add path over `showsUpsert`. If a series with the',
            'same `tmdbId` already exists, this refreshes metadata without duplicating and returns that same row.',
            'Returns `referenceIds` (the resolved show ids) in input order.',
        ].join(' '),
        inputSchema: toolShowsAddFromTmdbInputSchema,
        execute: async (input) => {
            const inputs: GqlSAdminMediaShowAddFromTmdbInput[] = input.inputs.map((entry) => ({
                tmdbId: entry.tmdbId,
                status: entry.status ?? null,
            }));
            const result = await adminMediaShowsAddFromTmdb(requireAdminUserId(session), inputs, session, serverRuntime);
            const referenceIds = result.referenceIds ?? [];
            input.inputs.forEach((_entry, index) => {
                mutations.push({ kind: 'showAdd', id: referenceIds[index] ?? '' });
            });
            return result;
        },
    });
}
