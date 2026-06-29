import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { de as deLocale, enUS as enLocale } from 'date-fns/locale';
import { ArrowDownIcon, Maximize2Icon, MessageSquareTextIcon, Minimize2Icon, PlusIcon, SparklesIcon } from 'lucide-react';
import { useMutation, useQuery } from 'urql';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../components/base/sheet';
import { Spinner } from '../components/base/spinner';
import { AssistantMarkdown } from '../components/AssistantMarkdown';
import { ChatMessage } from '../components/chat-message';
import type {
    GqlCChatAssistantInputValue,
    GqlCChatPageQuery,
    GqlCVisitorChatListItemFragment,
    GqlCVisitorChatQuotaFieldsFragment,
} from '../graphql/generated';
import {
    ChatInputCollectionRespondDocument,
    ChatMessageCreateDocument,
    ChatPageDocument,
    ChatToolApprovalRespondDocument,
    VisitorPreviousChatsDocument,
} from '../graphql/generated';
import { useIsMobile } from '../hooks/use-mobile';
import { useVisualViewport } from '../hooks/useVisualViewport';
import { cn } from '../utils/cn';
import type { Locale } from '../utils/locale';
import { toFlatAnswerInput } from './chatAssistantInputKinds';
import { ChatComposer } from './ChatComposer';
import type { TranscriptMessage } from './chatTranscript';
import {
    findLatestCollectionId,
    findPendingApprovalIds,
    findUserInputByCollectionId,
    groupMessagesByDate,
    mergeTranscriptMessages,
} from './chatTranscript';
import { useChatLiveUpdates } from './useChatLiveUpdates';
import { useVisitorChat } from './VisitorChatProvider';
import type { VisitorChatIntent } from './VisitorChatProvider';
import { Button } from '../components/base/button';

// Visitor-facing AI chat surface. Mounted once at the root layout — see
// `__root.tsx` — so any surface can open it via `useVisitorChat()` without
// duplicating the sheet tree. The route under `/workspace/assistant` is a
// distinct surface that talks to the personal-assistant agent through the
// `admin.*` namespace — this sheet uses the visitor (non-admin) GraphQL ops
// so the server dispatches to `agentVisitorAboutCem`. See
// `docs/features/chat-visitor.md`.
//
// The sheet reads its open state from `useVisitorChat()`. The `intent`
// decides what we render on the open transition:
//
//   - `'empty'`  → empty state with previous-chats list + composer. Header
//                  button opens this way.
//   - `'seeded'` → fire the seeded question through `chatMessageCreate` on
//                  mount, then drop into the loaded view once `chatId`
//                  lands. Landing-page composer + suggestion chips open
//                  this way.
//   - `'loaded'` → already pointed at a specific chat. Skip the seed-send
//                  and render the loaded transcript directly. "Previous
//                  chats" rows in the empty state open this way.
//
// Why a sheet and not a dialog: a chat is an ongoing side conversation,
// not a modal decision the user must resolve. A right-side sheet reads as
// "a panel that slides in alongside what I was doing" — which matches
// every native chat UI a visitor has seen. On mobile the sheet is full-
// screen by default with no card padding; on desktop it sits in a narrow
// `sm:max-w-2xl` column with an expand toggle for power readers.
//
// Radix's `Sheet` (a Dialog underneath) unmounts its children on close, so
// every fresh open gets a fresh `ChatSurface` instance — no manual reset
// of the seeded-once ref or chatId.

const newChatLabel = { de: 'Neuer Chat', en: 'New chat' };

const DATE_FNS_LOCALE: Record<Locale, typeof deLocale> = { de: deLocale, en: enLocale };

interface WebsiteVisitorAssistantChatSheetProps {
    locale: Locale;
}

