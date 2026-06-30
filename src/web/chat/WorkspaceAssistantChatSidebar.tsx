import { useNavigate } from '@tanstack/react-router';
import { ExternalLinkIcon, PanelRightCloseIcon, SparklesIcon } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { TranscriptMessage } from './chatTranscript';
import { mergeTranscriptMessages } from './chatTranscript';
import {
    WorkspaceAssistantChatComposer,
    WorkspaceAssistantChatEmptyState,
    WorkspaceAssistantChatTranscript,
} from './WorkspaceAssistantChatBody';
import { useWorkspaceAssistantChat } from './WorkspaceAssistantChatProvider';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, useSidebar } from '../components/base/sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from '../components/base/tooltip';
import type { Locale } from '../utils/locale';

// Persistent right-side workspace-assistant sidebar built on shadcn's
// `<Sidebar collapsible="offcanvas" side="right">`. Choices:
//
//   - `collapsible="offcanvas"` — collapsing slides the sidebar fully off
//     the right edge (no leftover icon rail). The header assistant button
//     is the way back; on `<md` shadcn renders the sidebar as a Sheet via
//     the same primitive, so the same toggle handles both viewports.
//   - The default width matches the Sheet that used to host this chat
//     (42rem ≈ shadcn `sm:max-w-2xl`), and the user can drag the sidebar's
//     left edge outward to widen it further. The width is persisted to
//     `localStorage` so the preference survives reloads. Dragging inward
//     past the default is clamped — making it narrower trades on screen
//     real estate without giving back enough room to matter, and the
//     "close it instead" affordance is the assistant button.
//
// State (chatId, live updates, recent chats, sticky model) all lives on
// `WorkspaceAssistantChatProvider`. This file is purely the frame.
//
// See `docs/features/chat-workspace.md`.

const openFullscreenLabel = { de: 'Im Vollbild öffnen', en: 'Open full-screen' };
const collapseLabel = { de: 'Assistent ausblenden', en: 'Hide assistant' };
const assistantLabel = { de: 'Persönlicher Assistent', en: 'Personal assistant' };
const assistantSubtitle = {
    de: 'Frag deinen Assistenten — der Chat läuft weiter, während du zwischen den Bereichen wechselst.',
    en: 'Ask your assistant — the chat keeps running while you move between focus areas.',
};
const resizeLabel = { de: 'Breite anpassen', en: 'Resize' };

// Width bounds. The default matches the prior Sheet (`sm:max-w-2xl` ≈ 42rem
// = 672px); the user can drag outward, never inward past the default. The
// max keeps the inset column usable on a 1440px display.
const DEFAULT_WIDTH_PX = 672;
const MAX_WIDTH_PX = 960;
const WIDTH_STORAGE_KEY = 'workspaceAssistantSidebar.widthPx';

function readStoredWidth(): number {
    if (typeof window === 'undefined') return DEFAULT_WIDTH_PX;
    const raw = window.localStorage.getItem(WIDTH_STORAGE_KEY);
    if (!raw) return DEFAULT_WIDTH_PX;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return DEFAULT_WIDTH_PX;
    return Math.min(MAX_WIDTH_PX, Math.max(DEFAULT_WIDTH_PX, parsed));
}

interface WorkspaceAssistantChatSidebarProps {
    locale: Locale;
}

