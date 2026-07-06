import { createFileRoute, Link, useLocation } from '@tanstack/react-router';
import { format, parseISO } from 'date-fns';
import { ArrowDownIcon } from 'lucide-react';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { useMutation } from 'urql';
import type { TranscriptMessage } from '../../../web/chat/chatTranscript';
import {
    findLatestCollectionId,
    findPendingApprovalIds,
    findUserInputByCollectionId,
    groupMessagesByDate,
    mergeTranscriptMessages,
    partitionByParent,
} from '../../../web/chat/chatTranscript';
import { toFlatAnswerInput } from '../../../web/chat/chatAssistantInputKinds';
import { useChatLiveUpdates } from '../../../web/chat/useChatLiveUpdates';
import { useWorkspaceAssistantChat } from '../../../web/chat/WorkspaceAssistantChatProvider';
import { WorkspaceChatComposer } from '../../../web/chat/WorkspaceChatComposer';
import { AssistantMarkdown } from '../../../web/components/AssistantMarkdown';
import { Button } from '../../../web/components/base/button';
import { ChatMessage } from '../../../web/components/chat-message';
import type { GqlCChatAssistantInputValue, GqlCWorkspaceChatPageQuery } from '../../../web/graphql/generated';
import {
    WorkspaceChatInputCollectionRespondDocument,
    WorkspaceChatPageDocument,
    WorkspaceChatToolApprovalRespondDocument,
} from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import { useLocale } from '../../../web/hooks/useLocale';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';
import type { Locale } from '../../../web/utils/locale';

// Deep-link surface for a single admin chat — `/workspace/assistant/<chatId>`.
// The previous `/workspace/assistant` landing page is gone: `/workspace`
// already fills the "how do I start a conversation" role via its hero
// composer, and the sidebar covers "how do I resume one" via its chat
// browser. This route exists so a specific chat has a URL you can
// bookmark or paste (e.g. the assistant asking the user to review a
// long-running turn, deep links from search results, etc.).
//
// Rendered surface: the chat's title on top, the transcript centered on
// `max-w-3xl`, and the shared `<WorkspaceChatComposer />` parked at the
// viewport bottom. No chat-list chrome — the sidebar is that.

export const Route = createFileRoute('/{-$locale}/workspace/assistant/$chatId')({
    loader: ({ params }) => routeLoaderGraphqlClient(WorkspaceChatPageDocument, { chatId: params.chatId })(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: { de: 'Persönlicher Assistent', en: 'Personal assistant' }[locale],
            description: {
                de: 'Mein persönlicher KI-Assistent für den Arbeitsbereich.',
                en: 'My personal AI assistant for the workspace.',
            }[locale],
            // The chatId is intentionally omitted from the canonical path —
            // per-chat URLs are private deep links, not indexable pages.
            path: '/workspace/assistant',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        const { chatId } = Route.useParams();
        const data = Route.useLoaderData();
        const chat = data.currentSession.user?.admin?.chat ?? null;
        const live = useChatLiveUpdates(chatId);
        const locale = useLocale();
        if (!chat) return <NotFound locale={locale} />;
        return (
            <>
                {live.listener}
                <WorkspaceAssistantPage chat={chat} live={live} locale={locale} />
            </>
        );
    },
});

type AssistantChat = NonNullable<NonNullable<GqlCWorkspaceChatPageQuery['currentSession']['user']>['admin']>['chat'];

function NotFound({ locale }: { locale: Locale }) {
    // Landing on `/workspace/assistant/<invalid>` is rare — deep links get
    // stale, the admin might have deleted the chat, etc. Instead of
    // erroring out, gesture the user back to a working surface: the
    // workspace hub is where a fresh chat starts.
    return (
        <main className="mx-auto flex h-[calc(100dvh-5rem)] w-full max-w-3xl flex-col items-center justify-center gap-4 p-6 text-center">
            <p className="text-sm text-muted-foreground">{{ de: 'Chat nicht gefunden.', en: 'Chat not found.' }[locale]}</p>
            <Button asChild variant="outline" size="sm">
                <Link to="/{-$locale}/workspace">{{ de: 'Zurück zum Workspace', en: 'Back to workspace' }[locale]}</Link>
            </Button>
        </main>
    );
}