export function WebsiteVisitorAssistantChatSheet({ locale }: WebsiteVisitorAssistantChatSheetProps) {
    const { isOpen, intent, close } = useVisitorChat();

    // Desktop-only expand toggle. Mobile is always full-bleed; the toggle
    // is hidden under `sm`. Reset to the default narrow width whenever the
    // sheet closes — opening fresh shouldn't surprise the visitor with a
    // previously-expanded layout.
    const [isExpanded, setIsExpanded] = useState(false);
    useEffect(() => {
        if (!isOpen) setIsExpanded(false);
    }, [isOpen]);

    // Mobile keyboard fit. The sheet is portal-mounted with `inset-y-0 h-full`,
    // which sizes against the layout viewport — that does not shrink when
    // iOS Safari's soft keyboard appears, so the browser auto-scrolls the
    // focused textarea into view and drags the header off the top. Driving
    // the sheet's height + top from `window.visualViewport` while open keeps
    // the header pinned at the top of the visible area, lets the transcript
    // shrink in the middle, and parks the composer just above the keyboard.
    // Desktop keeps the original `h-full` layout — the expand toggle still
    // needs the sheet to fill the layout viewport.
    const isMobile = useIsMobile();
    const visualViewport = useVisualViewport();
    const mobileViewportStyle =
        isMobile && isOpen && visualViewport ? { height: visualViewport.height, top: visualViewport.offsetTop } : undefined;

    return (
        <Sheet
            open={isOpen}
            onOpenChange={(next) => {
                if (!next) close();
            }}
        >
            <SheetContent
                side="right"
                className={cn('flex w-full flex-col gap-0 p-0', isExpanded ? 'sm:max-w-none' : 'sm:max-w-2xl')}
                style={mobileViewportStyle}
            >
                {/* Desktop-only expand toggle. Lives on the absolute layer
                 *  beside the Sheet's built-in close (top-4 right-4); we sit
                 *  at right-12 so the two glyphs don't overlap. Hidden under
                 *  `sm` — mobile is already full-bleed. */}
                <button
                    type="button"
                    onClick={() => setIsExpanded((value) => !value)}
                    aria-label={
                        isExpanded
                            ? { de: 'Chat verkleinern', en: 'Collapse chat' }[locale]
                            : { de: 'Chat vergrößern', en: 'Expand chat' }[locale]
                    }
                    aria-pressed={isExpanded}
                    className="absolute right-12 top-4 z-10 hidden rounded-xs text-foreground/70 ring-offset-background transition-opacity hover:text-foreground hover:opacity-100 focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 sm:block cursor-pointer"
                >
                    {isExpanded ? <Minimize2Icon className="size-4" /> : <Maximize2Icon className="size-4" />}
                </button>
                <SheetHeader className="border-b px-6 py-4">
                    {/* When expanded, cap the inner column so prose stays
                     *  at a comfortable reading width while the sheet
                     *  itself spans the viewport. */}
                    <div className={isExpanded ? 'mx-auto flex w-full max-w-3xl flex-col gap-1.5' : 'flex flex-col gap-1.5'}>
                        <div className="flex items-center gap-2 text-primary">
                            <SparklesIcon className="size-4" />
                            <SheetTitle>{{ de: 'Frag mich was', en: 'Ask me anything' }[locale]}</SheetTitle>
                        </div>
                        <SheetDescription>
                            {
                                {
                                    de: 'Mein KI-Assistent kennt meine Stationen, Projekte und Arbeitsweise.',
                                    en: 'My AI assistant knows my career, projects, and how I work.',
                                }[locale]
                            }
                        </SheetDescription>
                    </div>
                </SheetHeader>
                {isOpen && intent ? <ChatSurface locale={locale} intent={intent} isExpanded={isExpanded} /> : null}
            </SheetContent>
        </Sheet>
    );
}

// --- Surface inside the sheet -----------------------------------------------
//
// Branches on `intent` to decide the initial state:
//   - 'empty'  → render the empty state (previous chats + composer)
//   - 'seeded' → fire seeded question on mount; flip to loaded on chatId
//   - 'loaded' → render the loaded transcript directly

