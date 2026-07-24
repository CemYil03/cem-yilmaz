import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createRequest, useClient } from 'urql';
import { pipe, subscribe } from 'wonka';
import { ChatUpdatesDocument } from '../graphql/generated';
import type { GqlCChatUpdatesSubscription } from '../graphql/generated';

// Owns the live-update state for every concurrent turn on a chat surface.
//
// A "generation" is one in-flight (or just-finished) assistant turn. The hook
// holds a set of them so multiple chats can stream AT THE SAME TIME — the
// workspace user can start a second chat while the first is still generating,
// and each keeps its own SSE listener, appended-message buffer, and streaming
// text buffer. All reads are scoped by `chatId`, so one chat's live rows can
// never bleed into another's (the class of bug the old single-`chatId` hook
// guarded against with a buffer-clear effect no longer exists structurally).
//
// A generation starts UNBOUND (`chatId: null`) — on a fresh send `beginTurn()`
// mints the `generationId` and mounts the listener BEFORE the mutation returns
// the freshly-allocated chatId, so wire deltas (keyed by `generationId`) land
// in the generation's own buffer even before we know which chat they belong
// to. `bindTurn()` attaches it to the chatId once the mutation resolves; from
// then on `appendedMessagesFor(chatId)` surfaces its rows.
//
// Per generation:
// - `appended` — every `ChatUpdateMessageAppended`, keyed by `chatMessageId`.
//   A republished id (e.g. a delegate row swapping `toolResult: null` for the
//   settled batch) replaces the earlier copy in place. See
//   `docs/architecture/agent-delegation.md`.
// - `streaming` — the live text-delta buffer, keyed by the current LLM step's
//   pre-allocated `chatMessageId`. Cleared on `TurnEnded` and on the matching
//   `MessageAppended` (any variant that reused that step id).
// - `reasoning` — Gemini thought-summary buffer (same per-step id key). Cleared
//   from the live map when the matching row appends, and wiped on `TurnEnded`
//   like `streaming` (settled rows already carry `message.reasoning`).
// - `ended` — set on `TurnEnded`. Ended generations keep their `appended` rows
//   but stop contributing to the "still generating" and "current-turn tool
//   call" signals. `forgetChat()` prunes them once authoritative rows are
//   fetched.

type ChatUpdate = GqlCChatUpdatesSubscription['chatUpdates'];
type ChatUpdateMessage = Extract<ChatUpdate, { __typename: 'ChatUpdateMessageAppended' }>['message'];

interface Generation {
    generationId: string;
    /** null until `bindTurn()` attaches the mutation-allocated chatId. */
    chatId: string | null;
    appended: ReadonlyArray<ChatUpdateMessage>;
    streaming: Readonly<Record<string, string>>;
    reasoning: Readonly<Record<string, string>>;
    ended: boolean;
}

// Safety cap so a long-lived surface (the workspace provider persists for the
// whole session) can't accumulate unbounded finished generations if a caller
// forgets to `forgetChat`. Well above any realistic count of concurrent +
// recently-finished turns; oldest ENDED generations are dropped first, never
// an in-flight one.
const MAX_GENERATIONS = 24;

export interface ChatLiveUpdates {
    /** Start a turn. Pass `chatId` for an existing chat; omit for a fresh chat
     *  (the mutation allocates the id — call `bindTurn` once it returns).
     *  Returns the `generationId` to pass to the mutation. */
    beginTurn: (chatId?: string) => string;
    /** Attach an unbound generation to the chatId the mutation allocated. */
    bindTurn: (generationId: string, chatId: string) => void;
    /** Tear down one generation without waiting on `TurnEnded`. Use only when
     *  the kicking-off mutation errors before the server can publish. */
    endTurn: (generationId: string) => void;
    /** Drop this chat's FINISHED generations — call after refetching the chat's
     *  authoritative rows (or dropping the chat) so their live buffers don't
     *  linger. In-flight generations are left running. */
    forgetChat: (chatId: string) => void;

