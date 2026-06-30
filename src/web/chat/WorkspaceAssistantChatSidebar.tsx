import { useNavigate } from '@tanstack/react-router';
import { ExternalLinkIcon, PanelRightCloseIcon, PanelRightOpenIcon, SparklesIcon } from 'lucide-react';
import { useCallback } from 'react';
import type { TranscriptMessage } from './chatTranscript';
import { mergeTranscriptMessages } from './chatTranscript';
import {
    WorkspaceAssistantChatComposer,
    WorkspaceAssistantChatEmptyState,
    WorkspaceAssistantChatTranscript,
} from './WorkspaceAssistantChatBody';
import { useWorkspaceAssistantChat } from './WorkspaceAssistantChatProvider';
import { Tooltip, TooltipContent, TooltipTrigger } from '../components/base/tooltip';
import { cn } from '../utils/cn';
import type { Locale } from '../utils/locale';

// Persistent right-side sidebar that hosts the workspace personal-assistant
// on `lg+` viewports. Replaces the right-side Sheet on desktop — the chat
// lives **alongside** the workspace surface rather than overlaying it, so
// Cem can ask the assistant a question and keep editing/reading without
// dismissing anything. Below `lg` this sidebar is hidden via the workspace
// layout's `hidden lg:flex` wrapper, and the Sheet
// (`WorkspaceAssistantChatSheet`) takes over.
//
// Two states governed by the provider's `isCollapsed` flag:
//
//  - Expanded (default): a 26rem column with the full transcript, composer,
//    and chrome (full-screen + collapse buttons in the top right).
//  - Collapsed rail: a 12-unit-wide vertical strip with just the sparkle
//    icon. Clicking anywhere on the rail expands it. The preference is
//    persisted in `localStorage`, so reloading restores the last state.
//
// Mounted once by `src/routes/{-$locale}/workspace.tsx`. The conversation
// state, the SSE listener, the model dropdown, and the recent-chats list
// all live on `WorkspaceAssistantChatProvider`; this component is purely
// the desktop frame for the shared body. See
// `docs/features/chat-workspace.md`.

const openFullscreenLabel = { de: 'Im Vollbild öffnen', en: 'Open full-screen' };
const collapseLabel = { de: 'Seitenleiste einklappen', en: 'Collapse sidebar' };
const expandLabel = { de: 'Seitenleiste ausklappen', en: 'Expand sidebar' };
const assistantLabel = { de: 'Persönlicher Assistent', en: 'Personal assistant' };
const assistantSubtitle = {
    de: 'Frag deinen Assistenten — der Chat läuft weiter, während du zwischen den Bereichen wechselst.',
    en: 'Ask your assistant — the chat keeps running while you move between focus areas.',
};

interface WorkspaceAssistantChatSidebarProps {
    locale: Locale;
}

export function WorkspaceAssistantChatSidebar({ locale }: WorkspaceAssistantChatSidebarProps) {
    const { isCollapsed, setCollapsed, chatId, loadedMessages, live } = useWorkspaceAssistantChat();
    if (isCollapsed) return <CollapsedRail locale={locale} onExpand={() => setCollapsed(false)} />;
    return (
        <ExpandedSidebar
            locale={locale}
            chatId={chatId}
            loadedMessages={loadedMessages}
            isGenerating={live.isGenerating}
            appendedMessages={live.appendedMessages as ReadonlyArray<TranscriptMessage>}
            streamingTexts={live.streamingTexts}
            onCollapse={() => setCollapsed(true)}
        />
    );
}

function ExpandedSidebar({
    locale,
    chatId,
    loadedMessages,
    isGenerating,
    appendedMessages,
    streamingTexts,
    onCollapse,
}: {
    locale: Locale;
    chatId: string | undefined;
    loadedMessages: ReadonlyArray<TranscriptMessage>;
    isGenerating: boolean;
    appendedMessages: ReadonlyArray<TranscriptMessage>;
    streamingTexts: Readonly<Record<string, string>>;
    onCollapse: () => void;
}) {
    const navigate = useNavigate();
    const onOpenFullscreen = useCallback(() => {
        // Same handoff as the Sheet — hands the conversation to the dedicated
        // route. Provider keeps its chatId so navigating back to a workspace
        // page restores the sidebar in flight.
        void navigate({ to: '/{-$locale}/workspace/assistant', search: chatId ? { chatId } : { chatId: undefined } });
    }, [chatId, navigate]);

    const allMessages = mergeTranscriptMessages(loadedMessages, appendedMessages);

    return (
        <aside
            className={cn(
                // Sticky to the top so the sidebar's full height equals the
                // viewport while the main column scrolls beneath the header.
                // `max-h-screen` clamps the inner column so the transcript
                // can scroll inside; `flex-col` stacks header / body /
                // composer.
                'sticky top-0 flex h-screen max-h-screen w-[26rem] shrink-0 flex-col border-l border-border bg-background',
            )}
        >
            <header className="relative flex items-start justify-between gap-2 border-b border-border px-5 py-4">
                <div className="flex min-w-0 flex-col gap-1.5">
                    <div className="flex items-center gap-2 text-primary">
                        <SparklesIcon className="size-4" />
                        <span className="font-semibold">{assistantLabel[locale]}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{assistantSubtitle[locale]}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                type="button"
                                onClick={onOpenFullscreen}
                                disabled={isGenerating}
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
                                onClick={onCollapse}
                                aria-label={collapseLabel[locale]}
                                className="grid size-7 place-items-center rounded-xs text-foreground/70 ring-offset-background transition-opacity hover:text-foreground hover:opacity-100 focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2"
                            >
                                <PanelRightCloseIcon className="size-4" />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent>{collapseLabel[locale]}</TooltipContent>
                    </Tooltip>
                </div>
            </header>

            <div className="grid min-h-0 flex-1 grid-rows-[1fr_auto] gap-4 px-5 pt-4 pb-5">
                {allMessages.length === 0 && !isGenerating ? (
                    <WorkspaceAssistantChatEmptyState locale={locale} />
                ) : (
                    <WorkspaceAssistantChatTranscript messages={allMessages} streamingTexts={streamingTexts} locale={locale} />
                )}
                <WorkspaceAssistantChatComposer locale={locale} />
            </div>
        </aside>
    );
}

function CollapsedRail({ locale, onExpand }: { locale: Locale; onExpand: () => void }) {
    return (
        <aside className="sticky top-0 flex h-screen max-h-screen w-12 shrink-0 flex-col items-center border-l border-border bg-background">
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        type="button"
                        onClick={onExpand}
                        aria-label={expandLabel[locale]}
                        className="mt-3 grid size-9 place-items-center rounded-md text-foreground/70 hover:bg-accent hover:text-foreground focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    >
                        <PanelRightOpenIcon className="size-5" />
                    </button>
                </TooltipTrigger>
                <TooltipContent side="left">{expandLabel[locale]}</TooltipContent>
            </Tooltip>
            <div className="mt-2 grid size-9 place-items-center text-primary">
                <SparklesIcon className="size-4" />
            </div>
        </aside>
    );
}
