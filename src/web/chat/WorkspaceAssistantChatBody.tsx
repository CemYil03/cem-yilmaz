import { useLocation, useNavigate } from '@tanstack/react-router';
import { formatDistanceToNow, parseISO } from 'date-fns';
import {
    ArrowUpRightIcon,
    ExternalLinkIcon,
    ListIcon,
    MessageSquarePlusIcon,
    MessageSquareTextIcon,
    SearchIcon,
    XIcon,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from 'urql';
import { toFlatAnswerInput } from './chatAssistantInputKinds';
import { ChatTranscript } from './ChatTranscriptShared';
import type { TranscriptMessage } from './chatTranscript';
import { DocumentPanelProvider } from './DocumentPanelProvider';
import { useWorkspaceAssistantChat } from './WorkspaceAssistantChatProvider';
import { WorkspaceChatComposer } from './WorkspaceChatComposer';
import { bucketChatsByDay } from './workspaceChatListBuckets';
import { ExternalLinkConfirmationProvider } from '../components/AssistantMarkdown';
import { Button } from '../components/base/button';
import { Input } from '../components/base/input';
import { useSidebar } from '../components/base/sidebar';
import { Spinner } from '../components/base/spinner';
import { Tooltip, TooltipContent, TooltipTrigger } from '../components/base/tooltip';
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
//   2. Transcript — when a chat is loaded. "Back to chats" / "Open in its
//      own page" live in the sidebar chrome header (not above the
//      transcript) so the content column stays taller.
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
const backToChatsLabel = { de: 'Chats Übersicht', en: 'Chats Overview' };
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
    const admin = data?.sessionFindOne.user?.admin;
    const chats = admin?.adminChatFindMany ?? [];
    const totalCount = admin?.adminChatCount ?? 0;
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
            <div className="flex min-h-0 flex-1 flex-col scroll-fade-y overflow-y-auto pr-1 [scrollbar-gutter:stable]">
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
    const openStandalone = useOpenChatStandalone();
    // The row hosts two affordances that lead to different surfaces: the
    // whole surface peeks the chat inline (default click), and a tiny
    // hover-revealed action on the right hands off to the deep-link page
    // directly — for users who want the chat in its own reading column
    // without a first-peek stop. Nested `<button>` is invalid, so the outer
    // wrapper is a `<div>` and both actions are siblings; the row reserves
    // `pr-9` of right padding so the absolutely-positioned icon has its own
    // lane on the right, separate from the date underneath the title. The
    // group is named (`group/row`) because shadcn's `<Sidebar>` ancestor is
    // itself `.group` — an unnamed `group-hover:` here would match the
    // whole sidebar and light up every row's icon at once.
    return (
        <div className="group/row relative">
            <button
                type="button"
                onClick={() => void onResume(chat.chatId)}
                className="flex w-full cursor-pointer items-center gap-2 rounded-md border border-input bg-white px-3 py-2 pr-9 text-left text-sm group-hover/row:bg-accent dark:bg-black"
            >
                <MessageSquareTextIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-foreground">{title}</span>
                    <span className="text-xs text-muted-foreground">{relative}</span>
                </span>
            </button>
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        type="button"
                        onClick={(event) => {
                            // The outer peek button covers this cell; stop
                            // the click so we don't fire `onResume` on the
                            // way out — the standalone hand-off already
                            // dismisses the sidebar itself.
                            event.stopPropagation();
                            openStandalone(chat.chatId);
                        }}
                        aria-label={openStandaloneLabel[locale]}
                        className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 cursor-pointer place-items-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-background hover:text-foreground focus-visible:opacity-100 group-hover/row:opacity-100"
                    >
                        <ArrowUpRightIcon className="size-4" aria-hidden />
                    </button>
                </TooltipTrigger>
                <TooltipContent side="left">{openStandaloneLabel[locale]}</TooltipContent>
            </Tooltip>
        </div>
    );
}

// --- Loaded-state affordances ------------------------------------------------
//
// Icon buttons that live in the sidebar chrome header (top-right, next to
// "Hide assistant") when a chat is loaded: "Back to chats" (list icon;
// calls `resetChat` so the browser is on screen again) and "Open in its own
// page" (navigates to `/workspace/assistant/<chatId>`, closes the sidebar,
// and resets the provider so the same chat is not visible in two places at
// once). Keeping them in the chrome frees a vertical row above the transcript.

// Shared hand-off used by both the loaded-state header actions (chat already
// on screen in the sidebar) and the hover action on each browser row (chat
// not yet loaded). In either case the deep-link route is about to mount, so
// we dismiss the sidebar (mobile Sheet or desktop dock) and drop whatever
// chat the provider is holding — otherwise the URL and the docked column
// would both render the same conversation, and a later workspace-page visit
// would silently restore the just-handed-off chat in the sidebar. Row usage
// may pass a chatId that isn't the currently-loaded one (or the provider may
// be empty); calling `resetChat` in that case is a no-op either way.
function useOpenChatStandalone() {
    const { resetChat } = useWorkspaceAssistantChat();
    const { isMobile, setOpen, setOpenMobile } = useSidebar();
    const navigate = useNavigate();
    return useCallback(
        (chatId: string) => {
            if (isMobile) setOpenMobile(false);
            else setOpen(false);
            resetChat();
            void navigate({ to: '/{-$locale}/workspace/assistant/$chatId', params: { chatId } });
        },
        [isMobile, navigate, resetChat, setOpen, setOpenMobile],
    );
}

