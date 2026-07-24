import { createFileRoute, Outlet } from '@tanstack/react-router';
import { useCallback, useEffect, useState } from 'react';
import { WorkspaceAssistantChatProvider } from '../../web/chat/WorkspaceAssistantChatProvider';
import { WorkspaceAssistantChatSidebar } from '../../web/chat/WorkspaceAssistantChatSidebar';
import { SidebarInset, SidebarProvider } from '../../web/components/base/sidebar';
import { WorkspaceHeader } from '../../web/components/WorkspaceHeader';
import { WorkspaceUnauthorized } from '../../web/components/WorkspaceUnauthorized';
import { WorkspaceChatConfigDocument } from '../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../web/graphql/routeLoaderGraphqlClient';
import { useLocale } from '../../web/hooks/useLocale';

// Workspace layout — wraps every `/workspace/*` page with the personal-
// assistant chat provider and a persistent right-side
// `<WorkspaceAssistantChatSidebar />`. The shadcn `<SidebarProvider>` owns
// the sidebar's open / collapsed / mobile-sheet state and persists the
// desktop state to a `sidebar_state` cookie, so the user's preference
// survives reloads. On `<md` viewports the same primitive renders the
// sidebar as a right-side Sheet — no custom Sheet mount is needed.
//
// The layout also owns the sidebar's **width** (`--sidebar-width` CSS
// variable on `<SidebarProvider>`): the resize handle inside the sidebar
// drags it bigger, but the variable that shadcn's `sidebar-gap` reads to
// reflow `<SidebarInset>` lives on the provider, so the layout is the
// right place to declare it. The width is hydrated from `localStorage` in
// an effect so SSR is deterministic.
//
// See `docs/features/chat-workspace.md`.

export const Route = createFileRoute('/{-$locale}/workspace')({
    loader: async () => {
        const chatConfig = await routeLoaderGraphqlClient(WorkspaceChatConfigDocument)();
        return { chatConfig: chatConfig.sessionFindOne.user?.admin?.adminChatConfigFindOne ?? null };
    },
    component: WorkspaceLayout,
});

// Width bounds. The default is a comfortable reading column; the user can
// drag outward up to MAX_WIDTH_PX, never inward past the default. A further
// viewport floor (`MIN_INSET_PX`) keeps the main column wide enough that the
// floating header + its progressive-blur strip stay inside `<SidebarInset>`
// instead of sliding under the docked sidebar.
const DEFAULT_WIDTH_PX = 400;
const MAX_WIDTH_PX = 1000;
const MIN_INSET_PX = 360;
const WIDTH_STORAGE_KEY = 'workspaceAssistantSidebar.widthPx';

function maxWidthForViewport(): number {
    if (typeof window === 'undefined') return MAX_WIDTH_PX;
    return Math.min(MAX_WIDTH_PX, Math.max(DEFAULT_WIDTH_PX, window.innerWidth - MIN_INSET_PX));
}

function clampWidth(px: number): number {
    return Math.min(maxWidthForViewport(), Math.max(DEFAULT_WIDTH_PX, px));
}

function WorkspaceLayout() {
    const locale = useLocale();
    const { chatConfig } = Route.useLoaderData();
    const [widthPx, setWidthPx] = useState<number>(DEFAULT_WIDTH_PX);
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const stored = window.localStorage.getItem(WIDTH_STORAGE_KEY);
        if (!stored) return;
        const parsed = Number(stored);
        if (Number.isFinite(parsed)) setWidthPx(clampWidth(parsed));
    }, []);
    // Re-clamp when the viewport shrinks so a previously saved wide width
    // cannot leave the inset narrower than MIN_INSET_PX (which is what lets
    // the header blur spill under the sidebar).
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const onResize = () => {
            setWidthPx((prev) => {
                const next = clampWidth(prev);
                if (next !== prev && typeof window !== 'undefined') {
                    window.localStorage.setItem(WIDTH_STORAGE_KEY, String(next));
                }
                return next;
            });
        };
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);
    const onWidthCommit = useCallback((next: number) => {
        const clamped = clampWidth(next);
        setWidthPx(clamped);
        if (typeof window !== 'undefined') {
            window.localStorage.setItem(WIDTH_STORAGE_KEY, String(clamped));
        }
    }, []);

    if (!chatConfig) {
        // Non-admin / signed-out visitors hit /workspace — render an inline
        // "no access" state inside the layout so the child pages don't all
        // need to repeat the check (and so the workspace header doesn't try
        // to mount a chat provider it has no config for).
        return <WorkspaceUnauthorized locale={locale} />;
    }
    return (
        <WorkspaceAssistantChatProvider chatConfig={chatConfig}>
            {/* `defaultOpen={false}` keeps the assistant sidebar closed on
             *  first visit — the workspace pages are the focus and the
             *  assistant is summoned via the header button. The cookie set by
             *  the shadcn primitive overrides it after the first toggle, so
             *  the user's last choice is what hydrates on subsequent loads.
             *
             *  `--sidebar-width` is set HERE (not on `<Sidebar>` deeper in
             *  the tree) because shadcn's `sidebar-gap` div — the spacer
             *  that reflows `<SidebarInset>` — reads its width off this
             *  ancestor's variable. Setting it lower in the tree only
             *  affects the visible sidebar column, not the inset, which
             *  would let the blur and the inset's right edge run under
             *  the sidebar. */}
            <SidebarProvider
                defaultOpen={false}
                className="min-h-screen"
                style={{ '--sidebar-width': `${widthPx}px` } as React.CSSProperties}
            >
                {/* The base `SidebarInset` primitive hard-codes `bg-background`,
                 *  which would sit on top of the root `<AmbientBackdrop />`
                 *  (mounted in `__root.tsx` at `-z-10`) and hide the brand-
                 *  colour orb on every workspace route. Override to transparent
                 *  so the backdrop shows through the workspace shell the same
                 *  way it does on public pages. */}
                {/* `overflow-x-clip` (not `hidden`) keeps sticky header /
                 *  progressive-blur working while clipping any horizontal
                 *  paint — including backdrop-filter blur — so it cannot
                 *  spill over the docked assistant sidebar. See Header.tsx
                 *  sticky note. */}
                <SidebarInset className="flex min-h-screen flex-col overflow-x-clip bg-transparent">
                    <WorkspaceHeader />
                    <Outlet />
                </SidebarInset>
                <WorkspaceAssistantChatSidebar
                    locale={locale}
                    minWidthPx={DEFAULT_WIDTH_PX}
                    maxWidthPx={MAX_WIDTH_PX}
                    minInsetPx={MIN_INSET_PX}
                    onWidthCommit={onWidthCommit}
                />
            </SidebarProvider>
        </WorkspaceAssistantChatProvider>
    );
}
