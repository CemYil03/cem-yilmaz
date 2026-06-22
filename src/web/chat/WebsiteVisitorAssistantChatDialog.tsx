import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { de as deLocale, enUS as enLocale } from 'date-fns/locale';
import { ArrowDownIcon, MessageSquareTextIcon, PlusIcon, SparklesIcon } from 'lucide-react';
import { useMutation, useQuery } from 'urql';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/base/dialog';
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

// Visitor-facing AI chat surface. Mounted once at the root layout — see
// `__root.tsx` — so any surface can open it via `useVisitorChat()` without
// duplicating the dialog tree. The route under `/workspace/assistant` is a
// distinct surface that talks to the personal-assistant agent through the
// `admin.*` namespace — this dialog uses the visitor (non-admin) GraphQL ops
// so the server dispatches to `agentVisitorAboutCem`. See
// `docs/features/chat-visitor.md`.
//
// The dialog reads its open state from `useVisitorChat()`. The `intent`
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
// Radix's `Dialog` unmounts its children on close, so every fresh open
// gets a fresh `ChatSurface` instance — no manual reset of the seeded-once
// ref or chatId.

const COPY = {
    title: { de: 'Frag mich was', en: 'Ask me anything' },
    description: {
        de: 'Mein KI-Assistent kennt meine Stationen, Projekte und Arbeitsweise.',
        en: 'My AI assistant knows my career, projects, and how I work.',
    },
    loadFailed: { de: 'Chat konnte nicht geladen werden:', en: 'Failed to load chat:' },
    sendFailed: {
        de: 'Frage konnte nicht gesendet werden. Bitte versuche es erneut.',
        en: 'Could not send your question. Please try again.',
    },
    placeholder: { de: 'Stelle eine weitere Frage…', en: 'Ask another question…' },
    composerEmpty: { de: 'Stell eine Frage…', en: 'Ask a question…' },
    jumpToLatest: { de: 'Zum neuesten springen', en: 'Jump to latest' },
    previousChats: { de: 'Frühere Chats', en: 'Previous chats' },
    newChat: { de: 'Neuer Chat', en: 'New chat' },
    emptyIntroNoPrevious: {
        de: 'Stell eine Frage zu meinem Werdegang, meinen Projekten oder meiner Arbeitsweise.',
        en: 'Ask a question about my career, projects, or how I work.',
    },
    emptyIntroWithPrevious: { de: 'Oder stell eine neue Frage.', en: 'Or ask a new question.' },
    quotaUsed: {
        de: (used: number, limit: number, resetsIn: string) => `${used} / ${limit} Nachrichten heute · zurückgesetzt in ${resetsIn}`,
        en: (used: number, limit: number, resetsIn: string) => `${used} / ${limit} messages today · resets in ${resetsIn}`,
    },
    quotaAtLimit: {
        de: (used: number, limit: number, resetsIn: string) =>
            `Tageslimit erreicht (${used} / ${limit}). Neue Nachricht in ${resetsIn} möglich.`,
        en: (used: number, limit: number, resetsIn: string) =>
            `Daily limit reached (${used} / ${limit}). You can send again in ${resetsIn}.`,
    },
    quotaFallbackResetsIn: { de: '24 Std.', en: '24 h' },
};

const DATE_FNS_LOCALE: Record<Locale, typeof deLocale> = { de: deLocale, en: enLocale };

interface WebsiteVisitorAssistantChatDialogProps {
    locale: Locale;
}

export function WebsiteVisitorAssistantChatDialog({ locale }: WebsiteVisitorAssistantChatDialogProps) {
    const { isOpen, intent, close } = useVisitorChat();
    const live = useChatLiveUpdates(undefined);
    return (
        <Dialog
            open={isOpen}
            onOpenChange={(next) => {
                if (!next) close();
            }}
        >
            <DialogContent className="flex h-[85vh] flex-col gap-0 p-0 sm:max-w-2xl">
                <DialogHeader className="border-b px-6 py-4">
                    <div className="flex items-center gap-2 text-primary">
                        <SparklesIcon className="size-4" />
                        <DialogTitle>{COPY.title[locale]}</DialogTitle>
                    </div>
                    <DialogDescription>{COPY.description[locale]}</DialogDescription>
                </DialogHeader>
                {/* Mount the listener once at the dialog root so the
                 *  subscription survives the seeded send → loaded transcript
                 *  handoff. Re-mounted fresh each time the dialog opens
                 *  because `Dialog` unmounts its children on close. */}
                {live.listener}
                {isOpen && intent ? <ChatSurface locale={locale} intent={intent} live={live} /> : null}
            </DialogContent>
        </Dialog>
    );
}

