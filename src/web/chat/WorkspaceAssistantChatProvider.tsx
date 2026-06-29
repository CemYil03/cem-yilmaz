import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useClient, useMutation } from 'urql';
import { WorkspaceChatMessageCreateDocument, WorkspaceChatPageDocument } from '../graphql/generated';
import type { TranscriptMessage } from './chatTranscript';
import { useChatLiveUpdates } from './useChatLiveUpdates';
import type { ChatLiveUpdates } from './useChatLiveUpdates';

// Workspace-assistant coordination — see `docs/features/chat-workspace.md`.
//
// The provider owns the assistant's chat state above the sheet so that:
//   - Closing and reopening the sheet does not lose the conversation.
//   - Navigating between workspace focus areas (`/workspace/cv` →
//     `/workspace/projects` → …) keeps the same chat alive — the user can
//     ask the assistant a question, jump to a focus area to consult or
//     edit something, and come back to the sheet with the transcript
//     intact.
//   - The "Open full-screen" button on the sheet hands the conversation
//     off to `/workspace/assistant?chatId=<id>` via plain navigation; the
//     full-screen route is the source of truth from then on (URL-routable
//     and bookmark-friendly).
//
// State that survives the sheet's open/close cycle:
//
// - `chatId` — populated after the first send returns, or after the
//   provider resumes a previous admin chat. Reused on subsequent sends so
//   they append to the same `chats` row.
// - `loadedMessages` — page-query rows for a resumed chat. Empty for a
//   fresh chat (the subscription buffer in `live.appendedMessages` is the
//   only source of truth there).
// - `live` — the `useChatLiveUpdates` handle keyed by `chatId`. Mounted
//   at the provider root so the SSE subscription stays alive even when
//   the sheet is closed.
//
// Mounted by `/{-$locale}/workspace.tsx` so it only loads on workspace
// routes — not on the public site.

interface WorkspaceAssistantChatContextValue {
    isOpen: boolean;
    setOpen: (open: boolean) => void;
    /** Open the sheet without seeding anything. The workspace floating
     *  launcher uses this. */
    open: () => void;
    chatId: string | undefined;
    /** Page-query rows for a resumed chat. Empty when the assistant is on
     *  a fresh chat — the subscription buffer is the source of truth there. */
    loadedMessages: ReadonlyArray<TranscriptMessage>;
    live: ChatLiveUpdates;
    /** Sends a free-text message, optionally with file-upload ids attached.
     *  Awaits the mutation; on success captures `chatId` for subsequent
     *  sends. The caller owns the upload lifecycle (the composer uploads
     *  on attach and forwards only the resolved `fileUploadId`s). */
    sendMessage: (message: string, fileUploadIds?: ReadonlyArray<string>) => Promise<void>;
    /** Open the sheet AND immediately fire `message` as the first user
     *  turn. Used by the hub composer when the user submits from the
     *  workspace landing page. */
    openWithMessage: (message: string) => Promise<void>;
    /** Drop the current chat without leaving the sheet. The next send
     *  starts a fresh `chats` row. */
    resetChat: () => void;
    /** Resume a previous admin chat by id — fetches its transcript and
     *  seeds `loadedMessages` + `chatId`. */
    loadChat: (chatId: string) => Promise<void>;
    /** Counter bumped every time the sheet closes. The header's
     *  assistant button pulses for ~1.4s on each new value so the user
     *  knows "your conversation went there, the header button is how
     *  you come back." See `HeaderChatButton.tsx`. */
    highlightSignal: number;
}

const WorkspaceAssistantChatContext = createContext<WorkspaceAssistantChatContextValue | null>(null);

export function useWorkspaceAssistantChat(): WorkspaceAssistantChatContextValue {
    const value = useContext(WorkspaceAssistantChatContext);
    if (!value) throw new Error('useWorkspaceAssistantChat must be used inside <WorkspaceAssistantChatProvider />');
    return value;
}

const extractMessageCreateResult = (data: unknown): { chatId: string } | null => {
    const wrapper = data as { admin?: { chatMessageCreate?: { chatId: string } | null } | null } | null | undefined;
    return wrapper?.admin?.chatMessageCreate ?? null;
};

