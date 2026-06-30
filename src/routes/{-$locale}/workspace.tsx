import { Outlet, createFileRoute } from '@tanstack/react-router';
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
// The header's assistant button (`HeaderChatButton`, variant `workspace`)
// calls `useSidebar().toggleSidebar()` to toggle the sidebar / open the
// mobile Sheet from any workspace page. The workspace hub's hero composer
// opens the sidebar on first send so the streaming response surfaces in
// context.
//
// The chat layer state (chatId, live updates, sticky model selection,
// recent chats) lives on `WorkspaceAssistantChatProvider` — one level
// above the `<Outlet />`, so navigating between focus areas does not lose
// the conversation. The `useChatLiveUpdates` listener is mounted there
// too, so collapsing the sidebar mid-stream doesn't drop the SSE
// subscription.
//
// See `docs/features/chat-workspace.md`.

export const Route = createFileRoute('/{-$locale}/workspace')({
    loader: async () => {
        const chatConfig = await routeLoaderGraphqlClient(WorkspaceChatConfigDocument)();
        return { chatConfig: chatConfig.currentSession.user?.admin?.chatConfig ?? null };
    },
    component: WorkspaceLayout,
});

function WorkspaceLayout() {
    const locale = useLocale();
    const { chatConfig } = Route.useLoaderData();
    if (!chatConfig) {
        // Non-admin / signed-out visitors hit /workspace — render an inline
        // "no access" state inside the layout so the child pages don't all
        // need to repeat the check (and so the workspace header doesn't try
        // to mount a chat provider it has no config for).
        return <WorkspaceUnauthorized locale={locale} />;
    }
    return (
        <WorkspaceAssistantChatProvider chatConfig={chatConfig}>
            {/* `defaultOpen` is the SSR-time fallback; the cookie set by the
             *  shadcn primitive overrides it after the first toggle, so the
             *  user's last choice is what hydrates on subsequent loads. */}
            <SidebarProvider defaultOpen className="min-h-screen">
                <SidebarInset className="flex min-h-screen flex-col">
                    <WorkspaceHeader />
                    <Outlet />
                </SidebarInset>
                <WorkspaceAssistantChatSidebar locale={locale} />
            </SidebarProvider>
        </WorkspaceAssistantChatProvider>
    );
}
