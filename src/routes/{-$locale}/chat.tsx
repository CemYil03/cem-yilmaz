import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { format, parseISO } from 'date-fns';
import { ArrowDownIcon } from 'lucide-react';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from 'urql';
import { toFlatAnswerInput } from '../../web/chat/chatAssistantInputKinds';
import { ChatComposer } from '../../web/chat/ChatComposer';
import type { TranscriptMessage } from '../../web/chat/chatTranscript';
import {
    findLatestCollectionId,
    findPendingApprovalIds,
    findUserInputByCollectionId,
    groupMessagesByDate,
    mergeTranscriptMessages,
} from '../../web/chat/chatTranscript';
import { useChatLiveUpdates } from '../../web/chat/useChatLiveUpdates';
import { AssistantMarkdown } from '../../web/components/AssistantMarkdown';
import { Spinner } from '../../web/components/base/spinner';
import { ChatMessage } from '../../web/components/chat-message';
import type { GqlCChatAssistantInputValue, GqlCChatPageQuery } from '../../web/graphql/generated';
import { ChatInputCollectionRespondDocument, ChatPageDocument, ChatToolApprovalRespondDocument } from '../../web/graphql/generated';
import { seoMeta } from '../../web/seo/seoMeta';
import { webPageUrlGet } from '../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../web/utils/locale';

// Minimal AI chat surface — see `docs/features/chat.md`. Live updates flow
// exclusively through the `chatUpdates` subscription, owned by
// `useChatLiveUpdates`. Per-turn state lives at the route level so the
// subscription survives the empty→loaded handoff after the first send. The
// agent turn runs detached server-side: the mutation returns as soon as the
// user-side row is durable, and the assistant streams over the subscription;
// `ChatUpdateTurnEnded` is the signal that the turn is done.

export const Route = createFileRoute('/{-$locale}/chat')({
    validateSearch: (search: Record<string, unknown>) => ({ chatId: typeof search.chatId === 'string' ? search.chatId : undefined }),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: { de: 'Chat', en: 'Chat' }[locale],
            description: {
                de: 'Unterhaltung mit dem Assistenten.',
                en: 'A conversation with the assistant.',
            }[locale],
            path: '/chat',
            locale,
            webPageUrl: webPageUrlGet(),
            // Chat is a logged-in, per-session surface — exclude it from
            // search engines. The sitemap also drops it via
            // `sitemapRoutes.ts`.
            noindex: true,
        });
    },
    component() {
        const { chatId } = Route.useSearch();
        const live = useChatLiveUpdates(chatId);
        return (
            <>
                {live.listener}
                {chatId ? <ChatPage chatId={chatId} live={live} /> : <ChatEmpty live={live} />}
            </>
        );
    },
});

// --- Empty state -------------------------------------------------------------
//
// No chatId in the URL means we have no chat yet. The composer creates one on
// first send and then navigates to `?chatId=...`, after which `ChatPage` takes
// over. The subscription was set up at the route level BEFORE the mutation
// fired, so the user message and all subsequent updates are already buffered
// when the navigate completes — there's no perceptible "loading then a flash"
// gap any more.

function ChatEmpty({ live }: { live: ReturnType<typeof useChatLiveUpdates> }) {
    const navigate = useNavigate();
    return (
        <main className="mx-auto grid h-dvh w-full max-w-2xl grid-rows-[1fr_auto] gap-4 p-6">
            <div className="grid place-items-center text-sm text-muted-foreground">
                {live.isGenerating ? <Spinner className="size-4 text-muted-foreground" /> : 'Start a new conversation.'}
            </div>
            <ChatComposer
                onMessageSent={(newChatId) => navigate({ to: '/{-$locale}/chat', search: { chatId: newChatId } })}
                isLocked={live.isGenerating}
                beginTurn={live.beginTurn}
                endTurn={live.endTurn}
            />
        </main>
    );
}

// --- Loaded chat -------------------------------------------------------------