    /** Is a turn in flight for this chat? For `undefined` (a surface whose
     *  chatId isn't allocated yet), true iff an unbound generation exists. */
    isGenerating: (chatId: string | undefined) => boolean;
    /** Live appended rows for this chat (union across its generations). */
    appendedMessagesFor: (chatId: string | undefined) => ReadonlyArray<ChatUpdateMessage>;
    /** Live streaming text buffers for this chat (merged across generations). */
    streamingTextsFor: (chatId: string | undefined) => Readonly<Record<string, string>>;
    /** Live Gemini thought-summary buffers for this chat (merged across
     *  generations, including finished ones until `forgetChat`). */
    reasoningTextsFor: (chatId: string | undefined) => Readonly<Record<string, string>>;
    /** Message ids appended during a STILL-RUNNING turn for this chat — scopes
     *  the trailing-tool-call shimmer to the current turn so a settled prior
     *  tool call (or another chat's) never re-shimmers. */
    liveTurnMessageIdsFor: (chatId: string | undefined) => ReadonlySet<string>;

    /** Mount this once at the surface's root — one `<ChatUpdatesListener />`
     *  per active generation, so every concurrent turn keeps streaming. */
    listeners: ReactNode;
}

export function useChatLiveUpdates(): ChatLiveUpdates {
    const [generations, setGenerations] = useState<ReadonlyArray<Generation>>([]);

    const handleUpdate = useCallback((generationId: string, update: ChatUpdate) => {
        setGenerations((prev) => {
            const index = prev.findIndex((generation) => generation.generationId === generationId);
            if (index === -1) return prev;
            const generation = prev[index]!;

            if (update.__typename === 'ChatUpdateMessageAppended') {
                const incoming = update.message;
                // Upsert by id, don't drop repeats — a delegate tool republishes
                // its row once the sub-agent batch settles, swapping the real
                // result in place of the initial `toolResult: null`.
                const existing = generation.appended.findIndex((m) => m.chatMessageId === incoming.chatMessageId);
                const appended =
                    existing === -1
                        ? [...generation.appended, incoming]
                        : generation.appended.map((m, i) => (i === existing ? incoming : m));
                // Drop live streaming / reasoning keyed to this id — the
                // persisted row (any AI variant) now owns that step's UI.
                let streaming = generation.streaming;
                if (incoming.chatMessageId in streaming) {
                    const next = { ...streaming };
                    delete next[incoming.chatMessageId];
                    streaming = next;
                }
                let reasoning = generation.reasoning;
                if (incoming.chatMessageId in reasoning) {
                    const next = { ...reasoning };
                    delete next[incoming.chatMessageId];
                    reasoning = next;
                }
                return replaceAt(prev, index, { ...generation, appended, streaming, reasoning });
            }

            if (update.__typename === 'ChatUpdateAssistantTextChunk') {
                const streaming = {
                    ...generation.streaming,
                    [update.chatMessageId]: (generation.streaming[update.chatMessageId] ?? '') + update.delta,
                };
                return replaceAt(prev, index, { ...generation, streaming });
            }

            if (update.__typename === 'ChatUpdateAssistantReasoningChunk') {
                const reasoning = {
                    ...generation.reasoning,
                    [update.chatMessageId]: (generation.reasoning[update.chatMessageId] ?? '') + update.delta,
                };
                return replaceAt(prev, index, { ...generation, reasoning });
            }

            // ChatUpdateTurnEnded — mark the generation finished and drop any
            // orphan streaming / reasoning buffers (an empty or aborted turn
            // can leave a stale live Thought slot that `MessageAppended` never
            // came to clean up). Settled rows already carry `message.reasoning`.
            return replaceAt(prev, index, { ...generation, ended: true, streaming: {}, reasoning: {} });
        });
    }, []);

    const beginTurn = useCallback((chatId?: string) => {
        const generationId = crypto.randomUUID();
        setGenerations((prev) => {
            const next: Generation = {
                generationId,
                chatId: chatId ?? null,
                appended: [],
                streaming: {},
                reasoning: {},
                ended: false,
            };
            return capGenerations([...prev, next]);
        });
        return generationId;
    }, []);

    const bindTurn = useCallback((generationId: string, chatId: string) => {
        setGenerations((prev) =>
            prev.map((generation) => (generation.generationId === generationId ? { ...generation, chatId } : generation)),
        );
    }, []);

    const endTurn = useCallback((generationId: string) => {
        setGenerations((prev) => prev.filter((generation) => generation.generationId !== generationId));
    }, []);

    const forgetChat = useCallback((chatId: string) => {
        setGenerations((prev) => prev.filter((generation) => !(generation.chatId === chatId && generation.ended)));
    }, []);

    const isGenerating = useCallback(
        (chatId: string | undefined) => {
            if (chatId === undefined) return generations.some((g) => g.chatId === null && !g.ended);
            return generations.some((g) => g.chatId === chatId && !g.ended);
        },
        [generations],
    );

    const generationsFor = useCallback(
        (chatId: string | undefined) => generations.filter((g) => (chatId === undefined ? g.chatId === null : g.chatId === chatId)),
        [generations],
    );

    const appendedMessagesFor = useCallback(
        (chatId: string | undefined) => {
            const matching = generationsFor(chatId);
            if (matching.length === 0) return EMPTY_MESSAGES;
            return matching.flatMap((g) => g.appended);
        },
        [generationsFor],
    );

    const streamingTextsFor = useCallback(
        (chatId: string | undefined) => {
            const matching = generationsFor(chatId);
            if (matching.length === 0) return EMPTY_STREAMING;
            return matching.reduce<Record<string, string>>((acc, g) => Object.assign(acc, g.streaming), {});
        },
        [generationsFor],
    );

    const reasoningTextsFor = useCallback(
        (chatId: string | undefined) => {
            const matching = generationsFor(chatId);
            if (matching.length === 0) return EMPTY_STREAMING;
            return matching.reduce<Record<string, string>>((acc, g) => Object.assign(acc, g.reasoning), {});
        },
        [generationsFor],
    );

    const liveTurnMessageIdsFor = useCallback(
        (chatId: string | undefined) => {
            const ids = new Set<string>();
            for (const g of generationsFor(chatId)) {
                if (g.ended) continue;
                for (const message of g.appended) ids.add(message.chatMessageId);
            }
            return ids;
        },
        [generationsFor],
    );

    const listeners = useMemo(
        () =>
            generations
                .filter((generation) => !generation.ended)
                .map((generation) => (
                    <ChatUpdatesListener
                        key={generation.generationId}
                        generationId={generation.generationId}
                        onUpdate={(update) => handleUpdate(generation.generationId, update)}
                    />
                )),
        [generations, handleUpdate],
    );

    return {
        beginTurn,
        bindTurn,
        endTurn,
        forgetChat,
        isGenerating,
        appendedMessagesFor,
        streamingTextsFor,
        reasoningTextsFor,
        liveTurnMessageIdsFor,
        listeners,
    };
}

