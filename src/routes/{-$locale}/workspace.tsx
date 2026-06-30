import { Outlet, createFileRoute } from '@tanstack/react-router';
import { WorkspaceAssistantChatProvider } from '../../web/chat/WorkspaceAssistantChatProvider';
import { WorkspaceAssistantChatSheet } from '../../web/chat/WorkspaceAssistantChatSheet';
import { WorkspaceHeader } from '../../web/components/WorkspaceHeader';
import { WorkspaceChatConfigDocument } from '../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../web/graphql/routeLoaderGraphqlClient';
import { useLocale } from '../../web/hooks/useLocale';

// Workspace layout — wraps every `/workspace/*` page with the personal-
// assistant chat provider, so the conversation survives navigation
// between focus areas, and mounts the sheet once.
//
// Also mounts the shared `<WorkspaceHeader />` above the outlet — every
// workspace surface gets the same chrome (logo + breadcrumb trail +
// assistant button) without each page rendering its own `<Header />` or
// `← Workspace` back-link. The header's assistant button is the single
// entry point into the sheet on every workspace page; see
// `src/web/components/WorkspaceHeader.tsx` and `HeaderChatButton`.
//
// The layout loader fetches `WorkspaceChatConfig` once for every
// workspace surface — the model catalog + saved default ride along on
// the provider so every admin composer (hub, sheet, `/workspace/assistant`)
// reads from a single shared source instead of refetching per route. See
// `docs/features/admin-chat-config.md`.
//
// See `docs/features/chat-workspace.md`.

export const Route = createFileRoute('/{-$locale}/workspace')({
    loader: async () => {
        const chatConfig = await routeLoaderGraphqlClient(WorkspaceChatConfigDocument)();
        return { chatConfig: chatConfig.admin.chatConfig };
    },
    component: WorkspaceLayout,
});

function WorkspaceLayout() {
    const locale = useLocale();
    const { chatConfig } = Route.useLoaderData();
    return (
        <WorkspaceAssistantChatProvider chatConfig={chatConfig}>
            <div className="flex min-h-screen flex-col">
                <WorkspaceHeader />
                <Outlet />
            </div>
            <WorkspaceAssistantChatSheet locale={locale} />
        </WorkspaceAssistantChatProvider>
    );
}
