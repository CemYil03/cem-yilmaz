import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useMutation } from 'urql';
import { ChatMessageCreateDocument } from '../graphql/generated';
import { useChatLiveUpdates } from './useChatLiveUpdates';
import type { ChatLiveUpdates } from './useChatLiveUpdates';

// Provider for the visitor chat sheet. Owns the chatId + live-updates
// handle above the sheet (and above any other surface that hosts a visitor
// composer — the landing-page hero composer fires `chatMessageCreate`
// directly through here, then the provider adopts the freshly-allocated
// chatId so the sheet picks up the streaming response in context).
//
// Mirrors the shape of `WorkspaceAssistantChatProvider`: a single source
// of truth for "is there a chat happening, what's its id, is a turn in
// flight" — so:
//
//   - The sheet's empty state, the sheet's loaded state, AND the landing-
//     page hero composer all read the same `live` and `chatId`. A turn
//     started by the hero composer streams its response into the sheet
//     the instant it opens.
//   - The SSE subscription survives the sheet open/close cycle. The
//     listener mounts at the provider root, not inside the sheet, so
//     closing the sheet mid-turn doesn't drop the rest of the response.
//   - The visitor composer can mount on multiple surfaces (hero, sheet)
//     with no `chatId` sync drama.
//
// `highlightSignal` is a monotonically-increasing counter bumped every
// time the sheet transitions from open → closed. Surfaces that want to
// draw the user's attention back to themselves (the header chat button)
// subscribe to it via a `useEffect` keyed on the value. See
// `HeaderChatButton.tsx`.

interface VisitorChatContextValue {
    isOpen: boolean;
    chatId: string | undefined;
    live: ChatLiveUpdates;
    /** Open with an empty state (previous-chats list + composer). The
     *  header chat button uses this. */
    openEmpty: () => void;
    /** Open and immediately fire `message` as the first user turn. Used
     *  by landing-page suggestion chips and the `?ask=…` deep link — both
     *  cases where the visitor's question has already been chosen and we
     *  want it sent without a separate "click into the composer" step. */
    openWithMessage: (message: string) => Promise<void>;
    /** Open already pointed at a specific chat — used by the empty-state
     *  "Previous chats" list and any admin "open this chat" link. */
    loadChat: (chatId: string) => void;
    /** Adopt a chatId allocated by a sibling composer (the landing-page
     *  hero composer fires `chatMessageCreate` directly so the visitor sees
     *  the busy / sent micro-states on the input they typed in). After the
     *  call the provider treats the chat as its own — the sheet's next
     *  send appends to the same row, and the live-updates listener is
     *  already mounted because `beginTurn()` ran before the mutation
     *  fired. */
    setChatIdFromHero: (chatId: string) => void;
    /** Drop the current chat without closing the sheet. The next send
     *  starts a fresh `chats` row. The sheet's "New chat" button uses
     *  this on the loaded view. */
    resetChat: () => void;
    /** Open the sheet without seeding anything. The hero composer fires
     *  this after a successful send so the streaming response surfaces
     *  in context. */
    open: () => void;
    /** Close the sheet. The chatId + live state are preserved so
     *  reopening picks up the same conversation. */
    close: () => void;
    /** Counter bumped every time the sheet closes. Subscribers can drive a
     *  one-shot affordance (e.g. the header chat button's pulse) off this
     *  via a `useEffect` keyed on the value. Starts at 0; never decrements. */
    highlightSignal: number;
}

export const VisitorChatContext = createContext<VisitorChatContextValue | null>(null);

export function useVisitorChat(): VisitorChatContextValue {
    const value = useContext(VisitorChatContext);
    if (!value) throw new Error('useVisitorChat must be used inside <VisitorChatProvider />');
    return value;
}

const extractMessageCreateResult = (data: unknown): { chatId: string } | null => {
    const wrapper = data as { chatMessageCreate?: { chatId: string } | null } | null | undefined;
    return wrapper?.chatMessageCreate ?? null;
};

export function VisitorChatProvider({ children }: { children: ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [chatId, setChatId] = useState<string | undefined>(undefined);
    const [highlightSignal, setHighlightSignal] = useState(0);
    const live = useChatLiveUpdates(chatId);
    const [, sendMutation] = useMutation(ChatMessageCreateDocument);

    // Mirror chatId into a ref so back-to-back sends (chip click → instant
    // mutation) read the latest value without waiting on a render — same
    // race-avoidance pattern the workspace provider uses.
    const chatIdRef = useRef<string | undefined>(undefined);

    // Bump the highlight signal on every open → closed transition so the
    // header chat button can pulse the visitor back at their conversation.
    const previouslyOpenRef = useRef(false);
    useEffect(() => {
        if (previouslyOpenRef.current && !isOpen) {
            setHighlightSignal((value) => value + 1);
        }
        previouslyOpenRef.current = isOpen;
    }, [isOpen]);

    const open = useCallback(() => setIsOpen(true), []);
    const close = useCallback(() => setIsOpen(false), []);

    const openEmpty = useCallback(() => {
        // Empty state expects no active chat — drop the chatId so the
        // sheet renders the previous-chats list + fresh composer.
        chatIdRef.current = undefined;
        setChatId(undefined);
        setIsOpen(true);
    }, []);

    const loadChat = useCallback((id: string) => {
        chatIdRef.current = id;
        setChatId(id);
        setIsOpen(true);
    }, []);

    const setChatIdFromHero = useCallback((id: string) => {
        chatIdRef.current = id;
        setChatId(id);
    }, []);

    const resetChat = useCallback(() => {
        chatIdRef.current = undefined;
        setChatId(undefined);
    }, []);

    const openWithMessage = useCallback(
        async (message: string) => {
            const trimmed = message.trim();
            if (!trimmed) return;
            // Start a fresh chat for chip / `?ask=` flows. The user pressed
            // a curated entry point, they expect a new conversation, not a
            // continuation of whatever chat happened to be active.
            chatIdRef.current = undefined;
            setChatId(undefined);
            setIsOpen(true);
            // Lift the generationId BEFORE firing the mutation so the
            // listener mounts and subscribes before any server-side publish
            // can happen.
            const generationId = live.beginTurn();
            const result = await sendMutation({
                chatId: undefined,
                message: trimmed,
                fileUploadIds: [],
                generationId,
                requireToolCallApprovals: false,
            });
            const created = result.data ? extractMessageCreateResult(result.data) : null;
            if (result.error || !created) {
                live.endTurn();
                return;
            }
            chatIdRef.current = created.chatId;
            setChatId(created.chatId);
        },
        [live, sendMutation],
    );

    const value = useMemo<VisitorChatContextValue>(
        () => ({
            isOpen,
            chatId,
            live,
            openEmpty,
            openWithMessage,
            loadChat,
            setChatIdFromHero,
            resetChat,
            open,
            close,
            highlightSignal,
        }),
        [isOpen, chatId, live, openEmpty, openWithMessage, loadChat, setChatIdFromHero, resetChat, open, close, highlightSignal],
    );

    return (
        <VisitorChatContext.Provider value={value}>
            {children}
            {/* Live-updates listener mounted HERE — above the sheet — so the
             *  SSE subscription survives `Sheet` mount/unmount cycles.
             *  Without this, closing the sheet during a streaming turn
             *  would drop the subscription and we'd lose the rest of the
             *  response. */}
            {live.listener}
        </VisitorChatContext.Provider>
    );
}
