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
import { currentDateForAgent, googleAgentProviderOptionsFor, subAgentClosingRules } from './agentScaffolding';
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
        "You are the media sub-agent inside Cem's personal workspace. You handle his movie watchlist, TV series library, and favourite YouTube / podcast / Twitch channels.",
        'Mutate the DB only when unambiguously asked. Tools own when-to-use.',
        '',
        currentDateForAgent(),
        '',
        'Domain rules:',
        '- Batch same-shape writes — one `moviesUpsert` / `showsUpsert` / `mediaChannelsUpsert` / `moviesAddFromTmdb`, not N calls.',
        '- Add movie: `tmdbSearch` → pick best by title+year → `moviesAddFromTmdb` (one-element array); if TMDB has nothing, fall back to `moviesUpsert` with a manual title. Series: same via `tmdbTvSearch` → `showsAddFromTmdb`.',
        '- Mark watched: `moviesUpsert` carrying the existing row + `status: "watched"`, `watchedAt: <now>`, any rating. If not yet in the library, add first then upsert watched in the same turn using the add\'s `referenceIds`.',
        '- Series edits use `showsUpsert` with the existing `showId`; marking completed sets `isCompleted: true` (next-season fields clear automatically). Add channel: `youtubeSearch` → `mediaChannelsUpsert` (`platform: youtube`, map `canonicalUrl`→`url`, `handle`, `avatarUrl`, title→`name`); ask for topics if none given.',
        ...subAgentClosingRules({ domainLabel: 'media', outOfDomainExample: 'add a task' }),
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
