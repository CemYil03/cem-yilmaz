import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { format, parseISO } from 'date-fns';
import { ArrowDownIcon } from 'lucide-react';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from 'urql';
import { toFlatAnswerInput } from '../../../web/chat/chatAssistantInputKinds';
import { ChatComposer } from '../../../web/chat/ChatComposer';
import type { TranscriptMessage } from '../../../web/chat/chatTranscript';
import {
    findLatestCollectionId,
    findPendingApprovalIds,
    findUserInputByCollectionId,
    groupMessagesByDate,
    mergeTranscriptMessages,
} from '../../../web/chat/chatTranscript';
import { useChatLiveUpdates } from '../../../web/chat/useChatLiveUpdates';
import { AssistantMarkdown } from '../../../web/components/AssistantMarkdown';
import { Spinner } from '../../../web/components/base/spinner';
import { ChatMessage } from '../../../web/components/chat-message';
import type { GqlCChatAssistantInputValue, GqlCWorkspaceChatPageQuery } from '../../../web/graphql/generated';
import {
    WorkspaceChatInputCollectionRespondDocument,
    WorkspaceChatMessageCreateDocument,
    WorkspaceChatPageDocument,
    WorkspaceChatToolApprovalRespondDocument,
} from '../../../web/graphql/generated';
import { useLocale } from '../../../web/hooks/useLocale';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';
import type { Locale } from '../../../web/utils/locale';

// Personal-assistant chat surface for the workspace. Same shape as
// `src/web/chat/WebsiteVisitorAssistantChatDialog.tsx` (the visitor chat
// hosted in the landing-page dialog) — the live-updates subscription, the
// transcript layout, and the composer are all reused — but every mutation
// goes through the `admin.*` namespace so the server dispatches to
// `agentPersonalAssistant`. The route is `noindex`, kept out of the sitemap,
// and (in Phase 1) reachable only by URL through `/workspace`. Phase 2
// wraps `/workspace/*` in the GitHub OAuth gate. See
// `docs/architecture/multi-agent-chat.md` and
// `docs/features/workspace-hub.md`.

const composerPlaceholder = { de: 'Frag deinen Assistenten…', en: 'Ask your assistant…' };

const extractMessageCreateResult = (data: unknown): { chatId: string } | null => {
    const wrapper = data as { admin?: { chatMessageCreate?: { chatId: string } | null } | null } | null | undefined;
    return wrapper?.admin?.chatMessageCreate ?? null;
};

export const Route = createFileRoute('/{-$locale}/workspace/assistant')({
    validateSearch: (search: Record<string, unknown>) => ({ chatId: typeof search.chatId === 'string' ? search.chatId : undefined }),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: { de: 'Persönlicher Assistent', en: 'Personal assistant' }[locale],
            description: {
                de: 'Mein persönlicher KI-Assistent für den Arbeitsbereich.',
                en: 'My personal AI assistant for the workspace.',
            }[locale],
            path: '/workspace/assistant',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        const { chatId } = Route.useSearch();
        const live = useChatLiveUpdates(chatId);
        const locale = useLocale();
        return (
            <>
                {live.listener}
                {chatId ? (
                    <WorkspaceAssistantPage chatId={chatId} live={live} locale={locale} />
                ) : (
                    <WorkspaceAssistantEmpty live={live} locale={locale} />
                )}
            </>
        );
    },
});

// --- Empty state -------------------------------------------------------------
//
// No `chatId` in the URL means a fresh chat is about to start. The composer
// creates one on first send and then navigates to `?chatId=...`, after which
// the loaded view takes over. The subscription was set up at the route level
// before the mutation fired so the user message and every subsequent update
// are already buffered when the navigate completes.