function ChatSurface({ locale, intent, isExpanded }: { locale: Locale; intent: VisitorChatIntent; isExpanded: boolean }) {
    const [chatId, setChatId] = useState<string | undefined>(intent.kind === 'loaded' ? intent.chatId : undefined);
    const [sendError, setSendError] = useState<string | null>(null);

    // Owned by ChatSurface — not the sheet root — so Radix's unmount-on-close
    // gives every fresh open a fresh hook instance. Hoisting it to the sheet
    // root would let `appendedMessages` from one chat leak into the next when
    // the user closes the sheet mid-turn and reopens with a seeded send.
    const live = useChatLiveUpdates(chatId);

    const [, sendMessage] = useMutation(ChatMessageCreateDocument);

    // Seeded send is one-shot per sheet session. A ref guards React's
    // StrictMode double-invoke; the sheet component unmounts on close so
    // the next open gets a fresh ref instance automatically.
    const seededSentRef = useRef(false);
    useEffect(() => {
        if (intent.kind !== 'seeded') return;
        if (seededSentRef.current) return;
        seededSentRef.current = true;
        const seededQuestion = intent.seededQuestion;
        void (async () => {
            // Lift the generationId BEFORE firing the mutation so the
            // listener mounts and subscribes before any server-side publish
            // can happen — same race-avoidance pattern the old route used.
            const generationId = live.beginTurn();
            const result = await sendMessage({
                chatId: undefined,
                message: seededQuestion,
                fileUploadIds: [],
                generationId,
                requireToolCallApprovals: false,
            });
            const created = result.data?.chatMessageCreate ?? null;
            if (result.error || !created) {
                live.endTurn();
                setSendError(
                    {
                        de: 'Frage konnte nicht gesendet werden. Bitte versuche es erneut.',
                        en: 'Could not send your question. Please try again.',
                    }[locale],
                );
                return;
            }
            setChatId(created.chatId);
        })();
        // Only run on mount — the seeded send is one-shot.
    }, []);

    const onResume = useCallback((nextChatId: string) => {
        setChatId(nextChatId);
    }, []);

    // Returning to the overview from inside a loaded chat clears `chatId`,
    // which drops `ChatSurface` back into `ChatEmptyState`. The hook clears
    // its per-turn buffers on the loaded→empty transition, so the next
    // empty-state render is a clean slate. Use this only when no turn is in
    // flight (the button is hidden while `isGenerating`).
    const onResetToOverview = useCallback(() => {
        setChatId(undefined);
    }, []);

    // Cap the inner column when expanded so the prose stays readable on a
    // wide viewport. The sheet itself still spans the viewport — only the
    // content column reads at ~3xl.
    const innerClass = cn('grid min-h-0 flex-1 grid-rows-[1fr_auto] gap-4 px-6 pt-4 pb-6', isExpanded && 'mx-auto w-full max-w-3xl');

    if (sendError) {
        return <div className="grid flex-1 place-items-center p-8 text-sm text-destructive">{sendError}</div>;
    }
    // The listener is rendered alongside whichever inner view is active. It's
    // owned by ChatSurface (stable across the seeded-send → loaded handoff and
    // across empty ↔ loaded transitions) so the SSE subscription doesn't tear
    // down mid-turn.
    return (
        <>
            {live.listener}
            {!chatId ? (
                intent.kind === 'seeded' ? (
                    // Seeded send is in flight — show a spinner. The user
                    // message and the first streaming chunks already buffer
                    // through the live updates listener.
                    <div className="grid flex-1 place-items-center p-8 text-sm text-muted-foreground">
                        <Spinner />
                    </div>
                ) : (
                    <ChatEmptyState locale={locale} live={live} onResume={onResume} setChatId={setChatId} innerClass={innerClass} />
                )
            ) : (
                <ChatLoaded chatId={chatId} live={live} locale={locale} onResetToOverview={onResetToOverview} innerClass={innerClass} />
            )}
        </>
    );
}

// --- Empty state ------------------------------------------------------------
//
// What the sheet shows when opened without a seeded question and without
// an existing chatId — i.e. the header button. Renders the visitor's prior
// chats (so they can resume one) and a composer for a new conversation.
// The rate-limit row sits below the composer and disables the input when
// the visitor is over the daily cap.