function ChatPage({ chatId, live }: { chatId: string; live: ReturnType<typeof useChatLiveUpdates> }) {
    const [{ data, fetching, error }] = useQuery({
        query: ChatPageDocument,
        variables: { chatId },
        // Initial transcript only — subsequent updates arrive via the
        // `chatUpdates` subscription. `cache-and-network` keeps the transcript
        // fresh across navigations without forcing a refetch on every send.
        requestPolicy: 'cache-and-network',
    });

    const [, respondToCollection] = useMutation(ChatInputCollectionRespondDocument);
    const [, respondToApproval] = useMutation(ChatToolApprovalRespondDocument);

    const onCollectionSubmit = useCallback(
        async (collectionMessageId: string, answers: ReadonlyArray<{ inputId: string; value: GqlCChatAssistantInputValue }>) => {
            const generationId = live.beginTurn();
            const flatAnswers = answers.map((answer) => toFlatAnswerInput(answer.inputId, answer.value));
            // The mutation returns as soon as the userInput row is committed
            // server-side; the resumed assistant turn streams over the
            // subscription and clears `generationId` via `TurnEnded`.
            await respondToCollection({
                collectionMessageId,
                answers: flatAnswers,
                generationId,
                // Approvals aren't reachable from a collection-respond yet —
                // the assistant's resumed turn shouldn't suddenly surface them.
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
                // Stay in manual mode for the resumed turn — if the LLM
                // follows up with another gated tool call its approval card
                // surfaces too.
                requireToolCallApprovals: true,
            });
        },
        [respondToApproval, live],
    );

    const session = data?.currentSession;
    const chat = session?.chat;

    if (error) {
        return <main className="grid place-items-center p-8 text-sm text-destructive">Failed to load chat: {error.message}</main>;
    }
    if (!chat) {
        return (
            <main className="grid place-items-center p-8 text-sm text-muted-foreground">
                <Spinner />
            </main>
        );
    }

    return (
        <main className="mx-auto grid h-dvh w-full min-w-0 max-w-2xl grid-rows-[auto_1fr_auto] gap-4 p-6">
            <header className="flex items-baseline justify-between">
                <h1 className="text-lg font-semibold">{chat.title || 'New chat'}</h1>
                {fetching ? <Spinner className="size-3 text-muted-foreground" /> : null}
            </header>

            <ChatTranscript
                chat={chat}
                appendedMessages={live.appendedMessages}
                streamingTexts={live.streamingTexts}
                onCollectionSubmit={onCollectionSubmit}
                onApprovalRespond={onApprovalRespond}
            />

            <ChatComposer chatId={chat.chatId} isLocked={live.isGenerating} beginTurn={live.beginTurn} endTurn={live.endTurn} />
        </main>
    );
}

// --- Transcript --------------------------------------------------------------

function ChatTranscript({
    chat,
    appendedMessages,
    streamingTexts,
    onCollectionSubmit,
    onApprovalRespond,
}: {
    chat: GqlCChatPageQuery['currentSession']['chat'];
    appendedMessages: ReadonlyArray<TranscriptMessage>;
    streamingTexts: Readonly<Record<string, string>>;
    onCollectionSubmit: (
        collectionMessageId: string,
        answers: ReadonlyArray<{ inputId: string; value: GqlCChatAssistantInputValue }>,
    ) => void;
    onApprovalRespond: (approvalId: string, approved: boolean, reason?: string) => void;
}) {
    const allMessages = mergeTranscriptMessages(chat.messages, appendedMessages);
    const latestCollectionId = findLatestCollectionId(allMessages);
    const pendingApprovalIds = findPendingApprovalIds(allMessages);
    const userInputByCollection = findUserInputByCollectionId(allMessages);
    const groupedMessages = groupMessagesByDate(allMessages);

    // Streaming texts render at the tail as synthesized assistant-text rows
    // so they go through the exact same Streamdown render path as the
    // persisted swap-in. When the matching `MessageAppended` lands, the
    // streaming entry disappears AND the persisted row appears in
    // `allMessages` — both keyed by the same chatMessageId, so React swaps
    // the row in place.
    const streamingEntries = Object.entries(streamingTexts);

    // Stick-to-bottom: keep the transcript pinned to the latest message as
    // content streams in. If the user scrolls up while content is arriving
    // we stop auto-following and surface a "jump to latest" affordance —
    // they get to read what they scrolled to, but can re-attach with one
    // click. The threshold is generous (~64 px) so an off-by-a-pixel browser
    // measurement after content lands doesn't drop us out of stick mode.
    //
    // `isAtBottomRef` is the source of truth used by the layout effect (it's
    // updated only by `onScroll`, which fires AFTER the previous layout
    // effect, so when a new content batch lands the ref still holds the
    // pre-update answer — exactly the snapshot we need to decide whether to
    // re-pin). `isAtBottom` is the React-state mirror that drives the
    // "jump to latest" pill.
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
        // 64 px tolerance — Streamdown can grow the content height by a few
        // pixels between scroll events, and we don't want micro-scrolls
        // dropping the user out of "stick to bottom".
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
            {/* Scroll container is flex-col, NOT grid. A grid container with
             *  `h-full` and no template stretches its rows to fill the
             *  viewport via `align-content: stretch`. While the assistant is
             *  early in its turn the streaming `<section>` is short, so
             *  stretching parks it mid-viewport — and the moment the content
             *  grows past `h-full` the rows collapse to content size and the
             *  layout effect snaps `scrollTop` to bottom, producing the
             *  "starts in the middle, jumps up" flicker the chat had. Vertical
             *  flow stacks from the top with no stretching. */}
            <div ref={scrollRef} onScroll={onScroll} className="flex h-full min-w-0 flex-col gap-4 overflow-y-auto overflow-x-hidden pr-2">
                {groupedMessages.map((group) => (
                    <section key={group.date} className="flex min-w-0 flex-col gap-4">
                        <DateSeparator iso={group.date} />
                        {group.messages.map((message) => {
                            const approvalRespondHandler =
                                message.__typename === 'ChatMessageToolApprovalRequest' && pendingApprovalIds.has(message.approvalId)
                                    ? onApprovalRespond
                                    : undefined;
                            // Fold the matching userInput row (if any) into the
                            // collection card — it's no longer rendered standalone.
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
                    aria-label="Jump to latest"
                    className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-input bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-md hover:bg-accent"
                >
                    <ArrowDownIcon className="size-3.5" />
                    Jump to latest
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
