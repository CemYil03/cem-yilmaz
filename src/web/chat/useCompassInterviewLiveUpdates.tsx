import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createRequest, useClient } from 'urql';
import { pipe, subscribe } from 'wonka';
import { WorkspaceCompassInterviewUpdatesDocument } from '../graphql/generated';
import type { GqlCWorkspaceCompassInterviewUpdatesSubscription } from '../graphql/generated';

// Per-turn live-update state for the compass psychological-interview view.
// Fork of `useChatLiveUpdates` — deltas are keyed by `interviewMessageId`
// (the pre-allocated assistant id) instead of `chatMessageId`, because the
// interviewer writes to its own `CompassInterviewMessages` table and its
// updates ride a parallel `compassInterviewUpdates` subscription. See
// `docs/styles/chat.md` and
// `docs/features/workspace-compass.md`.
//
// One caller doesn't earn a generic — if a third streaming surface shows
// up, factor a `useTurnLiveUpdates<TWire>` from this and `useChatLiveUpdates`
// then.

type InterviewUpdate = GqlCWorkspaceCompassInterviewUpdatesSubscription['compassInterviewUpdates'];
type InterviewUpdateMessage = Extract<InterviewUpdate, { __typename: 'CompassInterviewUpdateMessageAppended' }>['message'];

export interface CompassInterviewLiveUpdates {
    isGenerating: boolean;
    appendedMessages: ReadonlyArray<InterviewUpdateMessage>;
    streamingTexts: Readonly<Record<string, string>>;
    /** True on the tick after `turnEnded` reported `concluded: true`. Lets
     *  the surface flip its terminal UI without waiting for the next
     *  `userUpdates` push to hydrate the row's status change. */
    concludedThisTurn: boolean;
    /** Allocate a `generationId` and mount the listener. Returns the id so
     *  the caller can pass it to a mutation. */
    beginTurn: () => string;
    /** Tear down the per-turn state without waiting on `turnEnded`. Use only
     *  when the kicking-off mutation errors before the server can publish. */
    endTurn: () => void;
    /** Mount this once at the surface's root. */
    listener: ReactNode;
}

export function useCompassInterviewLiveUpdates(interviewId: string | undefined): CompassInterviewLiveUpdates {
    const [generationId, setGenerationId] = useState<string | null>(null);
    const [appendedMessages, setAppendedMessages] = useState<ReadonlyArray<InterviewUpdateMessage>>([]);
    const [streamingTexts, setStreamingTexts] = useState<Record<string, string>>({});
    const [concludedThisTurn, setConcludedThisTurn] = useState(false);

    // Drop per-turn buffers when the surface switches between interviews.
    // Unlike the chat hook there's no "empty→loaded on first send" case —
    // interviews always have an interviewId before any turn kicks off.
    const lastInterviewIdRef = useRef<string | undefined>(interviewId);
    if (lastInterviewIdRef.current !== interviewId) {
        lastInterviewIdRef.current = interviewId;
        queueMicrotask(() => {
            setAppendedMessages([]);
            setStreamingTexts({});
            setConcludedThisTurn(false);
        });
    }

    const handleUpdate = useCallback((update: InterviewUpdate) => {
        if (update.__typename === 'CompassInterviewUpdateMessageAppended') {
            const incoming = update.message;
            setAppendedMessages((prev) =>
                prev.some((m) => m.interviewMessageId === incoming.interviewMessageId) ? prev : [...prev, incoming],
            );
            // Drop any streaming row whose id matches the persisted row —
            // the assistant text just arrived in its final form.
            if (incoming.role === 'assistant') {
                setStreamingTexts((prev) => {
                    if (!(incoming.interviewMessageId in prev)) return prev;
                    const next = { ...prev };
                    delete next[incoming.interviewMessageId];
                    return next;
                });
            }
            return;
        }
        if (update.__typename === 'CompassInterviewUpdateAssistantTextChunk') {
            setStreamingTexts((prev) => ({
                ...prev,
                [update.interviewMessageId]: (prev[update.interviewMessageId] ?? '') + update.delta,
            }));
            return;
        }
        // CompassInterviewUpdateTurnEnded — server signals the turn is over.
        setGenerationId(null);
        setStreamingTexts({});
        if (update.concluded) setConcludedThisTurn(true);
    }, []);

    const beginTurn = useCallback(() => {
        const next = crypto.randomUUID();
        setGenerationId(next);
        setConcludedThisTurn(false);
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
        concludedThisTurn,
        beginTurn,
        endTurn,
        listener: generationId ? <CompassInterviewUpdatesListener generationId={generationId} onUpdate={handleUpdate} /> : null,
    };
}

function CompassInterviewUpdatesListener({
    generationId,
    onUpdate,
}: {
    generationId: string;
    onUpdate: (update: InterviewUpdate) => void;
}) {
    // Latest-callback ref so the subscription effect doesn't re-bind on
    // every parent render — re-subscribing per render would tear down and
    // recreate the SSE stream and we'd miss in-flight events.
    const onUpdateRef = useRef(onUpdate);
    useEffect(() => {
        onUpdateRef.current = onUpdate;
    }, [onUpdate]);

    const client = useClient();
    useEffect(() => {
        // Imperative rather than `useSubscription` for the same reason
        // `useChatLiveUpdates` does — URQL's declarative hook can deliver
        // each event more than once under concurrent React, and the
        // downstream `+= delta` would then duplicate. See
        // `useChatLiveUpdates.tsx`.
        const request = createRequest(WorkspaceCompassInterviewUpdatesDocument, { generationId });
        const operation = client.executeSubscription<GqlCWorkspaceCompassInterviewUpdatesSubscription>(request);
        const { unsubscribe } = pipe(
            operation,
            subscribe((result) => {
                if (result.data) onUpdateRef.current(result.data.compassInterviewUpdates);
            }),
        );
        return unsubscribe;
    }, [client, generationId]);

    return null;
}
