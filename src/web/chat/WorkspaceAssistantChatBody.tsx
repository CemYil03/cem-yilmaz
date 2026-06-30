import { Link, useLocation } from '@tanstack/react-router';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { de as deLocale, enUS as enLocale } from 'date-fns/locale';
import { ArrowDownIcon, ArrowUpRightIcon, MessageSquarePlusIcon, MessageSquareTextIcon } from 'lucide-react';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from 'urql';
import { toFlatAnswerInput } from './chatAssistantInputKinds';
import type { TranscriptMessage } from './chatTranscript';
import {
    findLatestCollectionId,
    findPendingApprovalIds,
    findUserInputByCollectionId,
    groupMessagesByDate,
    partitionByParent,
} from './chatTranscript';
import { useWorkspaceAssistantChat } from './WorkspaceAssistantChatProvider';
import { WorkspaceChatComposer } from './WorkspaceChatComposer';
import { AssistantMarkdown } from '../components/AssistantMarkdown';
import { Tooltip, TooltipContent, TooltipTrigger } from '../components/base/tooltip';
import { ChatMessage } from '../components/chat-message';
import type { GqlCChatAssistantInputValue, GqlCWorkspaceChatListItemFragment } from '../graphql/generated';
import {
    WorkspaceAssistantChatsDocument,
    WorkspaceChatInputCollectionRespondDocument,
    WorkspaceChatToolApprovalRespondDocument,
} from '../graphql/generated';
import type { Locale } from '../utils/locale';

// Shared inner body for both the workspace-assistant Sheet (narrow viewports)
// and Sidebar (`lg+`). Owns the transcript, the empty state with the
// recent-chats list, and the composer. The outer chrome (Sheet vs Sidebar
// frame, expand toggles, full-screen handoff) lives in each wrapper.
//
// All state lives on `WorkspaceAssistantChatProvider`, so mounting this body
// twice (e.g. mid-breakpoint swap) is safe — both mounts read the same
// chatId, loadedMessages, and live updates.

const jumpToLatestLabel = { de: 'Zum neuesten springen', en: 'Jump to latest' };
const newChatLabel = { de: 'Neuen Chat starten', en: 'Start new chat' };
const previousChatsLabel = { de: 'Frühere Chats', en: 'Previous chats' };
const allChatsLabel = { de: 'Alle Chats ansehen', en: 'View all chats' };
const untitledLabel = { de: 'Ohne Titel', en: 'Untitled' };
const noPreviousChatsLabel = { de: 'Noch keine Chats.', en: 'No chats yet.' };

const DATE_FNS_LOCALE: Record<Locale, typeof deLocale> = { de: deLocale, en: enLocale };

// Recent-chats fan-out cap. The query returns every admin chat newest-first;
// the empty state renders a small at-a-glance list, so we slice to ten.
// Mirrored on `/workspace/assistant` — once the list grows past a screen of
// rows, all surfaces should switch to a scrollable column together rather
// than nudging this number up.
const RECENT_CHATS_LIMIT = 10;