function ChatEmptyState({
    locale,
    live,
    onResume,
    setChatId,
    innerClass,
}: {
    locale: Locale;
    live: ReturnType<typeof useChatLiveUpdates>;
    onResume: (chatId: string) => void;
    setChatId: (chatId: string) => void;
    innerClass: string;
}) {
    // `cache-and-network` so the previous-chats list and quota refresh on
    // every reopen — without it a stale list from yesterday would render
    // while the network call is in flight.
    const [{ data }] = useQuery({
        query: VisitorPreviousChatsDocument,
        requestPolicy: 'cache-and-network',
    });

    const previousChats = data?.currentSession.visitorChats ?? [];
    const quota = data?.currentSession.visitorChatQuota ?? null;
    const isAtLimit = quota ? quota.used >= quota.limit : false;

    return (
        <div className={innerClass}>
            <div className="flex min-h-0 flex-col gap-4 overflow-y-auto pr-2 text-sm text-muted-foreground">
                {previousChats.length > 0 ? (
                    <section className="flex flex-col gap-2">
                        <h3 className="text-xs uppercase tracking-wide text-muted-foreground">
                            {{ de: 'Frühere Chats', en: 'Previous chats' }[locale]}
                        </h3>
                        <ul className="flex flex-col gap-1.5">
                            {previousChats.map((chat) => (
                                <li key={chat.chatId}>
                                    <PreviousChatButton chat={chat} locale={locale} onResume={onResume} />
                                </li>
                            ))}
                        </ul>
                    </section>
                ) : null}
                <p className="max-w-md">
                    {previousChats.length > 0
                        ? { de: 'Oder stelle eine neue Frage.', en: 'Or ask a new question.' }[locale]
                        : {
                              de: 'Stell eine Frage zu meinem Werdegang, meinen Projekten oder meiner Arbeitsweise.',
                              en: 'Ask a question about my career, projects, or how I work.',
                          }[locale]}
                </p>
            </div>
            <div className="flex flex-col gap-2">
                <ChatComposer
                    locale={locale}
                    chatId={undefined}
                    isLocked={live.isGenerating || isAtLimit}
                    beginTurn={live.beginTurn}
                    endTurn={live.endTurn}
                    placeholder={{ de: 'Stell eine Frage…', en: 'Ask a question…' }[locale]}
                    onMessageSent={setChatId}
                    showApprovalMode={false}
                />
                <VisitorChatQuotaStatus quota={quota} locale={locale} />
            </div>
        </div>
    );
}

function PreviousChatButton({
    chat,
    locale,
    onResume,
}: {
    chat: GqlCVisitorChatListItemFragment;
    locale: Locale;
    onResume: (chatId: string) => void;
}) {
    const relative = formatDistanceToNow(parseISO(chat.lastModifiedAt as unknown as string), {
        addSuffix: true,
        locale: DATE_FNS_LOCALE[locale],
    });
    const title = chat.title.trim() ? chat.title : { de: 'Ohne Titel', en: 'Untitled' }[locale];
    return (
        <button
            type="button"
            onClick={() => onResume(chat.chatId)}
            className="flex w-full items-center gap-2 rounded-md border border-input px-3 py-2 text-left text-sm hover:bg-accent bg-white dark:bg-black cursor-pointer"
        >
            <MessageSquareTextIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-foreground">{title}</span>
                <span className="text-xs text-muted-foreground">{relative}</span>
            </span>
        </button>
    );
}

function VisitorChatQuotaStatus({ quota, locale }: { quota: GqlCVisitorChatQuotaFieldsFragment | null; locale: Locale }) {
    if (!quota || quota.used === 0) return null;
    const isAtLimit = quota.used >= quota.limit;
    const resetsIn = quota.resetsAt
        ? formatDistanceToNow(parseISO(quota.resetsAt as unknown as string), {
              addSuffix: false,
              locale: DATE_FNS_LOCALE[locale],
          })
        : { de: '24 Std.', en: '24 h' }[locale];
    const text = isAtLimit
        ? {
              de: `Tageslimit erreicht (${quota.used} / ${quota.limit}). Neue Nachricht in ${resetsIn} möglich.`,
              en: `Daily limit reached (${quota.used} / ${quota.limit}). You can send again in ${resetsIn}.`,
          }[locale]
        : {
              de: `${quota.used} / ${quota.limit} Nachrichten heute · zurückgesetzt in ${resetsIn}`,
              en: `${quota.used} / ${quota.limit} messages today · resets in ${resetsIn}`,
          }[locale];
    return (
        <p role="status" className="text-xs text-muted-foreground">
            {text}
        </p>
    );
}