function WorkspaceAssistantPage({
    chat,
    live,
    locale,
}: {
    chat: NonNullable<AssistantChat>;
    live: ReturnType<typeof useChatLiveUpdates>;
    locale: Locale;
}) {
    const [, respondToCollection] = useMutation(WorkspaceChatInputCollectionRespondDocument);
    const [, respondToApproval] = useMutation(WorkspaceChatToolApprovalRespondDocument);
    const { pathname } = useLocation();
    // Sticky model selection is owned by the workspace provider so every
    // surface reflects the same choice.
    const { selectedModelId } = useWorkspaceAssistantChat();

    const onCollectionSubmit = useCallback(
        async (collectionMessageId: string, answers: ReadonlyArray<{ inputId: string; value: GqlCChatAssistantInputValue }>) => {
            const generationId = live.beginTurn();
            const flatAnswers = answers.map((answer) => toFlatAnswerInput(answer.inputId, answer.value));
            await respondToCollection({
                collectionMessageId,
                answers: flatAnswers,
                generationId,
                requireToolCallApprovals: false,
                modelId: selectedModelId,
            });
        },
        [respondToCollection, live, selectedModelId],
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
                modelId: selectedModelId,
            });
        },
        [respondToApproval, live, selectedModelId],
    );

    // Standard chat layout — composer parks against the viewport bottom
    // and the transcript scrolls in between. The workspace layout wraps
    // the outlet in `flex min-h-screen flex-col`, so we give main a
    // definite height (`100dvh` minus the sticky header's flow rail of
    // ~5rem) and make the transcript wrapper the `flex-1 min-h-0` child.
    //
    // Reading width: `max-w-3xl` (~48rem) is the comfortable column for
    // long assistant markdown. Wider crowds the sidebar; narrower crops
    // code blocks.
    //
    // The chat title is not rendered here — the workspace header's
    // trailing breadcrumb already carries it (see
    // `WorkspaceHeader.tsx`'s `TRAILING_LABEL_SELECTORS`). And there's
    // no "New chat" affordance either: the "Workspace" crumb links to
    // the hub, whose hero composer is where a fresh chat starts.
    return (
        <main className="mx-auto flex h-[calc(100dvh-5rem)] w-full min-w-0 max-w-3xl flex-col gap-4 sm:p-6 px-2">
            <ChatTranscript
                chat={chat}
                appendedMessages={live.appendedMessages}
                streamingTexts={live.streamingTexts}
                onCollectionSubmit={onCollectionSubmit}
                onApprovalRespond={onApprovalRespond}
                jumpToLatestLabel={{ de: 'Zum neuesten springen', en: 'Jump to latest' }[locale]}
            />
            <WorkspaceChatComposer
                chatId={chat.chatId}
                isLocked={live.isGenerating}
                beginTurn={live.beginTurn}
                endTurn={live.endTurn}
                locale={locale}
                currentPagePath={pathname}
                autoFocus
            />
        </main>
    );
}

// --- Transcript --------------------------------------------------------------
//
// Mirrors the transcript layout used by the sidebar and the visitor sheet.
// If a third caller shows up this should move to a shared component; for
// two callers the duplication is the smaller cost.

function ChatTranscript({
    chat,
    appendedMessages,
    streamingTexts,
    onCollectionSubmit,
    onApprovalRespond,
    jumpToLatestLabel,
}: {
    chat: NonNullable<AssistantChat>;
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
    // Sub-agent tool-call children render under their parent's card — see
    // `docs/architecture/agent-delegation.md` ("Nested tool calls").
    const { topLevel, childrenByParentId } = partitionByParent(allMessages);
    const groupedMessages = groupMessagesByDate(topLevel);

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
        <div className="relative flex-1 min-h-0 min-w-0">
            <div
                ref={scrollRef}
                onScroll={onScroll}
                className="flex h-full min-w-0 flex-col gap-4 overflow-y-auto overflow-x-hidden scrollbar-gutter-stable"
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
