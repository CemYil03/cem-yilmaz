import { PanelRightCloseIcon, SparklesIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, useSidebar } from '../components/base/sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from '../components/base/tooltip';
import type { Locale } from '../utils/locale';
import type { TranscriptMessage } from './chatTranscript';
import { mergeTranscriptMessages } from './chatTranscript';
import {
    WorkspaceAssistantChatBrowser,
    WorkspaceAssistantChatComposer,
    WorkspaceAssistantChatLoadedHeaderActions,
    WorkspaceAssistantChatTranscript,
} from './WorkspaceAssistantChatBody';
import { useWorkspaceAssistantChat } from './WorkspaceAssistantChatProvider';
import { WorkspaceFileEditor } from './WorkspaceFileEditor';

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
// State (chatId, live updates, sticky model) all lives on
// `WorkspaceAssistantChatProvider`. This file is purely the frame; the
// browser / transcript / composer components live in
// `WorkspaceAssistantChatBody.tsx`.
//
// The sidebar's two states — chat browser vs. loaded transcript — are
// switched on `chatId + live` rather than a local flag so every entry
// point (browser row, hub-composer first-send, deep-link `resetChat`)
// funnels through the provider and stays consistent.
//
// See `docs/features/chat-workspace.md`.

interface WorkspaceAssistantChatSidebarProps {
    locale: Locale;
    minWidthPx: number;
    maxWidthPx: number;
    /** Minimum width left for `<SidebarInset>` when dragging. The resize
     *  handle clamps against `window.innerWidth - minInsetPx` so a wide
     *  drag cannot push the floating header / progressive blur under the
     *  docked panel. */
    minInsetPx: number;
    /** Called once per drag, on pointer-up, with the final pixel width.
     *  The layout persists it to `localStorage` and updates its React
     *  state so SSR + the cookie-backed `defaultOpen` stay in sync. */
    onWidthCommit: (px: number) => void;
}

