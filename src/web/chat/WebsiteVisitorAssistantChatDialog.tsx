import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ArrowDownIcon, SparklesIcon } from 'lucide-react';
import { useMutation, useQuery } from 'urql';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/base/dialog';
import { Spinner } from '../components/base/spinner';
import { AssistantMarkdown } from '../components/AssistantMarkdown';
import { ChatMessage } from '../components/chat-message';
import type { GqlCChatAssistantInputValue, GqlCChatPageQuery } from '../graphql/generated';
import {
    ChatInputCollectionRespondDocument,
    ChatMessageCreateDocument,
    ChatPageDocument,
    ChatToolApprovalRespondDocument,
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

// Visitor-facing AI chat surface, rendered inside the landing page's
// "Ask me anything" Dialog. Holds the full transcript-and-composer experience
// that used to live at the dedicated `/chat` route — `/chat` is gone; the
// landing-page dialog is the only visitor chat surface now. The route under
// `/workspace/assistant` is a distinct surface that talks to the personal
// assistant agent through the `admin.*` namespace — this dialog uses the
// visitor (non-admin) GraphQL ops so the server dispatches to
// `agentVisitorAboutCem`. See `docs/features/chat.md`.
//
// The dialog is controlled by its parent through the `question` prop:
//
//   - `question === null` — dialog is closed; internal state is reset.
//   - `question === string` — dialog is open. On the open transition the
//     dialog kicks off a fresh chat by sending that seeded question through
//     `chatMessageCreate`, then drops into the loaded transcript + composer
//     view once the server returns the `chatId`. The user never has to
//     retype what they typed on the landing-page composer.
//
// The live-updates listener mounts at the dialog root (above the inner
// loaded/empty swap) so the subscription survives the empty→loaded handoff
// after the seeded send — same pattern the route used to use.

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
    jumpToLatest: { de: 'Zum neuesten springen', en: 'Jump to latest' },
};

export interface WebsiteVisitorAssistantChatDialogProps {
    locale: Locale;
    /** The seeded question typed on the landing-page composer (or a chip
     *  click). Non-null = dialog open; null = dialog closed and internal
     *  state reset. */
    question: string | null;
    onClose: () => void;
}

export function WebsiteVisitorAssistantChatDialog({ locale, question, onClose }: WebsiteVisitorAssistantChatDialogProps) {
    const isOpen = question !== null;
    const live = useChatLiveUpdates(undefined);
    return (
        <Dialog
            open={isOpen}
            onOpenChange={(next) => {
                if (!next) onClose();
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
                {isOpen ? <ChatSurface locale={locale} seededQuestion={question} live={live} /> : null}
            </DialogContent>
        </Dialog>
    );
}

// --- Surface inside the dialog ----------------------------------------------
//
// Manages the local `chatId` state. On first mount the seeded question is
// sent through `chatMessageCreate` — that send sets the chatId, after which
// the loaded transcript view takes over. Subsequent sends are normal
// `ChatComposer` invocations against the same chat.

function ChatSurface({
    locale,
    seededQuestion,
    live,
}: {
    locale: Locale;
    seededQuestion: string;
    live: ReturnType<typeof useChatLiveUpdates>;
}) {
    const [chatId, setChatId] = useState<string | undefined>(undefined);
    const [sendError, setSendError] = useState<string | null>(null);

    const [, sendMessage] = useMutation(ChatMessageCreateDocument);

    // The seeded question is fired exactly once per dialog session. A ref
    // guards against React's StrictMode double-invoke and any later effect
    // re-runs (the dialog component unmounts on close, so the next open
    // gets a fresh ref instance — no need to reset it ourselves).
    const seededSentRef = useRef(false);
    useEffect(() => {
        if (seededSentRef.current) return;
        seededSentRef.current = true;
        void (async () => {
            // Lift the generationId BEFORE firing the mutation so the
            // listener mounts and subscribes before any server-side publish
            // can happen — same race-avoidance pattern the route used.
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
        // Only run on mount — the seeded send is one-shot. `live` and
        // `sendMessage` are stable references from their hooks.
    }, []);

    if (sendError) {
        return <div className="grid flex-1 place-items-center p-8 text-sm text-destructive">{sendError}</div>;
    }
    if (!chatId) {
        // Pre-chatId state: the seeded send is in flight. The user message
        // and the first streaming chunks already buffer through the live
        // updates listener mounted at the dialog root — they'll appear here
        // as soon as the chatId lands and the loaded view subscribes.
        return (
            <div className="grid flex-1 place-items-center p-8 text-sm text-muted-foreground">
                <Spinner />
            </div>
        );
    }
    return <ChatLoaded chatId={chatId} live={live} locale={locale} />;
}

function ChatLoaded({ chatId, live, locale }: { chatId: string; live: ReturnType<typeof useChatLiveUpdates>; locale: Locale }) {
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
