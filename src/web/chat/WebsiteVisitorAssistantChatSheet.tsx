import { useCallback, useEffect, useState } from 'react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { Maximize2Icon, MessageSquareTextIcon, Minimize2Icon, PlusIcon, SparklesIcon } from 'lucide-react';
import { useLocation } from '@tanstack/react-router';
import { useMutation, useQuery } from 'urql';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../components/base/sheet';
import { Spinner } from '../components/base/spinner';
import type { GqlCChatAssistantInputValue, GqlCChatPageQuery, GqlCVisitorChatListItemFragment } from '../graphql/generated';
import {
    ChatInputCollectionRespondDocument,
    ChatPageDocument,
    ChatToolApprovalRespondDocument,
    VisitorPreviousChatsDocument,
} from '../graphql/generated';
import { useIsMobile } from '../hooks/use-mobile';
import { useVisualViewport } from '../hooks/useVisualViewport';
import { cn } from '../utils/cn';
import { DATE_FNS_LOCALE } from '../utils/dateFnsLocale';
import type { Locale } from '../utils/locale';
import { toFlatAnswerInput } from './chatAssistantInputKinds';
import { ChatTranscript as SharedChatTranscript } from './ChatTranscriptShared';
import { VisitorChatComposer } from './VisitorChatComposer';
import { mergeTranscriptMessages } from './chatTranscript';
import type { TranscriptMessage } from './chatTranscript';
import { useVisitorChat } from './VisitorChatProvider';
import { Button } from '../components/base/button';

// Visitor-facing AI chat surface. Mounted once at the root layout — see
// `__root.tsx` — so any surface can open it via `useVisitorChat()` without
// duplicating the sheet tree. The route under `/workspace/assistant` is a
// distinct surface that talks to the personal-assistant agent through the
// `admin.*` namespace — this sheet uses the visitor (non-admin) GraphQL ops
// so the server dispatches to `agentVisitor`. See
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

interface WebsiteVisitorAssistantChatSheetProps {
    locale: Locale;
}

export function WebsiteVisitorAssistantChatSheet({ locale }: WebsiteVisitorAssistantChatSheetProps) {
    const { isOpen, close } = useVisitorChat();
    // The sheet lives at the root layout, so `useLocation()` here tracks
    // whatever public page the visitor is currently on. We forward the
    // pathname to the composers so each `chatMessageCreate` carries the
    // route the visitor was looking at when they hit Send — the agent's
    // system prompt anchors short references ("tell me more", "what is
    // this") against it. See `docs/features/chat-visitor.md`.
    const { pathname } = useLocation();

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
                {isOpen ? <ChatSurface locale={locale} isExpanded={isExpanded} currentPagePath={pathname} /> : null}
            </SheetContent>
        </Sheet>
    );
}

// --- Surface inside the sheet -----------------------------------------------
//
// Reads chatId + live from the visitor provider — if a chat is active
// (chatId set, possibly from a hero-composer send before the sheet ever
// opened) we drop straight into `<ChatLoaded />`; otherwise the empty
// state renders the previous-chats list and a fresh composer.

function ChatSurface({ locale, isExpanded, currentPagePath }: { locale: Locale; isExpanded: boolean; currentPagePath: string }) {
    const { chatId } = useVisitorChat();
    // Cap the inner column when expanded so the prose stays readable on a
    // wide viewport. The sheet itself still spans the viewport — only the
    // content column reads at ~3xl.
    const innerClass = cn('grid min-h-0 flex-1 grid-rows-[1fr_auto] gap-4 px-6 pt-4 pb-6', isExpanded && 'mx-auto w-full max-w-3xl');
    return chatId ? (
        <ChatLoaded chatId={chatId} locale={locale} innerClass={innerClass} currentPagePath={currentPagePath} />
    ) : (
        <ChatEmptyState locale={locale} innerClass={innerClass} currentPagePath={currentPagePath} />
    );
}

