import { useLocation, useNavigate } from '@tanstack/react-router';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import {
    ArrowDownIcon,
    ChevronLeftIcon,
    ExternalLinkIcon,
    MessageSquarePlusIcon,
    MessageSquareTextIcon,
    SearchIcon,
    XIcon,
} from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
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
import { bucketChatsByDay } from './workspaceChatListBuckets';
import { AssistantMarkdown } from '../components/AssistantMarkdown';
import { Button } from '../components/base/button';
import { Input } from '../components/base/input';
import { useSidebar } from '../components/base/sidebar';
import { Spinner } from '../components/base/spinner';
import { Tooltip, TooltipContent, TooltipTrigger } from '../components/base/tooltip';
import { ChatMessage } from '../components/chat-message';
import type { GqlCChatAssistantInputValue, GqlCWorkspaceChatListItemFragment } from '../graphql/generated';
import {
    WorkspaceAssistantChatsPageDocument,
    WorkspaceChatInputCollectionRespondDocument,
    WorkspaceChatToolApprovalRespondDocument,
} from '../graphql/generated';
import { DATE_FNS_LOCALE } from '../utils/dateFnsLocale';
import type { Locale } from '../utils/locale';

// Shared inner body for both the workspace-assistant Sheet (narrow viewports)
// and Sidebar (`lg+`). The layout has three surfaces:
//
//   1. Chat browser — when no chat is loaded. Search input + paginated
//      list backed by `WorkspaceAssistantChatsPage`, "Show more" pulls the
//      next page in place.
//   2. Transcript — when a chat is loaded, with a "Back to chats" affordance
//      at the top that calls `resetChat` on the provider.
//   3. Composer — always mounted at the bottom, in the footer.
//
// All state lives on `WorkspaceAssistantChatProvider`, so mounting this body
// twice (e.g. mid-breakpoint swap) is safe — both mounts read the same
// chatId, loadedMessages, and live updates.

const jumpToLatestLabel = { de: 'Zum neuesten springen', en: 'Jump to latest' };
const newChatLabel = { de: 'Neuen Chat starten', en: 'Start new chat' };
const untitledLabel = { de: 'Ohne Titel', en: 'Untitled' };
const noPreviousChatsLabel = { de: 'Noch keine Chats.', en: 'No chats yet.' };
const noSearchResultsLabel = { de: 'Keine Treffer.', en: 'No results.' };
const searchPlaceholderLabel = { de: 'Chats durchsuchen…', en: 'Search chats…' };
const searchClearLabel = { de: 'Suche zurücksetzen', en: 'Clear search' };
const showMoreLabel = { de: 'Mehr anzeigen', en: 'Show more' };
const backToChatsLabel = { de: 'Zurück zu den Chats', en: 'Back to chats' };
const openStandaloneLabel = { de: 'In eigener Seite öffnen', en: 'Open in its own page' };

// Sidebar chat browser pages by ten. The server clamps aggressively so we
// couldn't ask for much more per page anyway; ten is what fits on one
// vertical screen of the sidebar.
const CHATS_PAGE_SIZE = 10;
// Debounce the search input so the user's typing doesn't fire a request
// per keystroke. 300ms is the standard here — matches the media-page
// search field in `src/routes/{-$locale}/workspace/media.tsx`.
const SEARCH_DEBOUNCE_MS = 300;

// --- Chat browser ------------------------------------------------------------
//
// Rendered when the provider has no active chat. The user searches / picks
// a chat, `loadChat(chatId)` swaps in the transcript. A fresh conversation
// is started via the composer in the footer — no separate "new chat"
// button up here because typing into the composer already does that.