export function WorkspaceAssistantChatSidebar({ locale }: WorkspaceAssistantChatSidebarProps) {
    const { chatId, loadedMessages, live } = useWorkspaceAssistantChat();
    const { toggleSidebar, isMobile } = useSidebar();
    const navigate = useNavigate();

    // Persisted width on desktop. shadcn's Sidebar reads the
    // `--sidebar-width` CSS variable off the `<SidebarProvider>` wrapper,
    // so we set it as an inline style on the wrapper via the
    // `style` slot — but the wrapper is mounted by the layout, not here.
    // Instead we forward the value through `style` on the Sidebar
    // primitive itself, which propagates it to the sticky gap + container
    // children (both read `var(--sidebar-width)` from their ancestor). On
    // mobile shadcn uses `--sidebar-width-mobile` (its own constant 18rem)
    // for the Sheet width, so we don't touch that.
    const [widthPx, setWidthPx] = useState<number>(DEFAULT_WIDTH_PX);
    useEffect(() => setWidthPx(readStoredWidth()), []);
    const onWidthCommit = useCallback((next: number) => {
        const clamped = Math.min(MAX_WIDTH_PX, Math.max(DEFAULT_WIDTH_PX, next));
        setWidthPx(clamped);
        if (typeof window !== 'undefined') {
            window.localStorage.setItem(WIDTH_STORAGE_KEY, String(clamped));
        }
    }, []);

    const onOpenFullscreen = useCallback(() => {
        // Hands the conversation off to the dedicated route. Provider keeps
        // its chatId so navigating back to a workspace page restores the
        // sidebar in flight.
        void navigate({ to: '/{-$locale}/workspace/assistant', search: chatId ? { chatId } : { chatId: undefined } });
    }, [chatId, navigate]);

    const allMessages = mergeTranscriptMessages(loadedMessages, live.appendedMessages as ReadonlyArray<TranscriptMessage>);
    const isEmpty = allMessages.length === 0 && !live.isGenerating;

    return (
        <Sidebar
            side="right"
            collapsible="offcanvas"
            variant="sidebar"
            style={{ '--sidebar-width': `${widthPx}px` } as React.CSSProperties}
        >
            {/* Left-edge resize handle. Hidden on mobile (the Sheet is full
             *  width on phones anyway) and behind the sidebar's
             *  expanded/collapsed transition so it doesn't grab during
             *  off-canvas slide. */}
            {!isMobile ? <ResizeHandle widthPx={widthPx} setWidthPx={setWidthPx} onCommit={onWidthCommit} locale={locale} /> : null}

            <SidebarHeader className="gap-0 border-b border-sidebar-border p-0">
                <div className="flex items-start justify-between gap-2 px-4 py-3.5">
                    <div className="flex min-w-0 flex-col gap-1">
                        <div className="flex items-center gap-2 text-primary">
                            <SparklesIcon className="size-4" />
                            <span className="text-sm font-semibold text-sidebar-foreground">{assistantLabel[locale]}</span>
                        </div>
                        <p className="text-xs text-sidebar-foreground/60">{assistantSubtitle[locale]}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    type="button"
                                    onClick={onOpenFullscreen}
                                    disabled={live.isGenerating}
                                    aria-label={openFullscreenLabel[locale]}
                                    className="grid size-7 place-items-center rounded-md text-sidebar-foreground/70 transition-opacity hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus:outline-hidden focus:ring-2 focus:ring-sidebar-ring focus:ring-offset-2 focus:ring-offset-sidebar disabled:cursor-not-allowed disabled:opacity-40"
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
                                    onClick={toggleSidebar}
                                    aria-label={collapseLabel[locale]}
                                    className="grid size-7 place-items-center rounded-md text-sidebar-foreground/70 transition-opacity hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus:outline-hidden focus:ring-2 focus:ring-sidebar-ring focus:ring-offset-2 focus:ring-offset-sidebar"
                                >
                                    <PanelRightCloseIcon className="size-4" />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent>{collapseLabel[locale]}</TooltipContent>
                        </Tooltip>
                    </div>
                </div>
            </SidebarHeader>

            <SidebarContent className="min-h-0 flex-1 overflow-hidden p-0">
                <div className="flex min-h-0 flex-1 flex-col gap-4 px-4 pt-4 pb-0">
                    {isEmpty ? (
                        <WorkspaceAssistantChatEmptyState locale={locale} />
                    ) : (
                        <WorkspaceAssistantChatTranscript messages={allMessages} streamingTexts={live.streamingTexts} locale={locale} />
                    )}
                </div>
            </SidebarContent>
            <SidebarFooter className="border-t border-sidebar-border p-3">
                <WorkspaceAssistantChatComposer locale={locale} />
            </SidebarFooter>
        </Sidebar>
    );
}

// Drag handle anchored to the sidebar's left edge. Dragging left widens the
// sidebar (the right edge is pinned to the viewport edge by shadcn), dragging
// right narrows it back toward the default width. The handle sits above the
// sidebar's z-stack so the user can grab it without hitting the transcript.
function ResizeHandle({
    widthPx,
    setWidthPx,
    onCommit,
    locale,
}: {
    widthPx: number;
    setWidthPx: (px: number) => void;
    onCommit: (px: number) => void;
    locale: Locale;
}) {
    const startWidthRef = useRef(widthPx);
    const startXRef = useRef(0);
    const [isDragging, setIsDragging] = useState(false);

    const onPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
        // Left mouse / primary touch only. Right-click on the handle should
        // open the context menu, not start a drag.
        if (event.button !== 0) return;
        event.preventDefault();
        startWidthRef.current = widthPx;
        startXRef.current = event.clientX;
        setIsDragging(true);
        const onMove = (e: PointerEvent) => {
            // Sidebar is right-docked; moving the pointer left from its left
            // edge should make the sidebar wider, so we subtract the delta.
            const next = startWidthRef.current - (e.clientX - startXRef.current);
            const clamped = Math.min(MAX_WIDTH_PX, Math.max(DEFAULT_WIDTH_PX, next));
            setWidthPx(clamped);
        };
        const onUp = (e: PointerEvent) => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            const next = startWidthRef.current - (e.clientX - startXRef.current);
            onCommit(next);
            setIsDragging(false);
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
    };

    return (
        <button
            type="button"
            aria-label={resizeLabel[locale]}
            tabIndex={-1}
            onPointerDown={onPointerDown}
            className={
                // Pinned to the inner container's left edge. Wider hit area
                // than visible width so the user doesn't have to aim. Visible
                // affordance is a 2px line that fills in on hover/drag.
                'absolute inset-y-0 left-0 z-20 hidden w-2 cursor-ew-resize select-none after:absolute after:inset-y-0 after:left-1/2 after:w-px after:bg-transparent hover:after:bg-sidebar-border md:block ' +
                (isDragging ? 'after:bg-sidebar-border' : '')
            }
        />
    );
}
