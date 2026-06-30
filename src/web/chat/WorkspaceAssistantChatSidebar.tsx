import { useNavigate } from '@tanstack/react-router';
import { ExternalLinkIcon, PanelRightCloseIcon, SparklesIcon } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
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
//     and the sidebar's own "Hide" glyph both toggle it; on `<md` shadcn
//     renders the sidebar as a Sheet via the same primitive.
//   - **Width is owned by the workspace layout.** The layout sets the
//     `--sidebar-width` CSS variable on `<SidebarProvider>` (so the
//     `sidebar-gap` spacer that reflows `<SidebarInset>` picks it up). The
//     drag handle here writes the variable directly to the DOM during a
//     drag so the resize is one CSS-variable update per pointermove —
//     no React re-render of this subtree per frame — and commits to
//     `localStorage` on pointer release so reloads keep the preference.
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

interface WorkspaceAssistantChatSidebarProps {
    locale: Locale;
    minWidthPx: number;
    maxWidthPx: number;
    /** Called once per drag, on pointer-up, with the final pixel width.
     *  The layout persists it to `localStorage` and updates its React
     *  state so SSR + the cookie-backed `defaultOpen` stay in sync. */
    onWidthCommit: (px: number) => void;
}

export function WorkspaceAssistantChatSidebar({ locale, minWidthPx, maxWidthPx, onWidthCommit }: WorkspaceAssistantChatSidebarProps) {
    const { chatId, loadedMessages, live } = useWorkspaceAssistantChat();
    const { toggleSidebar, isMobile } = useSidebar();
    const navigate = useNavigate();

    const onOpenFullscreen = useCallback(() => {
        // Hands the conversation off to the dedicated route. Provider keeps
        // its chatId so navigating back to a workspace page restores the
        // sidebar in flight.
        void navigate({ to: '/{-$locale}/workspace/assistant', search: chatId ? { chatId } : { chatId: undefined } });
    }, [chatId, navigate]);

    const allMessages = mergeTranscriptMessages(loadedMessages, live.appendedMessages as ReadonlyArray<TranscriptMessage>);
    const isEmpty = allMessages.length === 0 && !live.isGenerating;

    return (
        <Sidebar side="right" collapsible="offcanvas" variant="sidebar">
            {/* Left-edge resize handle. Hidden on mobile (the Sheet is full
             *  width on phones anyway). */}
            {!isMobile ? <ResizeHandle minWidthPx={minWidthPx} maxWidthPx={maxWidthPx} onCommit={onWidthCommit} locale={locale} /> : null}

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

// Drag handle anchored to the sidebar's left edge. Pulling outward widens the
// sidebar (the right edge is pinned to the viewport edge by shadcn). The
// width is communicated via the `--sidebar-width` CSS variable that the
// workspace layout sets on `<SidebarProvider>`; during drag we write the
// variable directly to that node so the gap + container both reflow per
// pointermove without re-rendering React. `onCommit` runs once on pointer
// release with the final width.
function ResizeHandle({
    minWidthPx,
    maxWidthPx,
    onCommit,
    locale,
}: {
    minWidthPx: number;
    maxWidthPx: number;
    onCommit: (px: number) => void;
    locale: Locale;
}) {
    const startWidthRef = useRef(0);
    const startXRef = useRef(0);
    const providerNodeRef = useRef<HTMLElement | null>(null);
    const lastWidthRef = useRef(minWidthPx);
    const [isDragging, setIsDragging] = useState(false);

    const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
        // Left mouse / primary touch only. Right-click on the handle should
        // open the context menu, not start a drag.
        if (event.button !== 0) return;
        event.preventDefault();
        // The `--sidebar-width` variable lives on the shadcn `sidebar-wrapper`
        // (the `<SidebarProvider>` root) — that's the ancestor that scopes it
        // to every consumer (the gap, the container, the inset reflow).
        // Walk up to find it once at drag start.
        const wrapper = (event.currentTarget as HTMLElement).closest<HTMLElement>('[data-slot="sidebar-wrapper"]');
        if (!wrapper) return;
        providerNodeRef.current = wrapper;
        // Read the live width from the rendered sidebar container so the
        // drag picks up wherever the previous resize left off, including
        // the SSR default.
        const sidebarEl = wrapper.querySelector<HTMLElement>('[data-slot="sidebar-container"]');
        startWidthRef.current = sidebarEl?.getBoundingClientRect().width ?? minWidthPx;
        startXRef.current = event.clientX;
        lastWidthRef.current = startWidthRef.current;
        setIsDragging(true);
        document.body.style.cursor = 'ew-resize';
        // Disable text selection for the duration — without this the drag
        // selects whatever's under the pointer.
        document.body.style.userSelect = 'none';
        const onMove = (e: PointerEvent) => {
            // Sidebar is right-docked; moving the pointer left from its left
            // edge should make the sidebar wider, so we subtract the delta.
            const next = startWidthRef.current - (e.clientX - startXRef.current);
            const clamped = Math.min(maxWidthPx, Math.max(minWidthPx, next));
            lastWidthRef.current = clamped;
            // Write through the DOM — no React state during the drag.
            providerNodeRef.current?.style.setProperty('--sidebar-width', `${clamped}px`);
        };
        const onUp = () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            setIsDragging(false);
            onCommit(lastWidthRef.current);
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
    };

    // `role="separator"` + `aria-orientation` is the right ARIA role for a
    // pane resize affordance. `tabIndex={-1}` because keyboard resize isn't
    // implemented; the user reaches the sidebar's actions via the visible
    // buttons.
    return (
        <div
            role="separator"
            aria-orientation="vertical"
            aria-label={resizeLabel[locale]}
            tabIndex={-1}
            onPointerDown={onPointerDown}
            className={
                'absolute inset-y-0 left-0 z-20 hidden w-2 cursor-ew-resize select-none after:absolute after:inset-y-0 after:left-1/2 after:w-px after:bg-transparent hover:after:bg-sidebar-border md:block ' +
                (isDragging ? 'after:bg-sidebar-border' : '')
            }
        />
    );
}
