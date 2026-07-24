import type { GenerateTextOnStepEndCallback } from 'ai';
import { isStepCount, ToolLoopAgent } from 'ai';
import { toolMediaChannelsDelete } from '../commands/adminMediaChannelsDelete';
import { toolMediaChannelsUpsert } from '../commands/adminMediaChannelsUpsert';
import { toolMoviesAddFromTmdb } from '../commands/adminMediaMoviesAddFromTmdb';
import { toolMoviesDelete } from '../commands/adminMediaMoviesDelete';
import { toolMoviesUpsert } from '../commands/adminMediaMoviesUpsert';
import { toolShowsAddFromTmdb } from '../commands/adminMediaShowsAddFromTmdb';
import { toolShowsDelete } from '../commands/adminMediaShowsDelete';
import { toolShowsUpsert } from '../commands/adminMediaShowsUpsert';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import { ADMIN_CHAT_MODEL_FALLBACK_ID } from './adminChatModels';
import { currentDateForAgent, googleAgentProviderOptionsFor } from './agentScaffolding';
import { mediaSnapshotForAgent } from './mediaSnapshotForAgent';
import { toolMediaChannelsList } from './toolMediaChannelsList';
import { toolMoviesList } from './toolMoviesList';
import { toolShowsList } from './toolShowsList';
import { toolTmdbSearch } from './toolTmdbSearch';
import { toolTmdbTvSearch } from './toolTmdbTvSearch';
import { toolYoutubeSearch } from './toolYoutubeSearch';

// Media domain sub-agent under the orchestrator pattern documented in
// `docs/architecture/agent-delegation.md`. Runs in-process inside
// `toolDelegateToMedia`'s `execute`, receives an `onStepEnd` from the
// delegate tool, and returns a final text (or `needsMoreInfo` / `noOp` JSON
// sentinel). When it creates or changes a row Cem may want to open, it names
// that row's id in its final summary so the orchestrator can deep-link it.
//
// Same rules as `agentPersonalAssistantProjects`: no `promptUserForInput`
// (the orchestrator owns the back-and-forth), no `chatId` visibility.

export interface MediaAgentOptions {
    session: GqlSSession;
    serverRuntime: ServerRuntime;
    onStepEnd?: GenerateTextOnStepEndCallback<any>;
}

function buildSystemPrompt(snapshot: string): string {
    return [
        "You are the media sub-agent inside Cem's personal workspace. You handle every ask that touches his movie",
        'watchlist, his TV series library, and his favourite YouTube / podcast / Twitch channels. Your tools mutate',
        'the workspace DB — only use them when the user has unambiguously asked you to change something. Each tool',
        'carries its own description of when to reach for it and how its inputs are shaped; the cross-tool workflow',
        'rules below are the only tool guidance you need beyond those descriptions.',
        '',
        currentDateForAgent(),
        '',
        'Rules:',
        '- Reply in the language the user wrote in (German or English).',
        '- Be concise: your final text becomes the orchestrator narration to Cem. One or two sentences. When you',
        '  add or change a movie / series / channel Cem may want to open, name its id in your summary so the',
        '  orchestrator can build a deep-link.',
        '- Never invent an id. Use ids from the snapshot below, from a prior tool result’s `referenceIds` (in',
        '  input order) earlier in this turn, or a TMDB id returned by `tmdbSearch` / `tmdbTvSearch`.',
        '- Batch every same-shape write together — one `moviesUpsert` for all of them, not N calls. Same for',
        '  `showsUpsert`, `mediaChannelsUpsert`, and the TMDB adders (one `moviesAddFromTmdb` covers a whole set',
        '  of adds).',
        '- For "I want to watch movie X": call `tmdbSearch` first, pick the best match by title + year, then',
        '  `moviesAddFromTmdb` with a one-element array. If TMDB returns nothing, fall back to `moviesUpsert` with',
        '  a manual title.',
        '- To mark a movie as watched, use `moviesUpsert` with a one-element array carrying the existing row plus',
        '  `status: "watched"`, `watchedAt: <now>`, and any rating. If the movie is not yet in the library, add it',
        '  first with `moviesAddFromTmdb` and then upsert it watched in the same turn (use the `referenceIds` from',
        '  the add).',
        '- For "I want to watch / track series X": call `tmdbTvSearch` first, pick the best match, then',
        '  `showsAddFromTmdb` with a one-element array. If TMDB returns nothing, fall back to `showsUpsert` with a',
        '  manual title.',
        '- For series edits (completed flag, next-season exact/rough date, rating, notes): use `showsUpsert` with',
        '  the existing `showId`. When marking a series completed, set `isCompleted: true` (next-season fields',
        '  clear automatically).',
        '- For "add YouTube channel X" / "favourite X": call `youtubeSearch` first, pick the best match, then',
        '  `mediaChannelsUpsert` with `platform: youtube` and the returned fields (`canonicalUrl` → `url`,',
        '  `handle`, `avatarUrl`, and the title → `name`). Ask Cem for topics if he did not name any.',
        '- If the request is missing information you genuinely need, do NOT guess. Return EXACTLY this JSON as your',
        '  final text, nothing else:',
        '  {"status":"needsMoreInfo","missingFields":["..."],"summary":"..."}',
        "- If the request asks for something outside the movies / series / channels surface (e.g. 'add a task',",
        "  'log a workout'), return the same JSON with status `noOp` and an empty `missingFields` array.",
        '',
        'Current media snapshot (refreshed at the start of this turn):',
        '',
        snapshot,
    ].join('\n');
}

export async function agentPersonalAssistantMedia({ session, serverRuntime, onStepEnd }: MediaAgentOptions) {
    const snapshot = await mediaSnapshotForAgent(serverRuntime);
    const toolContext = { serverRuntime, session };
    const modelId = ADMIN_CHAT_MODEL_FALLBACK_ID;
    return new ToolLoopAgent({
        model: serverRuntime.ai.userConversationModel(modelId),
        onStepEnd,
        providerOptions: googleAgentProviderOptionsFor(modelId),
        // Same tight ceiling as the projects sub-agent. A single delegation
        // is usually: `tmdbSearch` + `moviesAddFromTmdb` + final text = 3
        // steps; the ceiling absorbs a fallback + one extra probe.
        stopWhen: [isStepCount(10)],
        instructions: buildSystemPrompt(snapshot),
        tools: {
            moviesList: toolMoviesList(toolContext),
            showsList: toolShowsList(toolContext),
            mediaChannelsList: toolMediaChannelsList(toolContext),
            tmdbSearch: toolTmdbSearch(toolContext),
            tmdbTvSearch: toolTmdbTvSearch(toolContext),
            youtubeSearch: toolYoutubeSearch(toolContext),
            moviesAddFromTmdb: toolMoviesAddFromTmdb(toolContext),
            moviesUpsert: toolMoviesUpsert(toolContext),
            moviesDelete: toolMoviesDelete(toolContext),
            showsAddFromTmdb: toolShowsAddFromTmdb(toolContext),
            showsUpsert: toolShowsUpsert(toolContext),
            showsDelete: toolShowsDelete(toolContext),
            mediaChannelsUpsert: toolMediaChannelsUpsert(toolContext),
            mediaChannelsDelete: toolMediaChannelsDelete(toolContext),
        },
    });
}
