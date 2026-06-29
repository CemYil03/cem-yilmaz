import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

// Provider for the visitor chat sheet. Owns just enough state to let
// arbitrary surfaces — the landing-page hero, suggestion chips, the header
// button, an admin "review this chat" link — open the sheet in the right
// mode without re-rendering the sheet at every call site.
//
// State machine (held in `intent`):
//   - `null`      → sheet closed.
//   - `'empty'`   → sheet open, no seeded message and no loaded chat. The
//                   sheet renders its empty state (previous-chats list +
//                   composer). Header button opens this way.
//   - `{ seededQuestion }` → sheet open with a question to fire on mount.
//                            The sheet runs `chatMessageCreate` once and
//                            transitions to its loaded view when the
//                            `chatId` arrives. Landing-page composer +
//                            suggestion chips open this way.
//   - `{ chatId }` → sheet open already pointed at a specific chat. The
//                    sheet skips the seed-send and renders the loaded view
//                    immediately. The empty-state "previous chats" rows
//                    open this way.
//
// Open transitions reset prior `intent` before re-setting it so back-to-
// back opens (close, then reopen with a different intent) don't carry the
// stale value. The sheet unmounts its inner subtree on every close
// (Radix `Dialog` behaviour), so we don't need to do that bookkeeping
// here — a fresh open is always a fresh internal state.
//
// `highlightSignal` is a monotonically-increasing counter bumped every
// time the sheet transitions from open → closed. Surfaces that want to
// draw the user's attention back to themselves (the header chat button)
// subscribe to it: each new value triggers a one-shot pulse animation so
// the user understands "your conversation went there, not into the
// void." See `HeaderChatButton.tsx`.

export type VisitorChatIntent = { kind: 'empty' } | { kind: 'seeded'; seededQuestion: string } | { kind: 'loaded'; chatId: string };

interface VisitorChatContextValue {
    isOpen: boolean;
    intent: VisitorChatIntent | null;
    /** Open with an empty state (previous-chats list + composer). The header
     *  chat button uses this. */
    openEmpty: () => void;
    /** Open and immediately fire `message` as the first user turn of a new
     *  chat. The landing-page composer and suggestion chips use this. */
    openWithMessage: (message: string) => void;
    /** Open already pointed at a specific chat — used by the empty-state
     *  "Previous chats" list and any admin "open this chat" link. */
    loadChat: (chatId: string) => void;
    /** Close the sheet. Intent is dropped on the next open. */
    close: () => void;
    /** Counter bumped every time the sheet closes. Subscribers can drive a
     *  one-shot affordance (e.g. the header chat button's pulse) off this
     *  via a `useEffect` keyed on the value. Starts at 0; never decrements. */
    highlightSignal: number;
}

const VisitorChatContext = createContext<VisitorChatContextValue | null>(null);

export function useVisitorChat(): VisitorChatContextValue {
    const value = useContext(VisitorChatContext);
    if (!value) throw new Error('useVisitorChat must be used inside <VisitorChatProvider />');
    return value;
}

export function VisitorChatProvider({ children }: { children: ReactNode }) {
    const [intent, setIntent] = useState<VisitorChatIntent | null>(null);
    const [highlightSignal, setHighlightSignal] = useState(0);

    // Bump the highlight signal on every open → closed transition. The
    // close affordance lives in the header (chat button); pulsing it the
    // moment the sheet dismisses tells the user where their conversation
    // went. The first render's intent is null, so we only fire after a
    // real open has happened — `prev` ref guards the initial-mount case.
    const previouslyOpenRef = useRef(false);
    useEffect(() => {
        const open = intent !== null;
        if (previouslyOpenRef.current && !open) {
            setHighlightSignal((value) => value + 1);
        }
        previouslyOpenRef.current = open;
    }, [intent]);

    const openEmpty = useCallback(() => setIntent({ kind: 'empty' }), []);
    const openWithMessage = useCallback((message: string) => setIntent({ kind: 'seeded', seededQuestion: message }), []);
    const loadChat = useCallback((chatId: string) => setIntent({ kind: 'loaded', chatId }), []);
    const close = useCallback(() => setIntent(null), []);

    const value = useMemo<VisitorChatContextValue>(
        () => ({
            isOpen: intent !== null,
            intent,
            openEmpty,
            openWithMessage,
            loadChat,
            close,
            highlightSignal,
        }),
        [intent, openEmpty, openWithMessage, loadChat, close, highlightSignal],
    );

    return <VisitorChatContext.Provider value={value}>{children}</VisitorChatContext.Provider>;
}
