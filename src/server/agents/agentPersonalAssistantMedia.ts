import type { GenerateTextOnStepEndCallback } from 'ai';
import { ToolLoopAgent, isStepCount } from 'ai';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import { ADMIN_CHAT_MODEL_FALLBACK_ID } from './adminChatModels';
import { googleAgentProviderOptionsFor, currentDateForAgent } from './agentScaffolding';
import { mediaSnapshotForAgent } from './mediaSnapshotForAgent';
import { toolMediaChannelDelete } from './toolMediaChannelDelete';
import { toolMediaChannelUpsert } from './toolMediaChannelUpsert';
import { toolMediaChannelsList } from './toolMediaChannelsList';
import { toolMovieAddFromTmdb } from './toolMovieAddFromTmdb';
import { toolMovieDelete } from './toolMovieDelete';
import { toolMovieMarkWatched } from './toolMovieMarkWatched';
import { toolMovieUpsert } from './toolMovieUpsert';
import { toolMoviesList } from './toolMoviesList';
import { toolTmdbSearch } from './toolTmdbSearch';
import { toolYoutubeSearch } from './toolYoutubeSearch';

// Media domain sub-agent under the orchestrator pattern documented in
// `docs/architecture/agent-delegation.md`. Runs in-process inside
// `toolDelegateToMedia`'s `execute`, receives an `onStepEnd` from the
// delegate tool, and returns a final text (or `needsMoreInfo` / `noOp` JSON
// sentinel) plus a structured `mutations` log.
//
// Same rules as `agentPersonalAssistantProjects`: no `promptUserForInput`
// (the orchestrator owns the back-and-forth), no `chatId` visibility, the
// mutation log stays closure-shared with the delegate tool.

type MediaAgentMutationKind =
    'movieAdd' | 'movieUpdate' | 'movieMarkWatched' | 'movieDelete' | 'mediaChannelAdd' | 'mediaChannelUpdate' | 'mediaChannelDelete';

export interface MediaAgentMutation {
    kind: MediaAgentMutationKind;
    // Movie id or channel id depending on `kind`.
    id: string;
    // Best-effort label for the orchestrator's user-facing narration.
    title?: string;
}

export type MediaAgentMutationLog = MediaAgentMutation[];

export interface MediaAgentOptions {
    session: GqlSSession;
    serverRuntime: ServerRuntime;
    mutations: MediaAgentMutationLog;
    onStepEnd?: GenerateTextOnStepEndCallback<any>;
}

function buildSystemPrompt(snapshot: string): string {
    return [
        "You are the media sub-agent inside Cem's personal workspace. You handle every ask that touches his movie",
        'watchlist and his favourite YouTube / podcast / Twitch channels. Your tools mutate the workspace DB —',
        'only use them when the user has unambiguously asked you to change something. Each tool carries its own',
        'description of when to reach for it and how its inputs are shaped; the cross-tool workflow rules below',
        'are the only tool guidance you need beyond those descriptions.',
        '',
        currentDateForAgent(),
        '',
        'Rules:',
        '- Reply in the language the user wrote in (German or English).',
        '- Be concise: your final text becomes the orchestrator narration to Cem. One or two sentences.',
        '- Never invent an id. Use ids from the snapshot below, from a tool result earlier in this turn, or a',
        '  TMDB id returned by `tmdbSearch`.',
        '- For "I want to watch X": call `tmdbSearch` first, pick the best match by title + year, then',
        '  `movieAddFromTmdb`. If TMDB returns nothing, fall back to `movieUpsert` with a manual title.',
        '- For "I watched X": if X is already in the library, call `movieMarkWatched`. If not, add it first with',
        '  `movieAddFromTmdb` (status: `watched`) and then `movieMarkWatched` in the same turn.',
        '- For "add YouTube channel X" / "favourite X": call `youtubeSearch` first, pick the best match, then',
        '  `mediaChannelUpsert` with `platform: youtube` and the returned fields (`canonicalUrl` → `url`,',
        '  `handle`, `avatarUrl`, and the title → `name`). Ask Cem for topics if he did not name any.',
        '- If the request is missing information you genuinely need, do NOT guess. Return EXACTLY this JSON as your',
        '  final text, nothing else:',
        '  {"status":"needsMoreInfo","missingFields":["..."],"summary":"..."}',
        "- If the request asks for something outside the movies / channels surface (e.g. 'add a task', 'log a workout'),",
        '  return the same JSON with status `noOp` and an empty `missingFields` array.',
        '',
        'Current media snapshot (refreshed at the start of this turn):',
        '',
        snapshot,
    ].join('\n');
}

export async function agentPersonalAssistantMedia({ session, serverRuntime, mutations, onStepEnd }: MediaAgentOptions) {
    const snapshot = await mediaSnapshotForAgent(serverRuntime);
    const readContext = { serverRuntime, session };
    const mutationContext = { serverRuntime, session, mutations };
    const modelId = ADMIN_CHAT_MODEL_FALLBACK_ID;
    return new ToolLoopAgent({
        model: serverRuntime.ai.userConversationModel(modelId),
        onStepEnd,
        providerOptions: googleAgentProviderOptionsFor(modelId),
        // Same tight ceiling as the projects sub-agent. A single delegation
        // is usually: `tmdbSearch` + `movieAddFromTmdb` + final text = 3
        // steps; the ceiling absorbs a fallback + one extra probe.
        stopWhen: [isStepCount(10)],
        instructions: buildSystemPrompt(snapshot),
        tools: {
            moviesList: toolMoviesList(readContext),
            mediaChannelsList: toolMediaChannelsList(readContext),
            tmdbSearch: toolTmdbSearch(readContext),
            youtubeSearch: toolYoutubeSearch(readContext),
            movieAddFromTmdb: toolMovieAddFromTmdb(mutationContext),
            movieUpsert: toolMovieUpsert(mutationContext),
            movieMarkWatched: toolMovieMarkWatched(mutationContext),
            movieDelete: toolMovieDelete(mutationContext),
            mediaChannelUpsert: toolMediaChannelUpsert(mutationContext),
            mediaChannelDelete: toolMediaChannelDelete(mutationContext),
        },
    });
}
