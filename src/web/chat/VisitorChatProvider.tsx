import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

// Provider for the visitor chat dialog. Owns just enough state to let
// arbitrary surfaces — the landing-page hero, suggestion chips, the header
// button, an admin "review this chat" link — open the dialog in the right
// mode without re-rendering the dialog at every call site.
//
// State machine (held in `intent`):
//   - `null`      → dialog closed.
//   - `'empty'`   → dialog open, no seeded message and no loaded chat. The
//                   dialog renders its empty state (previous-chats list +
//                   composer). Header button opens this way.
//   - `{ seededQuestion }` → dialog open with a question to fire on mount.
//                            The dialog runs `chatMessageCreate` once and
//                            transitions to its loaded view when the
//                            `chatId` arrives. Landing-page composer +
//                            suggestion chips open this way.
//   - `{ chatId }` → dialog open already pointed at a specific chat. The
//                    dialog skips the seed-send and renders the loaded view
//                    immediately. The empty-state "previous chats" rows
//                    open this way.
//
// Open transitions reset prior `intent` before re-setting it so back-to-
// back opens (close, then reopen with a different intent) don't carry the
// stale value. The dialog unmounts its inner subtree on every close
// (Radix `Dialog` behaviour), so we don't need to do that bookkeeping
// here — a fresh open is always a fresh internal state.

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
    /** Close the dialog. Intent is dropped on the next open. */
    close: () => void;
}

const VisitorChatContext = createContext<VisitorChatContextValue | null>(null);

export function useVisitorChat(): VisitorChatContextValue {
    const value = useContext(VisitorChatContext);
    if (!value) throw new Error('useVisitorChat must be used inside <VisitorChatProvider />');
    return value;
}

export function VisitorChatProvider({ children }: { children: ReactNode }) {
    const [intent, setIntent] = useState<VisitorChatIntent | null>(null);

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
        }),
        [intent, openEmpty, openWithMessage, loadChat, close],
    );

    return <VisitorChatContext.Provider value={value}>{children}</VisitorChatContext.Provider>;
}
