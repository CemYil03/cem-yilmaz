import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useClient, useMutation } from 'urql';
import { WorkspaceChatConfigDefaultModelSetDocument, WorkspaceChatPageDocument } from '../graphql/generated';
import type { GqlCWorkspaceChatConfigQuery } from '../graphql/generated';
import type { TranscriptMessage } from './chatTranscript';
import { useChatLiveUpdates } from './useChatLiveUpdates';
import type { ChatLiveUpdates } from './useChatLiveUpdates';

type WorkspaceChatConfig = GqlCWorkspaceChatConfigQuery['admin']['chatConfig'];

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
//   - Every admin composer (hub, sheet, `/workspace/assistant`) reads its
//     model catalog + currently-selected model from the same place — the
//     provider — so the dropdown choice on one surface is immediately
//     reflected on the others. The catalog comes from the workspace
//     layout's loader (`WorkspaceChatConfig`); the selected id starts at
//     `defaultModelId` and is persisted via
//     `WorkspaceChatConfigDefaultModelSet` on every change ("sticky default"
//     in `docs/features/admin-chat-config.md`).
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
// - `selectedModelId` — sticky model choice; the next send uses it, and
//   any change is persisted to the server as the new default.
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
    /** Adopt a chatId allocated by a sibling composer. Every admin composer
     *  (`<WorkspaceChatComposer />` on the hub, sheet, and full-screen route)
     *  fires `chatMessageCreate` directly so it can ride the full attachments
     *  + model-pick + approval-mode plumbing; after the mutation lands they
     *  hand the freshly-allocated chatId here. From then on the provider
     *  treats the chat as its own — the sheet's next send appends to the
     *  same row, and the live-updates listener is already mounted because
     *  `beginTurn()` ran before the mutation fired. */
    setChatIdFromHub: (chatId: string) => void;
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
    /** Model catalog + saved default. Shared by every admin composer. */
    chatConfig: WorkspaceChatConfig;
    /** The model the next admin send will use. Starts at
     *  `chatConfig.defaultModelId` and follows the dropdown on every
     *  surface. */
    selectedModelId: string;
    /** Picks a new model: updates `selectedModelId` immediately and
     *  fire-and-forget persists it as the new default. */
    onModelChange: (modelId: string) => void;
}

const WorkspaceAssistantChatContext = createContext<WorkspaceAssistantChatContextValue | null>(null);

export function useWorkspaceAssistantChat(): WorkspaceAssistantChatContextValue {
    const value = useContext(WorkspaceAssistantChatContext);
    if (!value) throw new Error('useWorkspaceAssistantChat must be used inside <WorkspaceAssistantChatProvider />');
    return value;
}

export function WorkspaceAssistantChatProvider({ children, chatConfig }: { children: ReactNode; chatConfig: WorkspaceChatConfig }) {
    const [isOpen, setOpen] = useState(false);
    const [chatId, setChatId] = useState<string | undefined>(undefined);
    const [loadedMessages, setLoadedMessages] = useState<ReadonlyArray<TranscriptMessage>>([]);
    const [highlightSignal, setHighlightSignal] = useState(0);
    const [selectedModelId, setSelectedModelId] = useState(chatConfig.defaultModelId);
    const live = useChatLiveUpdates(chatId);
    const [, setDefaultModel] = useMutation(WorkspaceChatConfigDefaultModelSetDocument);
    const urqlClient = useClient();

    const onModelChange = useCallback(
        (modelId: string) => {
            setSelectedModelId(modelId);
            // Fire-and-forget — a transport failure here is harmless: local
            // state already reflects the choice for this session, the next
            // route load just won't pick it up as the new default.
            void setDefaultModel({ modelId });
        },
        [setDefaultModel],
    );

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

    // Each admin composer mints its own `chatId` via the mutation; the
    // provider just adopts it through `setChatIdFromHub` so siblings see
    // the same value. Mirror into a ref so the back-to-back hub-open-then-
    // send path (`setChatIdFromHub` followed immediately by another send
    // from the sheet) reads the latest value without waiting on a render.
    const chatIdRef = useRef<string | undefined>(undefined);

    const open = useCallback(() => setOpen(true), []);

    const setChatIdFromHub = useCallback((id: string) => {
        // The hub composer already mounted the live-updates listener via
        // `beginTurn()` before firing its own mutation, so all the provider
        // needs to do is adopt the freshly-allocated chatId for future sends.
        chatIdRef.current = id;
        setChatId(id);
    }, []);

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
            setChatIdFromHub,
            resetChat,
            loadChat,
            highlightSignal,
            chatConfig,
            selectedModelId,
            onModelChange,
        }),
        [
            isOpen,
            open,
            chatId,
            loadedMessages,
            live,
            setChatIdFromHub,
            resetChat,
            loadChat,
            highlightSignal,
            chatConfig,
            selectedModelId,
            onModelChange,
        ],
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