export function WorkspaceAssistantChatEmptyState({
    locale,
    onNavigateAway,
}: {
    locale: Locale;
    /** Fired when the user follows the "View all chats" link out to
     *  `/workspace/assistant`. The Sheet uses this to close itself; the
     *  Sidebar has no overlay to dismiss and passes a no-op. */
    onNavigateAway?: () => void;
}) {
    const { loadChat } = useWorkspaceAssistantChat();
    // Show the most-recent chats so the admin can resume one in place
    // instead of jumping out to the dedicated route just to find a row.
    // `cache-and-network` keeps the list reactive — a fresh send updates
    // `lastModifiedAt`, the next time the empty state mounts the resumed
    // chat lands at the top without a hard reload.
    const [{ data }] = useQuery({ query: WorkspaceAssistantChatsDocument, requestPolicy: 'cache-and-network' });
    const chats = (data?.currentSession.user?.admin?.chats ?? []).slice(0, RECENT_CHATS_LIMIT);

    return (
        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto pr-2">
            <div className="grid place-items-center py-6 text-sm text-muted-foreground">
                <p>{{ de: 'Wie kann ich helfen?', en: 'How can I help?' }[locale]}</p>
            </div>
            <section className="flex flex-col gap-2">
                <div className="flex items-baseline justify-between gap-3">
                    <h3 className="text-xs uppercase tracking-wide text-muted-foreground">{previousChatsLabel[locale]}</h3>
                    <Link
                        to="/{-$locale}/workspace/assistant"
                        search={{ chatId: undefined }}
                        onClick={onNavigateAway}
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                    >
                        {allChatsLabel[locale]}
                        <ArrowUpRightIcon className="size-3" aria-hidden />
                    </Link>
                </div>
                {chats.length === 0 ? (
                    <p className="text-xs text-muted-foreground">{noPreviousChatsLabel[locale]}</p>
                ) : (
                    <ul className="flex flex-col gap-1.5">
                        {chats.map((chat) => (
                            <li key={chat.chatId}>
                                <PreviousChatButton chat={chat} locale={locale} onResume={loadChat} />
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </div>
    );
}

function PreviousChatButton({
    chat,
    locale,
    onResume,
}: {
    chat: GqlCWorkspaceChatListItemFragment;
    locale: Locale;
    onResume: (chatId: string) => void | Promise<void>;
}) {
    const relative = formatDistanceToNow(parseISO(chat.lastModifiedAt as unknown as string), {
        addSuffix: true,
        locale: DATE_FNS_LOCALE[locale],
    });
    const title = chat.title.trim() ? chat.title : untitledLabel[locale];
    return (
        <button
            type="button"
            onClick={() => void onResume(chat.chatId)}
            className="flex w-full cursor-pointer items-center gap-2 rounded-md border border-input bg-white px-3 py-2 text-left text-sm hover:bg-accent dark:bg-black"
        >
            <MessageSquareTextIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-foreground">{title}</span>
                <span className="text-xs text-muted-foreground">{relative}</span>
            </span>
        </button>
    );
}

// --- Composer ----------------------------------------------------------------
//
// Same `<WorkspaceChatComposer />` the hub and `/workspace/assistant` use, so
// the model dropdown, attachments, and approval-mode selector all match
// across surfaces. The composer hands its provider-owned `chatId` in and
// adopts the freshly-allocated id on first send via `setChatIdFromHub` so
// subsequent sends append to the same row. The "new chat" button is
// surface-specific and lives in the `addonStart` slot.

export function WorkspaceAssistantChatComposer({ locale }: { locale: Locale }) {
    const { chatId, live, setChatIdFromHub, resetChat } = useWorkspaceAssistantChat();
    // The body is mounted at the workspace layout, so `useLocation()` here
    // tracks whichever workspace route the user has open behind the
    // sidebar / sheet. Forwarded to the agent's system prompt so short
    // references ("this project", "what am I looking at") resolve against
    // the surface the user was on when they hit Send. See
    // `docs/features/chat-workspace.md`.
    const { pathname } = useLocation();
    const hasChat = !!chatId;
    return (
        <WorkspaceChatComposer
            locale={locale}
            chatId={chatId}
            isLocked={live.isGenerating}
            beginTurn={live.beginTurn}
            endTurn={live.endTurn}
            onMessageSent={setChatIdFromHub}
            currentPagePath={pathname}
            // Body mounts fresh whenever the wrapper does (e.g. Sheet
            // close→open re-mounts) → focus the textarea so the user can
            // start typing immediately without first reaching for the input.
            autoFocus
            addonStart={
                hasChat ? (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                type="button"
                                onClick={resetChat}
                                disabled={live.isGenerating}
                                aria-label={newChatLabel[locale]}
                                className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <MessageSquarePlusIcon className="size-4" />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="top">{newChatLabel[locale]}</TooltipContent>
                    </Tooltip>
                ) : null
            }
        />
    );
}

// --- Transcript --------------------------------------------------------------
//
// Same stick-to-bottom + jump-to-latest behaviour as the other transcript
// surfaces. Tool-approval responses still need the admin mutation, so the
// transcript owns its own handlers (the visitor sheet bundles its own
// because the mutations differ).

export function WorkspaceAssistantChatTranscript({
    messages,
    streamingTexts,
    locale,
}: {
    messages: ReadonlyArray<TranscriptMessage>;
    streamingTexts: Readonly<Record<string, string>>;
    locale: Locale;
}) {
    const { live } = useWorkspaceAssistantChat();
    const [, respondToCollection] = useMutation(WorkspaceChatInputCollectionRespondDocument);
    const [, respondToApproval] = useMutation(WorkspaceChatToolApprovalRespondDocument);

    const onCollectionSubmit = useCallback(
        async (collectionMessageId: string, answers: ReadonlyArray<{ inputId: string; value: GqlCChatAssistantInputValue }>) => {
            const generationId = live.beginTurn();
            const flatAnswers = answers.map((answer) => toFlatAnswerInput(answer.inputId, answer.value));
            await respondToCollection({
                collectionMessageId,
                answers: flatAnswers,
                generationId,
                requireToolCallApprovals: false,
            });
        },
        [respondToCollection, live],
    );

    const onApprovalRespond = useCallback(
        async (approvalId: string, approved: boolean, reason?: string) => {
            const generationId = live.beginTurn();
            await respondToApproval({
                approvalId,
                approved,
                reason,
                generationId,
                requireToolCallApprovals: true,
            });
        },
        [respondToApproval, live],
    );

    const latestCollectionId = findLatestCollectionId(messages);
    const pendingApprovalIds = findPendingApprovalIds(messages);
    const userInputByCollection = findUserInputByCollectionId(messages);
    // Children rendered under their parent's `<ChatMessageToolCall>` — filter
    // them out of the day-grouped top level. See
    // `docs/architecture/agent-delegation.md` ("Nested tool calls").
    const { topLevel, childrenByParentId } = partitionByParent(messages);
    const groupedMessages = groupMessagesByDate(topLevel);
    const streamingEntries = Object.entries(streamingTexts);

    const scrollRef = useRef<HTMLDivElement>(null);
    const [isAtBottom, setIsAtBottom] = useState(true);
    const isAtBottomRef = useRef(true);
    const lastContentSignature = `${messages.length}|${streamingEntries.map(([id, text]) => `${id}:${text.length}`).join(',')}`;

    useLayoutEffect(() => {
        if (!isAtBottomRef.current) return;
        const el = scrollRef.current;
        if (!el) return;
        el.scrollTop = el.scrollHeight;
    }, [lastContentSignature]);

    const onScroll = useCallback(() => {
        const el = scrollRef.current;
        if (!el) return;
        const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
        const next = distanceFromBottom < 64;
        if (next !== isAtBottomRef.current) {
            isAtBottomRef.current = next;
            setIsAtBottom(next);
        }
    }, []);

    const jumpToLatest = useCallback(() => {
        const el = scrollRef.current;
        if (!el) return;
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }, []);

    return (
        <div className="relative min-h-0 min-w-0">
            <div ref={scrollRef} onScroll={onScroll} className="flex h-full min-w-0 flex-col gap-4 overflow-y-auto overflow-x-hidden pr-2">
                {groupedMessages.map((group) => (
                    <section key={group.date} className="flex min-w-0 flex-col gap-4">
                        <DateSeparator iso={group.date} />
                        {group.messages.map((message) => {
                            const approvalRespondHandler =
                                message.__typename === 'ChatMessageToolApprovalRequest' && pendingApprovalIds.has(message.approvalId)
                                    ? onApprovalRespond
                                    : undefined;
                            const collectionUserInput =
                                message.__typename === 'ChatMessageAssistantInputCollection'
                                    ? userInputByCollection.get(message.chatMessageId)
                                    : undefined;
                            const children =
                                message.__typename === 'ChatMessageToolCall' ? childrenByParentId.get(message.chatMessageId) : undefined;
                            return (
                                <ChatMessage
                                    key={message.chatMessageId}
                                    message={message}
                                    isInteractiveCollection={
                                        message.__typename === 'ChatMessageAssistantInputCollection' &&
                                        message.chatMessageId === latestCollectionId
                                    }
                                    collectionUserInput={collectionUserInput}
                                    onCollectionSubmit={onCollectionSubmit}
                                    onApprovalRespond={approvalRespondHandler}
                                    children={children}
                                />
                            );
                        })}
                    </section>
                ))}
                {streamingEntries.length > 0 ? (
                    <section className="flex min-w-0 flex-col gap-4">
                        {streamingEntries.map(([streamingId, text]) => (
                            <AssistantMarkdown key={streamingId} text={text} streaming />
                        ))}
                    </section>
                ) : null}
            </div>
            {!isAtBottom ? (
                <button
                    type="button"
                    onClick={jumpToLatest}
                    aria-label={jumpToLatestLabel[locale]}
                    className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-input bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-md hover:bg-accent"
                >
                    <ArrowDownIcon className="size-3.5" />
                    {jumpToLatestLabel[locale]}
                </button>
            ) : null}
        </div>
    );
}

function DateSeparator({ iso }: { iso: string }) {
    return (
        <div className="flex items-center gap-3 text-[11px] uppercase tracking-wide text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            <time dateTime={iso}>{format(parseISO(iso), 'PP')}</time>
            <span className="h-px flex-1 bg-border" />
        </div>
    );
}
