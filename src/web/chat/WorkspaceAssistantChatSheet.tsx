import { Link, useNavigate } from '@tanstack/react-router';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { de as deLocale, enUS as enLocale } from 'date-fns/locale';
import {
    ArrowDownIcon,
    ArrowUpRightIcon,
    ExternalLinkIcon,
    Maximize2Icon,
    MessageSquarePlusIcon,
    MessageSquareTextIcon,
    Minimize2Icon,
    SparklesIcon,
} from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from 'urql';
import { toFlatAnswerInput } from './chatAssistantInputKinds';
import { uploadFile } from './fileUpload';
import type { TranscriptMessage } from './chatTranscript';
import {
    findLatestCollectionId,
    findPendingApprovalIds,
    findUserInputByCollectionId,
    groupMessagesByDate,
    mergeTranscriptMessages,
} from './chatTranscript';
import { useWorkspaceAssistantChat } from './WorkspaceAssistantChatProvider';
import { AssistantMarkdown } from '../components/AssistantMarkdown';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../components/base/sheet';
import { Tooltip, TooltipContent, TooltipTrigger } from '../components/base/tooltip';
import { ChatMessage } from '../components/chat-message';
import { MessageComposer } from '../components/MessageComposer';
import type { ComposerAttachment } from '../components/MessageComposer';
import type { GqlCChatAssistantInputValue, GqlCWorkspaceChatListItemFragment } from '../graphql/generated';
import {
    WorkspaceAssistantChatsDocument,
    WorkspaceChatInputCollectionRespondDocument,
    WorkspaceChatToolApprovalRespondDocument,
} from '../graphql/generated';
import { useIsMobile } from '../hooks/use-mobile';
import { useVisualViewport } from '../hooks/useVisualViewport';
import { cn } from '../utils/cn';
import type { Locale } from '../utils/locale';

// Personal-assistant chat surface for the workspace. Mounted once at the
// workspace layout (`/{-$locale}/workspace.tsx`) so every workspace page
// inherits it — the user can open the sheet from any focus area, ask the
// assistant a question while a long answer streams in, and navigate
// between focus areas without losing the conversation.
//
// All mutations go through the `admin.*` namespace so the server
// dispatches to `agentPersonalAssistant`. See
// `docs/architecture/multi-agent-chat.md` and
// `docs/features/chat-workspace.md`.
//
// The "Open full-screen" button bridges the sheet to the dedicated
// `/workspace/assistant?chatId=<id>` route — the user reads the sheet
// while doing other tasks, then jumps off to focus when the conversation
// gets long. The chat row is the same on both sides; the sheet is the
// in-context surface, the route is the bookmark-able deep-link.

const jumpToLatestLabel = { de: 'Zum neuesten springen', en: 'Jump to latest' };
const newChatLabel = { de: 'Neuen Chat starten', en: 'Start new chat' };
const openFullscreenLabel = { de: 'Im Vollbild öffnen', en: 'Open full-screen' };
const expandLabel = { de: 'Chat vergrößern', en: 'Expand chat' };
const collapseLabel = { de: 'Chat verkleinern', en: 'Collapse chat' };
const previousChatsLabel = { de: 'Frühere Chats', en: 'Previous chats' };
const allChatsLabel = { de: 'Alle Chats ansehen', en: 'View all chats' };
const untitledLabel = { de: 'Ohne Titel', en: 'Untitled' };
const noPreviousChatsLabel = { de: 'Noch keine Chats.', en: 'No chats yet.' };

const DATE_FNS_LOCALE: Record<Locale, typeof deLocale> = { de: deLocale, en: enLocale };

// Recent-chats fan-out cap. The query returns every admin chat newest-first;
// the sheet renders a small at-a-glance list, so we slice to ten. The same
// cap is mirrored on `/workspace/assistant` empty state — once the list grows
// past a screen of rows, both surfaces should switch to a scrollable column
// rather than nudging this number up.
const RECENT_CHATS_LIMIT = 10;

interface WorkspaceAssistantChatSheetProps {
    locale: Locale;
}

