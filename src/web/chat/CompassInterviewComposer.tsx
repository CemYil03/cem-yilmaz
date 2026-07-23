import { useCallback, useState } from 'react';
import { useMutation } from 'urql';
import { MessageComposer } from '../components/MessageComposer';
import { WorkspaceCompassInterviewMessageSendDocument } from '../graphql/generated';
import type { Locale } from '../utils/locale';

// Compass-interview composer. Structural clone of `ChatComposer` scoped to
// the interview lifecycle:
//
// - No attachments (interviews are text-only).
// - No model picker (the interviewer is pinned to Gemini 3.6 Flash high).
// - No `currentPagePath` (the interview is a self-contained surface).
// - No "first send creates a chat" handoff — the interview always has an
//   id by the time the composer mounts.
//
// The `beginTurn → sendMutation({ interviewId, content, generationId })
// → endTurn-on-error` sequence mirrors `ChatComposer.tsx:212–234`. Wraps
// the shared `MessageComposer` for auto-grow textarea, brand focus ring,
// send-button motion, auto-refocus, and localized Send tooltip.

interface CompassInterviewComposerProps {
    interviewId: string;
    locale: Locale;
    isLocked: boolean;
    /** From `useCompassInterviewLiveUpdates`. Synchronously mints and
     *  returns a `generationId` so the listener mounts before this
     *  composer's mutation fires. */
    beginTurn: () => string;
    /** From `useCompassInterviewLiveUpdates`. Called on transport
     *  failure to tear down the per-turn state — the success path lets
     *  the server's `turnEnded` clear it. */
    endTurn: () => void;
    autoFocus?: boolean;
}

export function CompassInterviewComposer({
    interviewId,
    locale,
    isLocked,
    beginTurn,
    endTurn,
    autoFocus = false,
}: CompassInterviewComposerProps) {
    const [draft, setDraft] = useState('');
    const [, sendMessage] = useMutation(WorkspaceCompassInterviewMessageSendDocument);

    const placeholder = { de: 'Deine Antwort…', en: 'Your reply…' }[locale];

    const submit = useCallback(async () => {
        const message = draft.trim();
        if (!message) return;

        // Mint the generationId BEFORE firing the mutation so the
        // listener is live when the server publishes.
        const generationId = beginTurn();
        setDraft('');

        const result = await sendMessage({ interviewId, content: message, generationId });

        const created = result.data?.admin.compassInterviewMessageSend;
        if (result.error || !created?.success) {
            // Draft-restore on transport failure — the user's reply may
            // have been the longest, most thought-through message of the
            // interview. Clear the per-turn state so the composer
            // unlocks without waiting on a `turnEnded` that will never
            // fire (no server turn happened).
            setDraft(message);
            endTurn();
        }
    }, [beginTurn, draft, endTurn, interviewId, sendMessage]);

    return (
        <MessageComposer
            value={draft}
            onValueChange={setDraft}
            onSubmit={() => void submit()}
            disabled={isLocked}
            busy={isLocked}
            placeholder={placeholder}
            autoFocus={autoFocus}
        />
    );
}
