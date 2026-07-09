import { Outlet, createFileRoute } from '@tanstack/react-router';
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

// Width bounds. The default matches the prior Sheet (`sm:max-w-2xl` ≈ 42rem
// = 672px); the user can drag outward, never inward past the default.
const DEFAULT_WIDTH_PX = 400;
const MAX_WIDTH_PX = 1000;
const WIDTH_STORAGE_KEY = 'workspaceAssistantSidebar.widthPx';

function clampWidth(px: number): number {
    return Math.min(MAX_WIDTH_PX, Math.max(DEFAULT_WIDTH_PX, px));
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
                <SidebarInset className="flex min-h-screen flex-col bg-transparent">
                    <WorkspaceHeader />
                    <Outlet />
                </SidebarInset>
                <WorkspaceAssistantChatSidebar
                    locale={locale}
                    minWidthPx={DEFAULT_WIDTH_PX}
                    maxWidthPx={MAX_WIDTH_PX}
                    onWidthCommit={onWidthCommit}
                />
            </SidebarProvider>
        </WorkspaceAssistantChatProvider>
    );
}