function ChatLoaded({
    chatId,
    live,
    locale,
    onResetToOverview,
    innerClass,
}: {
    chatId: string;
    live: ReturnType<typeof useChatLiveUpdates>;
    locale: Locale;
    onResetToOverview: () => void;
    innerClass: string;
}) {
    const [{ data, fetching, error }] = useQuery({
        query: ChatPageDocument,
        variables: { chatId },
        // Initial transcript only — subsequent updates arrive via the
        // `chatUpdates` subscription. `cache-and-network` keeps the
        // transcript fresh on remount without forcing a refetch on every
        // send.
        requestPolicy: 'cache-and-network',
    });

    const [, respondToCollection] = useMutation(ChatInputCollectionRespondDocument);
    const [, respondToApproval] = useMutation(ChatToolApprovalRespondDocument);

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

    const chat = data?.chat;

    if (error) {
        return (
            <div className="grid flex-1 place-items-center p-8 text-sm text-destructive">
                {{ de: 'Chat konnte nicht geladen werden:', en: 'Failed to load chat:' }[locale]} {error.message}
            </div>
        );
    }
    if (!chat) {
        return (
            <div className="grid flex-1 place-items-center p-8 text-sm text-muted-foreground">
                <Spinner />
            </div>
        );
    }

    return (
        <div className={innerClass}>
            <ChatTranscript
                chat={chat}
                appendedMessages={live.appendedMessages}
                streamingTexts={live.streamingTexts}
                onCollectionSubmit={onCollectionSubmit}
                onApprovalRespond={onApprovalRespond}
                fetching={fetching}
                jumpToLatestLabel={{ de: 'Zum neuesten springen', en: 'Jump to latest' }[locale]}
            />
            <ChatComposer
                chatId={chat.chatId}
                isLocked={live.isGenerating}
                locale={locale}
                beginTurn={live.beginTurn}
                endTurn={live.endTurn}
                placeholder={{ de: 'Stelle eine weitere Frage…', en: 'Ask another question…' }[locale]}
                showApprovalMode={false}
                addonStart={
                    <Button onClick={onResetToOverview} disabled={live.isGenerating} aria-label={newChatLabel[locale]} variant="ghost">
                        <PlusIcon className="size-3.5" />
                        {newChatLabel[locale]}
                    </Button>
                }
            />
        </div>
    );
}

// --- Transcript --------------------------------------------------------------
//
// The shape mirrors the old `/chat` route's `ChatTranscript`. Once a third
// surface lands this can move into a shared `src/web/chat/` component
// alongside the helpers and the composer.

function ChatTranscript({
    chat,
    appendedMessages,
    streamingTexts,
    onCollectionSubmit,
    onApprovalRespond,
    fetching,
    jumpToLatestLabel,
}: {
    chat: NonNullable<GqlCChatPageQuery['chat']>;
    appendedMessages: ReadonlyArray<TranscriptMessage>;
    streamingTexts: Readonly<Record<string, string>>;
    onCollectionSubmit: (
        collectionMessageId: string,
        answers: ReadonlyArray<{ inputId: string; value: GqlCChatAssistantInputValue }>,
    ) => void;
    onApprovalRespond: (approvalId: string, approved: boolean, reason?: string) => void;
    fetching: boolean;
    jumpToLatestLabel: string;
}) {
    const allMessages = mergeTranscriptMessages(chat.messages, appendedMessages);
    const latestCollectionId = findLatestCollectionId(allMessages);
    const pendingApprovalIds = findPendingApprovalIds(allMessages);
    const userInputByCollection = findUserInputByCollectionId(allMessages);
    const groupedMessages = groupMessagesByDate(allMessages);

    const streamingEntries = Object.entries(streamingTexts);

    // Stick-to-bottom: keep the transcript pinned to the latest message as
    // content streams in. The decision to re-pin is read from a ref that
    // `onScroll` updates and the `useLayoutEffect` consults — `onScroll`
    // fires after the previous layout effect, so the ref holds the
    // pre-update bottom answer the next batch needs.
    const scrollRef = useRef<HTMLDivElement>(null);
    const [isAtBottom, setIsAtBottom] = useState(true);
    const isAtBottomRef = useRef(true);
    const lastContentSignature = `${allMessages.length}|${streamingEntries.map(([id, text]) => `${id}:${text.length}`).join(',')}`;

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
                {fetching && allMessages.length === 0 ? (
                    <div className="grid place-items-center py-8">
                        <Spinner className="size-4 text-muted-foreground" />
                    </div>
                ) : null}
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
                    aria-label={jumpToLatestLabel}
                    className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-input bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-md hover:bg-accent"
                >
                    <ArrowDownIcon className="size-3.5" />
                    {jumpToLatestLabel}
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
