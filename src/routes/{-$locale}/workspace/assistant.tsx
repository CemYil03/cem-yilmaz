import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { de as deLocale, enUS as enLocale } from 'date-fns/locale';
import { ArrowDownIcon, MessageSquareTextIcon } from 'lucide-react';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { useMutation } from 'urql';
import { z } from 'zod';
import { toFlatAnswerInput } from '../../../web/chat/chatAssistantInputKinds';
import { ChatComposer } from '../../../web/chat/ChatComposer';
import type { TranscriptMessage } from '../../../web/chat/chatTranscript';
import {
    findLatestCollectionId,
    findPendingApprovalIds,
    findUserInputByCollectionId,
    groupMessagesByDate,
    mergeTranscriptMessages,
    partitionByParent,
} from '../../../web/chat/chatTranscript';
import { useChatLiveUpdates } from '../../../web/chat/useChatLiveUpdates';
import { AssistantMarkdown } from '../../../web/components/AssistantMarkdown';
import { Spinner } from '../../../web/components/base/spinner';
import { ChatMessage } from '../../../web/components/chat-message';
import type {
    GqlCChatAssistantInputValue,
    GqlCWorkspaceAssistantChatsQuery,
    GqlCWorkspaceChatListItemFragment,
    GqlCWorkspaceChatPageQuery,
} from '../../../web/graphql/generated';
import {
    WorkspaceAssistantChatsDocument,
    WorkspaceChatInputCollectionRespondDocument,
    WorkspaceChatMessageCreateDocument,
    WorkspaceChatPageDocument,
    WorkspaceChatToolApprovalRespondDocument,
} from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
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
const previousChatsLabel = { de: 'Frühere Chats', en: 'Previous chats' };
const noPreviousChatsLabel = { de: 'Noch keine Chats.', en: 'No chats yet.' };
const untitledLabel = { de: 'Ohne Titel', en: 'Untitled' };

// Mirror the sheet's cap so both empty surfaces show the same horizon. The
// route's empty state has more vertical space than the sheet, but ten rows
// is still a comfortable single-screen list — beyond that it becomes a
// scrolling chore. Once the list gets large enough to need filtering both
// surfaces graduate together.
const RECENT_CHATS_LIMIT = 10;

const DATE_FNS_LOCALE: Record<Locale, typeof deLocale> = { de: deLocale, en: enLocale };

const extractMessageCreateResult = (data: unknown): { chatId: string } | null => {
    const wrapper = data as { admin?: { chatMessageCreate?: { chatId: string } | null } | null } | null | undefined;
    return wrapper?.admin?.chatMessageCreate ?? null;
};

const assistantSearchSchema = z.object({
    chatId: z.string().optional(),
});

// Loader payload. Sidebar/empty-state always need the chat list; the loaded
// view additionally needs the chat detail. We always fetch both so the
// component code can hand either surface a ready array without a second
// trip.
type LoaderData = {
    chats: GqlCWorkspaceAssistantChatsQuery['admin']['chats'];
    chat: NonNullable<NonNullable<GqlCWorkspaceChatPageQuery['admin']>['chat']> | null;
};