export function WorkspaceAssistantChatBrowser({ locale }: { locale: Locale }) {
    const { loadChat } = useWorkspaceAssistantChat();
    const [rawQuery, setRawQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    // How many pages we've asked for beyond the first — 0 means only the
    // first page is on screen. Every "Show more" click increments and
    // triggers a follow-up query at `offset = accumulated`. Reset to zero
    // whenever the search term changes so a new query starts fresh.
    const [loadedCount, setLoadedCount] = useState(CHATS_PAGE_SIZE);

    useEffect(() => {
        const trimmed = rawQuery.trim();
        const id = window.setTimeout(() => {
            setDebouncedQuery(trimmed);
            setLoadedCount(CHATS_PAGE_SIZE);
        }, SEARCH_DEBOUNCE_MS);
        return () => window.clearTimeout(id);
    }, [rawQuery]);

    const trimmedQuery = debouncedQuery.trim();

    // `cache-and-network` keeps the list reactive across fresh sends: a
    // completed turn bumps `lastModifiedAt`, which reorders the paged
    // result on the next return to the browser without a hard reload.
    const [{ data, fetching }] = useQuery({
        query: WorkspaceAssistantChatsPageDocument,
        variables: { limit: loadedCount, offset: 0, query: trimmedQuery.length > 0 ? trimmedQuery : null },
        requestPolicy: 'cache-and-network',
    });
    const admin = data?.currentSession.user?.admin;
    const chats = admin?.chats ?? [];
    const totalCount = admin?.chatsCount ?? 0;
    // Server hides the "Show more" affordance once the loaded window
    // covers every matching row for the current query. Comparing counts
    // is enough because we always request `offset: 0` and grow `limit` —
    // the client never holds a stitched-together view of independent
    // pages, so there's no need to track cumulative offsets here.
    const hasMore = chats.length < totalCount;
    const buckets = useMemo(() => bucketChatsByDay(chats), [chats]);

    const showMore = useCallback(() => setLoadedCount((n) => n + CHATS_PAGE_SIZE), []);

    return (
        <div className="flex min-h-0 flex-1 flex-col gap-3">
            <SearchField value={rawQuery} onChange={setRawQuery} locale={locale} />
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pr-1 [scrollbar-gutter:stable]">
                {chats.length === 0 ? (
                    <EmptyResultsState locale={locale} fetching={fetching} hasQuery={trimmedQuery.length > 0} />
                ) : (
                    <ul className="flex flex-col gap-4">
                        {buckets.map((bucket) => (
                            <li key={bucket.key} className="flex flex-col gap-1.5">
                                <h3 className="px-1 text-[11px] uppercase tracking-wide text-muted-foreground">{bucket.label[locale]}</h3>
                                <ul className="flex flex-col gap-1">
                                    {bucket.chats.map((chat) => (
                                        <li key={chat.chatId}>
                                            <ChatBrowserRow chat={chat} locale={locale} onResume={loadChat} />
                                        </li>
                                    ))}
                                </ul>
                            </li>
                        ))}
                    </ul>
                )}
                {hasMore ? (
                    <div className="mt-3 grid place-items-center">
                        <Button variant="ghost" size="sm" onClick={showMore} disabled={fetching}>
                            {fetching ? <Spinner className="size-4" /> : null}
                            {showMoreLabel[locale]}
                        </Button>
                    </div>
                ) : null}
            </div>
        </div>
    );
}

function SearchField({ value, onChange, locale }: { value: string; onChange: (next: string) => void; locale: Locale }) {
    return (
        <div className="relative">
            <SearchIcon
                className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
            />
            <Input
                type="search"
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={searchPlaceholderLabel[locale]}
                aria-label={searchPlaceholderLabel[locale]}
                // WebKit renders its own clear-X inside `type="search"` inputs
                // (visible in Chromium and Safari). We already render our own
                // clear button on the right, so the native one is a second,
                // stylistically off-brand affordance right next to it —
                // suppress it. `type="search"` still gets us Escape-clear +
                // the accessible semantics.
                className="pl-8 pr-9 [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none"
            />
            {value.length > 0 ? (
                <button
                    type="button"
                    onClick={() => onChange('')}
                    aria-label={searchClearLabel[locale]}
                    className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                    <XIcon className="size-3.5" />
                </button>
            ) : null}
        </div>
    );
}

function EmptyResultsState({ locale, fetching, hasQuery }: { locale: Locale; fetching: boolean; hasQuery: boolean }) {
    // While the first fetch is in flight we hold the "no chats" line back
    // — showing it during the initial spinner reads as "the search hit
    // nothing" which is misleading. Once data arrives the wording splits:
    // a query with zero rows says "no results", the pristine list says
    // "no chats yet".
    if (fetching) {
        return (
            <div className="grid place-items-center py-6 text-xs text-muted-foreground">
                <Spinner className="size-4" />
            </div>
        );
    }
    return (
        <p className="px-1 py-4 text-xs text-muted-foreground">{hasQuery ? noSearchResultsLabel[locale] : noPreviousChatsLabel[locale]}</p>
    );
}

function ChatBrowserRow({
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

// --- Loaded-state affordances ------------------------------------------------
//
// A small row above the transcript with two actions: "Back to chats" (calls
// `resetChat` on the provider so the browser is on screen again) and "Open
// in its own page" (navigates to `/workspace/assistant/<chatId>`, closes the
// sidebar, and resets the provider so the same chat is not visible in two
// places at once).

export function WorkspaceAssistantChatLoadedHeader({ locale }: { locale: Locale }) {
    const { chatId, resetChat, live } = useWorkspaceAssistantChat();
    const { isMobile, setOpen, setOpenMobile } = useSidebar();
    const navigate = useNavigate();

    // Hand-off to the deep-link route. Without dismissing the sidebar the
    // same conversation would render twice — once in the docked column,
    // once inline in the newly-mounted route — and returning to a
    // workspace page would silently restore the just-handed-off chat in
    // the sidebar. Close the sidebar (mobile Sheet or desktop dock) and
    // reset the provider so the URL is the sole source of truth from
    // this click onward.
    const onOpenStandalone = useCallback(() => {
        if (!chatId) return;
        if (isMobile) setOpenMobile(false);
        else setOpen(false);
        resetChat();
        void navigate({ to: '/{-$locale}/workspace/assistant/$chatId', params: { chatId } });
    }, [chatId, isMobile, navigate, resetChat, setOpen, setOpenMobile]);

    if (!chatId) return null;
    return (
        <div className="flex items-center justify-between gap-2">
            <button
                type="button"
                onClick={resetChat}
                disabled={live.isGenerating}
                className="inline-flex items-center gap-1 rounded-md px-1 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
                <ChevronLeftIcon className="size-3.5" aria-hidden />
                {backToChatsLabel[locale]}
            </button>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={onOpenStandalone}
                        disabled={live.isGenerating}
                        aria-label={openStandaloneLabel[locale]}
                    >
                        <ExternalLinkIcon />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>{openStandaloneLabel[locale]}</TooltipContent>
            </Tooltip>
        </div>
    );
}

// --- Composer ----------------------------------------------------------------
//
// Same `<WorkspaceChatComposer />` the hub and the deep-link route use, so
// the model dropdown, attachments, and approval-mode selector all match
// across surfaces. The composer hands its provider-owned `chatId` in and
// adopts the freshly-allocated id on first send via `setChatIdFromHub` so
// subsequent sends append to the same row. The "new chat" button lives in
// the `addonStart` slot and is the only affordance in the sidebar for
// dropping the current chat while keeping the composer up.

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
                            <Button
                                variant="ghost"
                                type="button"
                                onClick={resetChat}
                                disabled={live.isGenerating}
                                aria-label={newChatLabel[locale]}
                            >
                                <MessageSquarePlusIcon className="size-4" />
                            </Button>
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
// Same stick-to-bottom + jump-to-latest behaviour as the deep-link route.
// Tool-approval responses need the admin mutation, so the transcript owns
// its own handlers.

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
        <div className="relative min-h-0 min-w-0 flex-1">
            {/* `scrollbar-gutter: stable` reserves the scrollbar column at
             *  all times so the vertical scrollbar sits in its own lane
             *  instead of overlapping the rightmost message bubbles when it
             *  appears. `pr-3` gives the bubbles breathing room between
             *  content and gutter. */}
            <div
                ref={scrollRef}
                onScroll={onScroll}
                className="flex h-full min-w-0 flex-col gap-4 overflow-y-auto overflow-x-hidden pr-3 [scrollbar-gutter:stable]"
            >
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
