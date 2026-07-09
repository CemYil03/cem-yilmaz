import { tool } from 'ai';
import { mediaChannelUpsert } from '../commands/mediaChannelUpsert';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { GqlSMediaChannelInputSchema } from '../graphql/generated';
import type { GqlSMediaChannelInput, GqlSSession } from '../graphql/generated';
import type { MediaAgentMutationLog } from './agentPersonalAssistantMedia';
import { requireAdminUserId } from './requireAdminUserId';

// Create or edit a favourite YouTube / Twitch / podcast / other channel. The
// input schema is the generated `GqlSMediaChannelInputSchema()` — same shape
// the GraphQL resolver validates. Gemini-safe: no `DateTime` fields. See
// `docs/architecture/agent-delegation.md`. The `rawInput as GqlSMediaChannelInput`
// cast is the standard workaround for the codegen's `Properties<T>` phantom
// (see `toolTripUpsert.ts` for the same pattern).

interface MediaAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: MediaAgentMutationLog;
}

export function toolMediaChannelUpsert({ serverRuntime, session, mutations }: MediaAgentMutationContext) {
    return tool({
        description: [
            'Create or edit a favourite YouTube / Twitch / podcast / other channel.',
            'For NEW channels, omit `channelId` — the server allocates one and appends the row to the bottom of',
            'every topic section. For an EDIT, pass the id from the snapshot or a prior `mediaChannelsList` call.',
            '`topics` is the clustering axis — cluster tags like `tech`, `ai`, `movieCritic`, `entertainment`. A',
            'channel can carry multiple tags; e.g. a tech YouTuber who also reviews films. `/workspace/software` reads',
            'channels tagged `tech`, so keep the vocabulary consistent (see the snapshot). `platform` is one of',
            '`youtube | twitch | podcast | other`.',
        ].join(' '),
        inputSchema: GqlSMediaChannelInputSchema(),
        execute: async (rawInput) => {
            const input = rawInput as GqlSMediaChannelInput;
            const result = await mediaChannelUpsert(requireAdminUserId(session), { input }, session, serverRuntime);
            mutations.push({
                kind: input.channelId ? 'mediaChannelUpdate' : 'mediaChannelAdd',
                id: result.channelId,
                title: result.name,
            });
            return result;
        },
    });
}