export const Route = createFileRoute('/{-$locale}/workspace/assistant')({
    validateSearch: assistantSearchSchema,
    loaderDeps: ({ search }) => ({ chatId: search.chatId }),
    loader: async ({ deps }): Promise<LoaderData> => {
        // Two queries can fan out in parallel — the chat list and the
        // selected chat detail are independent.
        const chatsPromise = routeLoaderGraphqlClient(WorkspaceAssistantChatsDocument)();
        const chatPromise = deps.chatId
            ? routeLoaderGraphqlClient(WorkspaceChatPageDocument, { chatId: deps.chatId })()
            : Promise.resolve(null);
        const [chatsResult, chatResult] = await Promise.all([chatsPromise, chatPromise]);
        return {
            chats: chatsResult.admin.chats,
            chat: chatResult?.admin.chat ?? null,
        };
    },
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
        const data = Route.useLoaderData();
        const live = useChatLiveUpdates(chatId);
        const locale = useLocale();
        return (
            <>
                {live.listener}
                {chatId && data.chat ? (
                    <WorkspaceAssistantPage chat={data.chat} chats={data.chats} live={live} locale={locale} />
                ) : (
                    <WorkspaceAssistantEmpty chats={data.chats} live={live} locale={locale} />
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

function WorkspaceAssistantEmpty({
    chats: allChats,
    live,
    locale,
}: {
    chats: GqlCWorkspaceAssistantChatsQuery['admin']['chats'];
    live: ReturnType<typeof useChatLiveUpdates>;
    locale: Locale;
}) {
    const navigate = useNavigate();
    const chats = allChats.slice(0, RECENT_CHATS_LIMIT);
    return (
        <main className="mx-auto grid h-[calc(100dvh-5rem)] w-full max-w-2xl grid-rows-[1fr_auto] gap-4 p-6">
            <div className="flex min-h-0 flex-col gap-6 overflow-y-auto pr-2">
                <div className="grid place-items-center py-8 text-sm text-muted-foreground">
                    {live.isGenerating ? (
                        <Spinner className="size-4 text-muted-foreground" />
                    ) : (
                        { de: 'Wie kann ich helfen?', en: 'How can I help?' }[locale]
                    )}
                </div>
                <section className="flex flex-col gap-2">
                    <h2 className="text-xs uppercase tracking-wide text-muted-foreground">{previousChatsLabel[locale]}</h2>
                    {chats.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{noPreviousChatsLabel[locale]}</p>
                    ) : (
                        <ul className="flex flex-col gap-1.5">
                            {chats.map((chat) => (
                                <li key={chat.chatId}>
                                    <PreviousChatLink chat={chat} locale={locale} />
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
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

function PreviousChatLink({
    chat,
    locale,
    isActive = false,
}: {
    chat: GqlCWorkspaceChatListItemFragment;
    locale: Locale;
    isActive?: boolean;
}) {
    const relative = formatDistanceToNow(parseISO(chat.lastModifiedAt as unknown as string), {
        addSuffix: true,
        locale: DATE_FNS_LOCALE[locale],
    });
    const title = chat.title.trim() ? chat.title : untitledLabel[locale];
    return (
        <Link
            to="/{-$locale}/workspace/assistant"
            search={{ chatId: chat.chatId }}
            aria-current={isActive ? 'page' : undefined}
            className={
                isActive
                    ? 'flex w-full items-center gap-2 rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-left text-sm text-foreground'
                    : 'flex w-full items-center gap-2 rounded-md border border-input bg-white px-3 py-2 text-left text-sm hover:bg-accent dark:bg-black'
            }
        >
            <MessageSquareTextIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-foreground">{title}</span>
                <span className="text-xs text-muted-foreground">{relative}</span>
            </span>
        </Link>
    );
}

// --- Loaded chat -------------------------------------------------------------

function WorkspaceAssistantPage({
    chat,
    chats,
    live,
    locale,
}: {
    chat: NonNullable<NonNullable<GqlCWorkspaceChatPageQuery['admin']>['chat']>;
    chats: GqlCWorkspaceAssistantChatsQuery['admin']['chats'];
    live: ReturnType<typeof useChatLiveUpdates>;
    locale: Locale;
}) {
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

    // Standard chat layout — composer parks against the viewport bottom and
    // the transcript scrolls in between. The workspace layout wraps the
    // outlet in `flex min-h-screen flex-col`; `min-h-screen` is a minimum,
    // so `flex-1` alone wouldn't clamp main to one viewport — once content
    // grew past the screen, the page would scroll and the composer would
    // ride along. We give main a definite height (`100dvh` minus the
    // floating sticky header's flow rail of ~5rem) so its child flex
    // column has a real bottom anchor: the transcript wrapper takes the
    // leftover space as `flex-1 min-h-0` and scrolls internally, the
    // composer parks below. `dvh` tracks the mobile URL-bar collapse so
    // the composer stays glued to the visible edge.
    return (
        <main className="mx-auto flex h-[calc(100dvh-5rem)] w-full min-w-0 max-w-6xl flex-col gap-6 p-6 lg:flex-row">
            {/* Desktop sidebar: at-a-glance list of recent chats so the
             *  admin can jump between conversations without bouncing back
             *  through the empty state. Hidden under `lg` — the row is the
             *  primary surface on narrow viewports, and the same list is
             *  one tap away from the sheet. */}
            <aside className="hidden w-64 shrink-0 min-h-0 lg:block">
                <ChatsSidebar chats={chats} locale={locale} activeChatId={chat.chatId} />
            </aside>
            <div className="flex min-h-0 flex-1 flex-col gap-4">
                <header className="flex items-baseline justify-between">
                    <h1 className="text-lg font-semibold">{chat.title || { de: 'Neuer Chat', en: 'New chat' }[locale]}</h1>
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
            </div>
        </main>
    );
}

// Sidebar list of admin chats shown on the loaded route. The active chat is
// highlighted so the user always knows where they are in the list; clicking
// any other row just updates the `chatId` search param and the route's own
// loader picks the new payload. The list shares its cap
// (`RECENT_CHATS_LIMIT`) with the sheet's empty state — both surfaces stay
// in lockstep.
function ChatsSidebar({
    chats: allChats,
    locale,
    activeChatId,
}: {
    chats: GqlCWorkspaceAssistantChatsQuery['admin']['chats'];
    locale: Locale;
    activeChatId: string;
}) {
    const chats = allChats.slice(0, RECENT_CHATS_LIMIT);
    return (
        <div className="flex h-full min-h-0 flex-col gap-2">
            <h2 className="text-xs uppercase tracking-wide text-muted-foreground">{previousChatsLabel[locale]}</h2>
            <ul className="flex min-h-0 flex-col gap-1.5 overflow-y-auto pr-1">
                {chats.length === 0 ? (
                    <p className="text-xs text-muted-foreground">{noPreviousChatsLabel[locale]}</p>
                ) : (
                    chats.map((chat) => (
                        <li key={chat.chatId}>
                            <PreviousChatLink chat={chat} locale={locale} isActive={chat.chatId === activeChatId} />
                        </li>
                    ))
                )}
            </ul>
        </div>
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