export function WorkspaceAssistantChatSidebar({
    locale,
    minWidthPx,
    maxWidthPx,
    minInsetPx,
    onWidthCommit,
}: WorkspaceAssistantChatSidebarProps) {
    const { chatId, loadedMessages, live, openFileId, closeFile } = useWorkspaceAssistantChat();
    const { toggleSidebar, isMobile, setOpen, setOpenMobile } = useSidebar();

    // `hasActiveChat` — the sidebar shows a transcript for any chat that
    // has been picked, is streaming, or has any live-appended messages.
    // Absent all of those, the browser takes over. Checking `chatId`
    // alone would flash the browser between a fresh send and the server
    // returning a chatId; `live.isGenerating` covers that gap.
    const allMessages = mergeTranscriptMessages(loadedMessages, live.appendedMessagesFor(chatId) as ReadonlyArray<TranscriptMessage>);
    const hasActiveChat = !!chatId || live.isGenerating(chatId) || allMessages.length > 0;

    // Opening a file from a transcript attachment sets `openFileId` on the
    // provider. If the sidebar is collapsed (or its mobile sheet is shut),
    // expand it so the file actually shows — the attachment click might have
    // come from the full-page chat route, where the sidebar starts closed.
    const showingFile = openFileId !== null;
    useEffect(() => {
        if (!showingFile) return;
        if (isMobile) setOpenMobile(true);
        else setOpen(true);
    }, [showingFile, isMobile, setOpen, setOpenMobile]);

    return (
        <Sidebar
            side="right"
            collapsible="offcanvas"
            variant="sidebar"
            // On `<md` viewports shadcn renders this as a right-side Sheet
            // whose default width is `w-3/4 sm:max-w-sm` — too narrow for a
            // chat surface on a phone. Push it to full viewport width so the
            // transcript, composer, and attachments all get the real estate
            // they need. `!` beats the SheetContent's own classes; classes
            // are gated to `max-md:` so the desktop docked column (which
            // ignores className overrides here anyway) is unaffected.
            className="max-md:w-screen! max-md:max-w-none!"
        >
            {/* Left-edge resize handle. Hidden on mobile (the Sheet is full
             *  width on phones anyway). */}
            {!isMobile ? (
                <ResizeHandle
                    minWidthPx={minWidthPx}
                    maxWidthPx={maxWidthPx}
                    minInsetPx={minInsetPx}
                    onCommit={onWidthCommit}
                    locale={locale}
                />
            ) : null}

            <SidebarHeader className="gap-0 border-b border-sidebar-border p-0">
                <div className="flex items-start justify-between gap-2 px-4 py-3.5">
                    <div className="flex min-w-0 flex-col gap-1">
                        <div className="flex items-center gap-2 text-primary">
                            <SparklesIcon className="size-4" />
                            <span className="text-sm font-semibold text-sidebar-foreground">
                                {{ de: 'Persönlicher Assistent', en: 'Personal assistant' }[locale]}
                            </span>
                        </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                        {hasActiveChat && !showingFile ? <WorkspaceAssistantChatLoadedHeaderActions locale={locale} /> : null}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    type="button"
                                    onClick={toggleSidebar}
                                    aria-label={{ de: 'Assistent ausblenden', en: 'Hide assistant' }[locale]}
                                    className="grid size-7 cursor-pointer place-items-center rounded-md text-sidebar-foreground/70 transition-opacity hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus:outline-hidden focus:ring-2 focus:ring-sidebar-ring focus:ring-offset-2 focus:ring-offset-sidebar"
                                >
                                    <PanelRightCloseIcon className="size-4" />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent>{{ de: 'Assistent ausblenden', en: 'Hide assistant' }[locale]}</TooltipContent>
                        </Tooltip>
                    </div>
                </div>
            </SidebarHeader>

            <SidebarContent className="min-h-0 flex-1 overflow-hidden p-0">
                {showingFile ? (
                    // File-display state: the editor fills the content area
                    // (it brings its own header + padding). Takes precedence
                    // over the transcript / browser; the composer footer is
                    // hidden below since a file view isn't a chat turn.
                    <WorkspaceFileEditor workspaceFileId={openFileId} onClose={closeFile} locale={locale} className="min-h-0 flex-1" />
                ) : (
                    <div className="flex min-h-0 flex-1 ps-2 flex-col gap-1 pt-2 pb-0">
                        {hasActiveChat ? (
                            <WorkspaceAssistantChatTranscript
                                messages={allMessages}
                                streamingTexts={live.streamingTextsFor(chatId)}
                                locale={locale}
                            />
                        ) : (
                            <WorkspaceAssistantChatBrowser locale={locale} />
                        )}
                    </div>
                )}
            </SidebarContent>
            {showingFile ? null : (
                <SidebarFooter className="border-t border-sidebar-border p-3">
                    <WorkspaceAssistantChatComposer locale={locale} />
                </SidebarFooter>
            )}
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
    minInsetPx,
    onCommit,
    locale,
}: {
    minWidthPx: number;
    maxWidthPx: number;
    minInsetPx: number;
    onCommit: (px: number) => void;
    locale: Locale;
}) {
    const startWidthRef = useRef(0);
    const startXRef = useRef(0);
    const providerNodeRef = useRef<HTMLElement | null>(null);
    const lastWidthRef = useRef(minWidthPx);
    const [isDragging, setIsDragging] = useState(false);

    const clampDragWidth = (px: number) => {
        const viewportCap = Math.max(minWidthPx, window.innerWidth - minInsetPx);
        return Math.min(maxWidthPx, viewportCap, Math.max(minWidthPx, px));
    };

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
        // Mark the wrapper as actively resizing so the sidebar primitive
        // suppresses its `transition-[width]` / `transition-[left,right,width]`
        // animations for the duration of the drag — otherwise every
        // pointermove kicks off a fresh 200ms ease and the edge trails the
        // pointer instead of tracking it.
        wrapper.dataset.resizing = 'true';
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
            const clamped = clampDragWidth(next);
            lastWidthRef.current = clamped;
            // Write through the DOM — no React state during the drag.
            providerNodeRef.current?.style.setProperty('--sidebar-width', `${clamped}px`);
        };
        const onUp = () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            // Re-enable the sidebar primitive's open/close transitions now
            // that the drag has ended.
            if (providerNodeRef.current) delete providerNodeRef.current.dataset.resizing;
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
            aria-label={{ de: 'Breite anpassen', en: 'Resize' }[locale]}
            tabIndex={-1}
            onPointerDown={onPointerDown}
            className={
                'absolute inset-y-0 left-0 z-20 hidden w-2 cursor-ew-resize select-none after:absolute after:inset-y-0 after:left-1/2 after:w-px after:bg-transparent hover:after:bg-sidebar-border md:block ' +
                (isDragging ? 'after:bg-sidebar-border' : '')
            }
        />
    );
}