export function WorkspaceAssistantChatProvider({ children }: { children: ReactNode }) {
    const [isOpen, setOpen] = useState(false);
    const [chatId, setChatId] = useState<string | undefined>(undefined);
    const [loadedMessages, setLoadedMessages] = useState<ReadonlyArray<TranscriptMessage>>([]);
    const [highlightSignal, setHighlightSignal] = useState(0);
    const live = useChatLiveUpdates(chatId);
    const [, sendMutation] = useMutation(WorkspaceChatMessageCreateDocument);
    const urqlClient = useClient();

    // Bump the highlight signal on every open → closed transition so the
    // floating launcher can pulse and point the user back at where the
    // conversation lives. Same shape as `VisitorChatProvider`.
    const previouslyOpenRef = useRef(false);
    useEffect(() => {
        if (previouslyOpenRef.current && !isOpen) {
            setHighlightSignal((value) => value + 1);
        }
        previouslyOpenRef.current = isOpen;
    }, [isOpen]);

    // The mutation's `chatId` argument has to follow the freshly-allocated id
    // even when state hasn't re-rendered yet — two `sendMessage` calls fired
    // back-to-back (hub composer opens the sheet, immediately sends) would
    // otherwise both run with `chatId: undefined` and create two chats.
    // Mirror the state into a ref so each call reads the latest value.
    const chatIdRef = useRef<string | undefined>(undefined);

    const open = useCallback(() => setOpen(true), []);

    const sendMessage = useCallback(
        async (message: string, fileUploadIds?: ReadonlyArray<string>) => {
            const trimmed = message.trim();
            const hasAttachments = !!fileUploadIds && fileUploadIds.length > 0;
            // Same gate the route composer enforces — either text or at
            // least one resolved upload, never an empty send.
            if (!trimmed && !hasAttachments) return;
            const generationId = live.beginTurn();
            const result = await sendMutation({
                chatId: chatIdRef.current,
                message: trimmed,
                fileUploadIds: fileUploadIds ? [...fileUploadIds] : null,
                generationId,
                requireToolCallApprovals: false,
            });
            const created = result.data ? extractMessageCreateResult(result.data) : null;
            if (result.error || !created) {
                live.endTurn();
                return;
            }
            if (chatIdRef.current !== created.chatId) {
                chatIdRef.current = created.chatId;
                setChatId(created.chatId);
            }
        },
        [live, sendMutation],
    );

    const openWithMessage = useCallback(
        async (message: string) => {
            setOpen(true);
            await sendMessage(message);
        },
        [sendMessage],
    );

    const resetChat = useCallback(() => {
        // Drop chatId + page-query rows. The chatId-change effect inside
        // `useChatLiveUpdates` clears `appendedMessages` for us on the
        // loaded→empty transition. Don't touch `isOpen` — the user stayed
        // in the sheet on purpose, and the empty state is what they want
        // to see next.
        chatIdRef.current = undefined;
        setChatId(undefined);
        setLoadedMessages([]);
    }, []);

    const loadChat = useCallback(
        async (id: string) => {
            // Imperative URQL — same reasoning as `VisitorChatProvider` in
            // `src/web/chat/VisitorChatProvider.tsx`: the call site is a
            // click handler, not a render, and we want one fetch per click.
            const result = await urqlClient
                .query(WorkspaceChatPageDocument, { chatId: id }, { requestPolicy: 'cache-and-network' })
                .toPromise();
            const chat = result.data?.admin.chat;
            if (result.error || !chat) {
                live.endTurn();
                return;
            }
            chatIdRef.current = chat.chatId;
            setChatId(chat.chatId);
            setLoadedMessages(chat.messages as ReadonlyArray<TranscriptMessage>);
        },
        [live, urqlClient],
    );

    const value = useMemo<WorkspaceAssistantChatContextValue>(
        () => ({
            isOpen,
            setOpen,
            open,
            chatId,
            loadedMessages,
            live,
            sendMessage,
            openWithMessage,
            resetChat,
            loadChat,
            highlightSignal,
        }),
        [isOpen, open, chatId, loadedMessages, live, sendMessage, openWithMessage, resetChat, loadChat, highlightSignal],
    );

    return (
        <WorkspaceAssistantChatContext.Provider value={value}>
            {children}
            {/* The live-updates listener is rendered HERE — above the sheet —
             *  so the SSE subscription survives `Sheet` mount/unmount cycles.
             *  Without this, closing the sheet during a streaming turn would
             *  drop the subscription and we'd lose the rest of the response. */}
            {live.listener}
        </WorkspaceAssistantChatContext.Provider>
    );
}