const EMPTY_MESSAGES: ReadonlyArray<ChatUpdateMessage> = [];
const EMPTY_STREAMING: Readonly<Record<string, string>> = {};

function replaceAt(generations: ReadonlyArray<Generation>, index: number, next: Generation): ReadonlyArray<Generation> {
    const copy = generations.slice();
    copy[index] = next;
    return copy;
}

// Bound the set: drop the oldest FINISHED generations first (an in-flight turn
// is never evicted). Only trims when over the cap, so the common case is a
// no-op pass.
function capGenerations(generations: ReadonlyArray<Generation>): ReadonlyArray<Generation> {
    if (generations.length <= MAX_GENERATIONS) return generations;
    const overflow = generations.length - MAX_GENERATIONS;
    let toDrop = overflow;
    return generations.filter((generation) => {
        if (toDrop > 0 && generation.ended) {
            toDrop -= 1;
            return false;
        }
        return true;
    });
}

function ChatUpdatesListener({ generationId, onUpdate }: { generationId: string; onUpdate: (update: ChatUpdate) => void }) {
    // Capture the latest callback in a ref so the subscription effect doesn't
    // re-bind on every parent render — re-subscribing per render would tear
    // down and recreate the SSE stream and we'd miss in-flight events.
    const onUpdateRef = useRef(onUpdate);
    useEffect(() => {
        onUpdateRef.current = onUpdate;
    }, [onUpdate]);

    const client = useClient();
    useEffect(() => {
        // Drive the subscription imperatively rather than via `useSubscription`.
        // URQL's `useSubscription` reducer runs inside a React state-updater
        // callback, which React is allowed to invoke more than once per event
        // (concurrent rendering retries, StrictMode, interrupted renders). Any
        // side effect from there — including a queued microtask that forwards
        // the event to parent state — fires once per re-invocation, which
        // showed up as duplicate text fragments while the assistant streamed.
        // Subscribing through `client.executeSubscription` keeps the event
        // handler outside React's reconciliation, so each server event is
        // forwarded exactly once.
        const request = createRequest(ChatUpdatesDocument, { generationId });
        const operation = client.executeSubscription<GqlCChatUpdatesSubscription>(request);
        const { unsubscribe } = pipe(
            operation,
            subscribe((result) => {
                if (result.data) onUpdateRef.current(result.data.chatUpdates);
            }),
        );
        return unsubscribe;
    }, [client, generationId]);

    return null;
}
