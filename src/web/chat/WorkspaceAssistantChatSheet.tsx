import { useNavigate } from '@tanstack/react-router';
import { ExternalLinkIcon, Maximize2Icon, Minimize2Icon, SparklesIcon } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type { TranscriptMessage } from './chatTranscript';
import { mergeTranscriptMessages } from './chatTranscript';
import {
    WorkspaceAssistantChatComposer,
    WorkspaceAssistantChatEmptyState,
    WorkspaceAssistantChatTranscript,
} from './WorkspaceAssistantChatBody';
import { useWorkspaceAssistantChat } from './WorkspaceAssistantChatProvider';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../components/base/sheet';
import { Tooltip, TooltipContent, TooltipTrigger } from '../components/base/tooltip';
import { useIsMobile } from '../hooks/use-mobile';
import { useVisualViewport } from '../hooks/useVisualViewport';
import { cn } from '../utils/cn';
import type { Locale } from '../utils/locale';

// Personal-assistant chat surface for the workspace on **narrow viewports
// only** (`<lg`). On `lg+` the chat lives in the persistent sidebar
// (`WorkspaceAssistantChatSidebar`) — the workspace layout mounts this Sheet
// inside a `lg:hidden` wrapper so it never appears on desktop.
//
// The header on every workspace page contains the assistant button that
// opens this Sheet on narrow viewports (and toggles the sidebar's collapsed
// rail on `lg+`). See `docs/features/chat-workspace.md`.
//
// All mutations go through the `admin.*` namespace so the server dispatches
// to `agentPersonalAssistant`. See `docs/architecture/multi-agent-chat.md`.
//
// The "Open full-screen" button bridges the sheet to the dedicated
// `/workspace/assistant?chatId=<id>` route — the user reads the sheet
// while doing other tasks, then jumps off to focus when the conversation
// gets long. The chat row is the same on both sides; the sheet is the
// in-context surface, the route is the bookmark-able deep-link.

const openFullscreenLabel = { de: 'Im Vollbild öffnen', en: 'Open full-screen' };
const expandLabel = { de: 'Chat vergrößern', en: 'Expand chat' };
const collapseLabel = { de: 'Chat verkleinern', en: 'Collapse chat' };

interface WorkspaceAssistantChatSheetProps {
    locale: Locale;
}

export function WorkspaceAssistantChatSheet({ locale }: WorkspaceAssistantChatSheetProps) {
    const { isOpen, setOpen, chatId, loadedMessages, live } = useWorkspaceAssistantChat();
    const navigate = useNavigate();

    // Desktop-only expand toggle (still useful at `md` widths where the
    // Sheet renders before the sidebar takes over at `lg`). Mobile is
    // always full-bleed; the toggle is `sm:` and up. Reset on close so
    // reopening is the predictable narrow column.
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
                        <WorkspaceAssistantChatEmptyState locale={locale} onNavigateAway={() => setOpen(false)} />
                    ) : (
                        <WorkspaceAssistantChatTranscript messages={allMessages} streamingTexts={live.streamingTexts} locale={locale} />
                    )}
                    <WorkspaceAssistantChatComposer locale={locale} />
                </div>
            </SheetContent>
        </Sheet>
    );
}