// --- Empty state ------------------------------------------------------------
//
// What the sheet shows when there is no active chatId — i.e. the header
// button path or after the user clicks "New chat" inside a loaded view.
// Renders the visitor's prior chats (so they can resume one) and a fresh
// composer. The always-visible rate-limit chip lives inside
// `<VisitorChatComposer />`.

function ChatEmptyState({ locale, innerClass, currentPagePath }: { locale: Locale; innerClass: string; currentPagePath: string }) {
    const { live, loadChat, setChatIdFromHero } = useVisitorChat();
    // `cache-and-network` so the previous-chats list refreshes on every
    // reopen — without it a stale list from yesterday would render while
    // the network call is in flight.
    const [{ data }] = useQuery({
        query: VisitorPreviousChatsDocument,
        requestPolicy: 'cache-and-network',
    });

    const previousChats = data?.sessionFindOne.visitorChatFindMany ?? [];

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
                                    <PreviousChatButton chat={chat} locale={locale} onResume={loadChat} />
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
            <VisitorChatComposer
                locale={locale}
                chatId={undefined}
                isLocked={live.isGenerating}
                beginTurn={live.beginTurn}
                endTurn={live.endTurn}
                placeholder={{ de: 'Stell eine Frage…', en: 'Ask a question…' }[locale]}
                onMessageSent={setChatIdFromHero}
                currentPagePath={currentPagePath}
                // Sheet opens → composer mounts fresh → focus the textarea
                // so the visitor can start typing immediately.
                autoFocus
            />
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

function ChatLoaded({
    chatId,
    locale,
    innerClass,
    currentPagePath,
}: {
    chatId: string;
    locale: Locale;
    innerClass: string;
    currentPagePath: string;
}) {
    const { live, resetChat } = useVisitorChat();
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

    const chat = data?.sessionFindOne.visitorChatFindOne;

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
                isGenerating={live.isGenerating}
                jumpToLatestLabel={{ de: 'Zum neuesten springen', en: 'Jump to latest' }[locale]}
            />
            <VisitorChatComposer
                chatId={chat.chatId}
                isLocked={live.isGenerating}
                locale={locale}
                beginTurn={live.beginTurn}
                endTurn={live.endTurn}
                placeholder={{ de: 'Stelle eine weitere Frage…', en: 'Ask another question…' }[locale]}
                currentPagePath={currentPagePath}
                // Sheet opens fresh on resume → focus the textarea so the
                // visitor can keep typing without reaching for the input.
                autoFocus
                addonStart={
                    <Button onClick={resetChat} disabled={live.isGenerating} aria-label={newChatLabel[locale]} variant="ghost">
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
// Thin wrapper over the shared `<ChatTranscript />` — same shape the workspace
// surfaces use. See `docs/architecture/chat-transcript.md`.

function ChatTranscript({
    chat,
    appendedMessages,
    streamingTexts,
    onCollectionSubmit,
    onApprovalRespond,
    fetching,
    isGenerating,
    jumpToLatestLabel,
}: {
    chat: NonNullable<GqlCChatPageQuery['sessionFindOne']['visitorChatFindOne']>;
    appendedMessages: ReadonlyArray<TranscriptMessage>;
    streamingTexts: Readonly<Record<string, string>>;
    onCollectionSubmit: (
        collectionMessageId: string,
        answers: ReadonlyArray<{ inputId: string; value: GqlCChatAssistantInputValue }>,
    ) => void;
    onApprovalRespond: (approvalId: string, approved: boolean, reason?: string) => void;
    fetching: boolean;
    isGenerating: boolean;
    jumpToLatestLabel: string;
}) {
    const allMessages = mergeTranscriptMessages(chat.messages, appendedMessages);
    return (
        <div className="relative min-h-0 min-w-0 flex-1">
            <SharedChatTranscript
                messages={allMessages}
                streamingTexts={streamingTexts}
                onCollectionSubmit={onCollectionSubmit}
                onApprovalRespond={onApprovalRespond}
                jumpToLatestLabel={jumpToLatestLabel}
                initialFetching={fetching}
                isGenerating={isGenerating}
            />
        </div>
    );
}
