import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createRequest, useClient } from 'urql';
import { pipe, subscribe } from 'wonka';
import { ChatUpdatesDocument } from '../graphql/generated';
import type { GqlCChatUpdatesSubscription } from '../graphql/generated';

// Owns the per-turn live-update state for a chat surface:
//
// - `isGenerating` — true while a turn is in flight; the composer should
//   treat this as "lock me until the server signals TurnEnded".
// - `appendedMessages` — every `ChatUpdateMessageAppended` that has arrived
//   for the active turn, deduped by `chatMessageId`. Survives the
//   empty→loaded route handoff because the listener mounts inside the hook,
//   above the page-shape components that swap out. Cleared whenever the
//   surface transitions away from a previously-defined chatId — otherwise
//   the buffer leaks into the next chat (back-navigate from chat A, send a
//   new message creating chat B, A's buffered messages would re-sort into
//   B's transcript by createdAt and look like they belonged to B until a
//   hard reload).
// - `streamingTexts` — the live text-delta buffer, keyed by the
//   pre-allocated `chatMessageId` of the eventual assistant-text row.
//   Cleared on `TurnEnded` and on the matching `MessageAppended`.
//
// `beginTurn()` mints a fresh UUID and synchronously sets state so React
// renders the listener BEFORE any awaited mutation can fire — that's the
// race the route's old `setGenerationId` plumbing was working around.
//
// `listener` is a `<ChatUpdatesListener />` element whenever a turn is
// active; render it once at the surface's root so the URQL subscription
// survives any inner-component swap (e.g. empty→loaded chat).

type ChatUpdate = GqlCChatUpdatesSubscription['chatUpdates'];
type ChatUpdateMessage = Extract<ChatUpdate, { __typename: 'ChatUpdateMessageAppended' }>['message'];

export interface ChatLiveUpdates {
    isGenerating: boolean;
    appendedMessages: ReadonlyArray<ChatUpdateMessage>;
    streamingTexts: Readonly<Record<string, string>>;
    /** Allocate a `generationId` and mount the listener. Returns the id so
     *  the caller can pass it to a mutation. */
    beginTurn: () => string;
    /** Tear down the per-turn state without waiting on `TurnEnded`. Use only
     *  when the kicking-off mutation errors before the server can publish. */
    endTurn: () => void;
    /** Mount this once at the surface's root. */
    listener: ReactNode;
}

export function useChatLiveUpdates(chatId: string | undefined): ChatLiveUpdates {
    const [generationId, setGenerationId] = useState<string | null>(null);
    const [appendedMessages, setAppendedMessages] = useState<ReadonlyArray<ChatUpdateMessage>>([]);
    const [streamingTexts, setStreamingTexts] = useState<Record<string, string>>({});

    // When the surface switches between chats — including back-navigating to
    // the empty state from a loaded chat — drop the per-turn buffers. We
    // tolerate exactly one transition: undefined → some-id while a turn is
    // in flight. That's the empty→loaded handoff `ChatComposer` performs on
    // first send, and the buffer there legitimately belongs to the new chat.
    // Every other transition (loaded → empty, loaded A → loaded B,
    // undefined → some-id with no active turn) is a fresh surface and the
    // buffers from the previous chat must not bleed in.
    const lastChatIdRef = useRef<string | undefined>(chatId);
    if (lastChatIdRef.current !== chatId) {
        const isFirstSendHandoff = lastChatIdRef.current === undefined && chatId !== undefined && generationId !== null;
        lastChatIdRef.current = chatId;
        if (!isFirstSendHandoff) {
            // Defer the reset to a microtask — calling setState during the
            // render phase trips React's "cannot update during render"
            // warning. The transcript view will see one render with stale
            // buffers, but the page-query data for the new chat hasn't
            // resolved yet either, so there's nothing visible to flicker.
            queueMicrotask(() => {
                setAppendedMessages([]);
                setStreamingTexts({});
            });
        }
    }

    const handleUpdate = useCallback((update: ChatUpdate) => {
        if (update.__typename === 'ChatUpdateMessageAppended') {
            const incoming = update.message;
            setAppendedMessages((prev) => (prev.some((m) => m.chatMessageId === incoming.chatMessageId) ? prev : [...prev, incoming]));
            // Drop any streaming row whose id matches the persisted row — the
            // assistant text just arrived in its final form.
            if (incoming.__typename === 'ChatMessageAssistantText') {
                setStreamingTexts((prev) => {
                    if (!(incoming.chatMessageId in prev)) return prev;
                    const next = { ...prev };
                    delete next[incoming.chatMessageId];
                    return next;
                });
            }
            return;
        }
        if (update.__typename === 'ChatUpdateAssistantTextChunk') {
            setStreamingTexts((prev) => ({
                ...prev,
                [update.chatMessageId]: (prev[update.chatMessageId] ?? '') + update.delta,
            }));
            return;
        }
        // ChatUpdateTurnEnded — server signals the turn is over. We don't
        // drop `appendedMessages` (those are real and belong in the
        // transcript until the page reloads); we DO drop any orphan
        // streamingTexts (an empty turn leaves a stale entry that
        // `MessageAppended` never came to clean up).
        setGenerationId(null);
        setStreamingTexts({});
    }, []);

    const beginTurn = useCallback(() => {
        const next = crypto.randomUUID();
        setGenerationId(next);
        return next;
    }, []);

    const endTurn = useCallback(() => {
        setGenerationId(null);
        setStreamingTexts({});
    }, []);

    return {
        isGenerating: generationId !== null,
        appendedMessages,
        streamingTexts,
        beginTurn,
        endTurn,
        listener: generationId ? <ChatUpdatesListener generationId={generationId} onUpdate={handleUpdate} /> : null,
    };
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