function WorkspaceAssistantEmpty({ live, locale }: { live: ReturnType<typeof useChatLiveUpdates>; locale: Locale }) {
    const navigate = useNavigate();
    return (
        <main className="mx-auto grid h-dvh w-full max-w-2xl grid-rows-[1fr_auto] gap-4 p-6">
            <div className="grid place-items-center text-sm text-muted-foreground">
                {live.isGenerating ? (
                    <Spinner className="size-4 text-muted-foreground" />
                ) : (
                    { de: 'Wie kann ich helfen?', en: 'How can I help?' }[locale]
                )}
            </div>
            <ChatComposer
                onMessageSent={(newChatId) => navigate({ to: '/{-$locale}/workspace/assistant', search: { chatId: newChatId } })}
                isLocked={live.isGenerating}
                beginTurn={live.beginTurn}
                locale={locale}
                endTurn={live.endTurn}
                sendMutation={WorkspaceChatMessageCreateDocument}
                extractResult={extractMessageCreateResult}
                placeholder={composerPlaceholder[locale]}
                autoFocus
            />
        </main>
    );
}

// --- Loaded chat -------------------------------------------------------------

function WorkspaceAssistantPage({ chatId, live, locale }: { chatId: string; live: ReturnType<typeof useChatLiveUpdates>; locale: Locale }) {
    const [{ data, fetching, error }] = useQuery({
        query: WorkspaceChatPageDocument,
        variables: { chatId },
        // Initial transcript only — subsequent updates arrive via the
        // `chatUpdates` subscription. `cache-and-network` keeps the transcript
        // fresh across navigations without forcing a refetch on every send.
        requestPolicy: 'cache-and-network',
    });

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

    const chat = data?.admin.chat;

    if (error) {
        return (
            <main className="grid place-items-center p-8 text-sm text-destructive">
                {{ de: 'Chat konnte nicht geladen werden:', en: 'Failed to load chat:' }[locale]} {error.message}
            </main>
        );
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
                <h1 className="text-lg font-semibold">{chat.title || { de: 'Neuer Chat', en: 'New chat' }[locale]}</h1>
                {fetching ? <Spinner className="size-3 text-muted-foreground" /> : null}
            </header>

            <ChatTranscript
                chat={chat}
                appendedMessages={live.appendedMessages}
                streamingTexts={live.streamingTexts}
                onCollectionSubmit={onCollectionSubmit}
                onApprovalRespond={onApprovalRespond}
                jumpToLatestLabel={{ de: 'Zum neuesten springen', en: 'Jump to latest' }[locale]}
            />

            <ChatComposer
                chatId={chat.chatId}
                isLocked={live.isGenerating}
                beginTurn={live.beginTurn}
                endTurn={live.endTurn}
                locale={locale}
                sendMutation={WorkspaceChatMessageCreateDocument}
                extractResult={extractMessageCreateResult}
                placeholder={composerPlaceholder[locale]}
                autoFocus
            />
        </main>
    );
}

// --- Transcript --------------------------------------------------------------
//
// Mirrors the transcript layout in `src/web/chat/WebsiteVisitorAssistantChatDialog.tsx`.
// Once a third surface arrives this should move to a shared `src/web/chat/`
// component; for two callers the duplication is the smaller cost.

function ChatTranscript({
    chat,
    appendedMessages,
    streamingTexts,
    onCollectionSubmit,
    onApprovalRespond,
    jumpToLatestLabel,
}: {
    chat: NonNullable<NonNullable<GqlCWorkspaceChatPageQuery['admin']>['chat']>;
    appendedMessages: ReadonlyArray<TranscriptMessage>;
    streamingTexts: Readonly<Record<string, string>>;
    onCollectionSubmit: (
        collectionMessageId: string,
        answers: ReadonlyArray<{ inputId: string; value: GqlCChatAssistantInputValue }>,
    ) => void;
    onApprovalRespond: (approvalId: string, approved: boolean, reason?: string) => void;
    jumpToLatestLabel: string;
}) {
    const allMessages = mergeTranscriptMessages(chat.messages, appendedMessages);
    const latestCollectionId = findLatestCollectionId(allMessages);
    const pendingApprovalIds = findPendingApprovalIds(allMessages);
    const userInputByCollection = findUserInputByCollectionId(allMessages);
    const groupedMessages = groupMessagesByDate(allMessages);

    const streamingEntries = Object.entries(streamingTexts);

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