export function WorkspaceAssistantChatSheet({ locale }: WorkspaceAssistantChatSheetProps) {
    const { isOpen, setOpen, chatId, loadedMessages, live, resetChat, loadChat } = useWorkspaceAssistantChat();
    const navigate = useNavigate();

    // Desktop-only expand toggle. Same posture as the visitor sheet —
    // mobile is always full-bleed, the toggle is `sm:` and up. Reset on
    // close so reopening is the predictable narrow column.
    const [isExpanded, setIsExpanded] = useState(false);
    useEffect(() => {
        if (!isOpen) setIsExpanded(false);
    }, [isOpen]);

    // Mobile keyboard fit — see the matching comment in
    // `WebsiteVisitorAssistantChatSheet`.
    const isMobile = useIsMobile();
    const visualViewport = useVisualViewport();
    const mobileViewportStyle =
        isMobile && isOpen && visualViewport ? { height: visualViewport.height, top: visualViewport.offsetTop } : undefined;

    const onOpenFullscreen = useCallback(() => {
        // Hand the conversation off to the dedicated route. We don't drop
        // the chatId from the provider — the user might come back to the
        // workspace hub, and the provider's state is the source of truth
        // for "the assistant chat that is in flight right now". The
        // route's own state machine takes over rendering once we
        // navigate.
        setOpen(false);
        void navigate({ to: '/{-$locale}/workspace/assistant', search: chatId ? { chatId } : { chatId: undefined } });
    }, [chatId, navigate, setOpen]);

    const allMessages = mergeTranscriptMessages(loadedMessages, live.appendedMessages as ReadonlyArray<TranscriptMessage>);

    return (
        <Sheet open={isOpen} onOpenChange={setOpen}>
            <SheetContent
                side="right"
                className={cn('flex w-full flex-col gap-0 p-0', isExpanded ? 'sm:max-w-none' : 'sm:max-w-2xl')}
                style={mobileViewportStyle}
            >
                {/* Right-cluster action buttons on the absolute layer above the
                 *  header. The Sheet's built-in close lives at `right-4`; we
                 *  fan our two glyphs out leftward so they don't collide.
                 *  Order matches a natural read: fullscreen first (the
                 *  "send it to a real surface" affordance), then expand
                 *  (the in-sheet widen affordance). */}
                <div className="absolute right-12 top-3.5 z-10 flex items-center gap-1">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                type="button"
                                onClick={onOpenFullscreen}
                                disabled={live.isGenerating}
                                aria-label={openFullscreenLabel[locale]}
                                className="grid size-7 place-items-center rounded-xs text-foreground/70 ring-offset-background transition-opacity hover:text-foreground hover:opacity-100 focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                <ExternalLinkIcon className="size-4" />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent>{openFullscreenLabel[locale]}</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                type="button"
                                onClick={() => setIsExpanded((value) => !value)}
                                aria-label={isExpanded ? collapseLabel[locale] : expandLabel[locale]}
                                aria-pressed={isExpanded}
                                className="hidden size-7 place-items-center rounded-xs text-foreground/70 ring-offset-background transition-opacity hover:text-foreground hover:opacity-100 focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 sm:grid"
                            >
                                {isExpanded ? <Minimize2Icon className="size-4" /> : <Maximize2Icon className="size-4" />}
                            </button>
                        </TooltipTrigger>
                        <TooltipContent>{isExpanded ? collapseLabel[locale] : expandLabel[locale]}</TooltipContent>
                    </Tooltip>
                </div>
                <SheetHeader className="border-b px-6 py-4">
                    <div className={isExpanded ? 'mx-auto flex w-full max-w-3xl flex-col gap-1.5' : 'flex flex-col gap-1.5'}>
                        <div className="flex items-center gap-2 text-primary">
                            <SparklesIcon className="size-4" />
                            <SheetTitle>{{ de: 'Persönlicher Assistent', en: 'Personal assistant' }[locale]}</SheetTitle>
                        </div>
                        <SheetDescription>
                            {
                                {
                                    de: 'Frag deinen Assistenten — der Chat läuft weiter, während du zwischen den Bereichen wechselst.',
                                    en: 'Ask your assistant — the chat keeps running while you move between focus areas.',
                                }[locale]
                            }
                        </SheetDescription>
                    </div>
                </SheetHeader>

                <div
                    className={cn(
                        'grid min-h-0 flex-1 grid-rows-[1fr_auto] gap-4 px-6 pt-4 pb-6',
                        isExpanded && 'mx-auto w-full max-w-3xl',
                    )}
                >
                    {allMessages.length === 0 && !live.isGenerating ? (
                        <EmptyState locale={locale} onResume={loadChat} onNavigateAway={() => setOpen(false)} />
                    ) : (
                        <ChatTranscript messages={allMessages} streamingTexts={live.streamingTexts} locale={locale} />
                    )}
                    <WorkspaceAssistantComposer locale={locale} hasChat={!!chatId} onReset={resetChat} />
                </div>
            </SheetContent>
        </Sheet>
    );
}