// --- Surface inside the dialog ----------------------------------------------
//
// Branches on `intent` to decide the initial state:
//   - 'empty'  → render the empty state (previous chats + composer)
//   - 'seeded' → fire seeded question on mount; flip to loaded on chatId
//   - 'loaded' → render the loaded transcript directly

function ChatSurface({ locale, intent, live }: { locale: Locale; intent: VisitorChatIntent; live: ReturnType<typeof useChatLiveUpdates> }) {
    const [chatId, setChatId] = useState<string | undefined>(intent.kind === 'loaded' ? intent.chatId : undefined);
    const [sendError, setSendError] = useState<string | null>(null);

    const [, sendMessage] = useMutation(ChatMessageCreateDocument);

    // Seeded send is one-shot per dialog session. A ref guards React's
    // StrictMode double-invoke; the dialog component unmounts on close so
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
                setSendError(COPY.sendFailed[locale]);
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

    if (sendError) {
        return <div className="grid flex-1 place-items-center p-8 text-sm text-destructive">{sendError}</div>;
    }
    if (!chatId) {
        if (intent.kind === 'seeded') {
            // Seeded send is in flight — show a spinner. The user message
            // and the first streaming chunks already buffer through the
            // live updates listener mounted at the dialog root.
            return (
                <div className="grid flex-1 place-items-center p-8 text-sm text-muted-foreground">
                    <Spinner />
                </div>
            );
        }
        return <ChatEmptyState locale={locale} live={live} onResume={onResume} setChatId={setChatId} />;
    }
    return <ChatLoaded chatId={chatId} live={live} locale={locale} onResetToOverview={onResetToOverview} />;
}

// --- Empty state ------------------------------------------------------------
//
// What the dialog shows when opened without a seeded question and without
// an existing chatId — i.e. the header button. Renders the visitor's prior
// chats (so they can resume one) and a composer for a new conversation.
// The rate-limit row sits below the composer and disables the input when
// the visitor is over the daily cap.

function ChatEmptyState({
    locale,
    live,
    onResume,
    setChatId,
}: {
    locale: Locale;
    live: ReturnType<typeof useChatLiveUpdates>;
    onResume: (chatId: string) => void;
    setChatId: (chatId: string) => void;
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
        <div className="grid min-h-0 flex-1 grid-rows-[1fr_auto] gap-4 px-6 pt-4 pb-6">
            <div className="flex min-h-0 flex-col gap-4 overflow-y-auto pr-2 text-sm text-muted-foreground">
                {previousChats.length > 0 ? (
                    <section className="flex flex-col gap-2">
                        <h3 className="text-xs uppercase tracking-wide text-muted-foreground">{COPY.previousChats[locale]}</h3>
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
                    {previousChats.length > 0 ? COPY.emptyIntroWithPrevious[locale] : COPY.emptyIntroNoPrevious[locale]}
                </p>
            </div>
            <div className="flex flex-col gap-2">
                <ChatComposer
                    chatId={undefined}
                    isLocked={live.isGenerating || isAtLimit}
                    beginTurn={live.beginTurn}
                    endTurn={live.endTurn}
                    placeholder={COPY.composerEmpty[locale]}
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
            className="flex w-full items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-left text-sm hover:bg-accent"
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
        : COPY.quotaFallbackResetsIn[locale];
    const text = isAtLimit
        ? COPY.quotaAtLimit[locale](quota.used, quota.limit, resetsIn)
        : COPY.quotaUsed[locale](quota.used, quota.limit, resetsIn);
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
}: {
    chatId: string;
    live: ReturnType<typeof useChatLiveUpdates>;
    locale: Locale;
    onResetToOverview: () => void;
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
                {COPY.loadFailed[locale]} {error.message}
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
        <div className="grid min-h-0 flex-1 grid-rows-[1fr_auto] gap-4 px-6 pt-4 pb-6">
            <ChatTranscript
                chat={chat}
                appendedMessages={live.appendedMessages}
                streamingTexts={live.streamingTexts}
                onCollectionSubmit={onCollectionSubmit}
                onApprovalRespond={onApprovalRespond}
                fetching={fetching}
                jumpToLatestLabel={COPY.jumpToLatest[locale]}
            />
            <ChatComposer
                chatId={chat.chatId}
                isLocked={live.isGenerating}
                beginTurn={live.beginTurn}
                endTurn={live.endTurn}
                placeholder={COPY.placeholder[locale]}
                showApprovalMode={false}
                addonStart={
                    <button
                        type="button"
                        onClick={onResetToOverview}
                        disabled={live.isGenerating}
                        aria-label={COPY.newChat[locale]}
                        className="flex h-7 items-center gap-1 rounded-md border border-input bg-background px-2 text-xs font-medium text-foreground hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <PlusIcon className="size-3.5" />
                        {COPY.newChat[locale]}
                    </button>
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