const sidebarHeaderActionClassName =
    'grid size-7 cursor-pointer place-items-center rounded-md text-sidebar-foreground/70 transition-opacity hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus:outline-hidden focus:ring-2 focus:ring-sidebar-ring focus:ring-offset-2 focus:ring-offset-sidebar';

export function WorkspaceAssistantChatLoadedHeaderActions({ locale }: { locale: Locale }) {
    const { chatId, resetChat } = useWorkspaceAssistantChat();
    const openStandalone = useOpenChatStandalone();

    const onOpenStandalone = useCallback(() => {
        if (!chatId) return;
        openStandalone(chatId);
    }, [chatId, openStandalone]);

    if (!chatId) return null;
    return (
        <>
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        type="button"
                        onClick={resetChat}
                        aria-label={backToChatsLabel[locale]}
                        className={sidebarHeaderActionClassName}
                    >
                        <ListIcon className="size-4" aria-hidden />
                    </button>
                </TooltipTrigger>
                <TooltipContent>{backToChatsLabel[locale]}</TooltipContent>
            </Tooltip>
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        type="button"
                        onClick={onOpenStandalone}
                        aria-label={openStandaloneLabel[locale]}
                        className={sidebarHeaderActionClassName}
                    >
                        <ExternalLinkIcon className="size-4" aria-hidden />
                    </button>
                </TooltipTrigger>
                <TooltipContent>{openStandaloneLabel[locale]}</TooltipContent>
            </Tooltip>
        </>
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
            isLocked={live.isGenerating(chatId)}
            beginTurn={live.beginTurn}
            bindTurn={live.bindTurn}
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
                            <Button variant="ghost" type="button" onClick={resetChat} aria-label={newChatLabel[locale]}>
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
// Thin wrapper over the shared `<ChatTranscript />` that wires in the admin
// mutation handlers (tool-approval + input-collection responses). Every other
// scrolling concern — stick-to-bottom, jump-to-latest, per-turn anchoring —
// lives in the shared component. See `docs/styles/chat.md`.

export function WorkspaceAssistantChatTranscript({
    messages,
    streamingTexts,
    locale,
}: {
    messages: ReadonlyArray<TranscriptMessage>;
    streamingTexts: Readonly<Record<string, string>>;
    locale: Locale;
}) {
    const { chatId, live, openFile } = useWorkspaceAssistantChat();
    const [, respondToCollection] = useMutation(WorkspaceChatInputCollectionRespondDocument);
    const [, respondToApproval] = useMutation(WorkspaceChatToolApprovalRespondDocument);
    // Clicking a document attachment switches the sidebar to its file-display
    // state (owned by the provider) — same surface, no navigation. See
    // `docs/features/workspace-files.md`.
    const documentPanel = useMemo(() => ({ openDocument: openFile, canOpen: true }), [openFile]);

    const onCollectionSubmit = useCallback(
        async (collectionMessageId: string, answers: ReadonlyArray<{ inputId: string; value: GqlCChatAssistantInputValue }>) => {
            const generationId = live.beginTurn(chatId);
            const flatAnswers = answers.map((answer) => toFlatAnswerInput(answer.inputId, answer.value));
            const result = await respondToCollection({
                collectionMessageId,
                answers: flatAnswers,
                generationId,
                requireToolCallApprovals: false,
            });
            if (result.error) live.endTurn(generationId);
        },
        [respondToCollection, live, chatId],
    );

    const onApprovalRespond = useCallback(
        async (approvalId: string, approved: boolean, reason?: string) => {
            const generationId = live.beginTurn(chatId);
            const result = await respondToApproval({
                approvalId,
                approved,
                reason,
                generationId,
                requireToolCallApprovals: true,
            });
            if (result.error) live.endTurn(generationId);
        },
        [respondToApproval, live, chatId],
    );

    return (
        <div className="relative min-h-0 min-w-0 flex-1">
            {/* Scrollbar gutter + rightmost-column breathing room live inside
             *  the shared `ChatTranscriptShell` — every surface inherits them
             *  so a new transcript can't accidentally paint the scrollbar over
             *  the rightmost bubbles. See docs/styles/chat.md. */}
            {/* The workspace assistant links only to the admin's own trusted
             *  surfaces, so external-link confirmation is off here — see
             *  `ExternalLinkConfirmationProvider` in `AssistantMarkdown.tsx`. */}
            <ExternalLinkConfirmationProvider enabled={false}>
                <DocumentPanelProvider value={documentPanel}>
                    <ChatTranscript
                        messages={messages}
                        streamingTexts={streamingTexts}
                        reasoningTexts={live.reasoningTextsFor(chatId)}
                        onCollectionSubmit={onCollectionSubmit}
                        onApprovalRespond={onApprovalRespond}
                        jumpToLatestLabel={jumpToLatestLabel[locale]}
                        locale={locale}
                        isGenerating={live.isGenerating(chatId)}
                        liveTurnMessageIds={live.liveTurnMessageIdsFor(chatId)}
                    />
                </DocumentPanelProvider>
            </ExternalLinkConfirmationProvider>
        </div>
    );
}