function EmptyState({
    locale,
    onResume,
    onNavigateAway,
}: {
    locale: Locale;
    onResume: (chatId: string) => void | Promise<void>;
    onNavigateAway: () => void;
}) {
    // Show the most-recent chats so the admin can resume one in place
    // instead of jumping out to the dedicated route just to find a row.
    // `cache-and-network` keeps the list reactive — a fresh send updates
    // `lastModifiedAt`, the next time the sheet shows its empty state the
    // resumed chat lands at the top without a hard reload.
    const [{ data }] = useQuery({ query: WorkspaceAssistantChatsDocument, requestPolicy: 'cache-and-network' });
    const chats = (data?.admin.chats ?? []).slice(0, RECENT_CHATS_LIMIT);

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
                                <PreviousChatButton chat={chat} locale={locale} onResume={onResume} />
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
// Talks to the provider's `sendMessage` funnel so a `chatId` allocated by
// the first send is reused by every subsequent send without state
// gymnastics at the call site. Mirrors `VisitorChatComposer` in shape but
// dispatches to the admin namespace via the provider.

function WorkspaceAssistantComposer({ locale, hasChat, onReset }: { locale: Locale; hasChat: boolean; onReset: () => void }) {
    const { sendMessage, live } = useWorkspaceAssistantChat();
    const [draft, setDraft] = useState('');
    // Attachments are owned by the composer, not the provider — uploads
    // are kicked off on attach (so the user can keep typing while files
    // settle) and the resolved `fileUploadId`s are forwarded through the
    // provider's `sendMessage`. Same shape as the route composer in
    // `ChatComposer.tsx`; the duplication is small enough that a shared
    // wrapper would obscure more than it would save.
    const [attachments, setAttachments] = useState<ComposerAttachment[]>([]);

    const updateAttachment = useCallback((localId: string, patch: Partial<ComposerAttachment>) => {
        setAttachments((current) =>
            current.map((attachment) => (attachment.localId === localId ? { ...attachment, ...patch } : attachment)),
        );
    }, []);

    const onAttachmentsAdd = useCallback(
        (files: File[]) => {
            const additions: ComposerAttachment[] = files.map((file) => ({
                localId: crypto.randomUUID(),
                file,
                status: 'uploading' as const,
            }));
            setAttachments((current) => [...current, ...additions]);
            for (const attachment of additions) {
                void (async () => {
                    try {
                        const uploaded = await uploadFile(attachment.file);
                        updateAttachment(attachment.localId, {
                            status: 'uploaded',
                            fileUploadId: uploaded.fileUploadId,
                        });
                    } catch (error) {
                        const message = error instanceof Error ? error.message : 'Upload failed';
                        updateAttachment(attachment.localId, { status: 'error', error: message });
                    }
                })();
            }
        },
        [updateAttachment],
    );

    const onAttachmentRemove = useCallback((localId: string) => {
        setAttachments((current) => current.filter((attachment) => attachment.localId !== localId));
    }, []);

    const submit = useCallback(async () => {
        const message = draft.trim();
        const fileUploadIds = attachments
            .filter((attachment) => attachment.status === 'uploaded' && attachment.fileUploadId)
            .map((attachment) => attachment.fileUploadId!);
        if (!message && fileUploadIds.length === 0) return;
        setDraft('');
        setAttachments([]);
        await sendMessage(message, fileUploadIds);
    }, [attachments, draft, sendMessage]);

    return (
        <MessageComposer
            value={draft}
            onValueChange={setDraft}
            onSubmit={() => void submit()}
            disabled={live.isGenerating}
            busy={live.isGenerating}
            placeholder={{ de: 'Frag deinen Assistenten…', en: 'Ask your assistant…' }[locale]}
            sendLabel={{ de: 'Senden', en: 'Send' }[locale]}
            attachments={attachments}
            onAttachmentsAdd={onAttachmentsAdd}
            onAttachmentRemove={onAttachmentRemove}
            addonStart={
                hasChat ? (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                type="button"
                                onClick={onReset}
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

function ChatTranscript({
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
    const groupedMessages = groupMessagesByDate(messages);
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
