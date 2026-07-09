import { tool } from 'ai';
import { z } from 'zod';
import { showsUpsert } from '../commands/showsUpsert';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { GqlSShowInputSchema } from '../graphql/generated';
import type { GqlSSession, GqlSShowInput } from '../graphql/generated';
import type { MediaAgentMutationLog } from './agentPersonalAssistantMedia';
import { requireAdminUserId } from './requireAdminUserId';

// Batch create-or-edit of TV series. Each row is `GqlSShowInputSchema()` —
// same shape the resolver validates against. Gemini-safe because `ShowInput`
// uses `Date` scalars (codegen emits `z.string()`) and no `DateTime` fields.
const toolShowsUpsertInputSchema = z.object({
    shows: z.array(GqlSShowInputSchema()).min(1),
});

interface MediaAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: MediaAgentMutationLog;
}

export function toolShowsUpsert({ serverRuntime, session, mutations }: MediaAgentMutationContext) {
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
            const inputs = rawInput.shows as GqlSShowInput[];
            const result = await showsUpsert(requireAdminUserId(session), inputs, session, serverRuntime);
            const referenceIds = result.referenceIds ?? [];
            inputs.forEach((show, index) => {
                mutations.push({
                    kind: show.showId ? 'showUpdate' : 'showAdd',
                    id: referenceIds[index] ?? show.showId ?? '',
                    title: show.title,
                });
            });
            return result;
        },
    });
}
