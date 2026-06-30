import { Outlet, createFileRoute } from '@tanstack/react-router';
import { WorkspaceAssistantChatProvider } from '../../web/chat/WorkspaceAssistantChatProvider';
import { WorkspaceAssistantChatSheet } from '../../web/chat/WorkspaceAssistantChatSheet';
import { WorkspaceAssistantChatSidebar } from '../../web/chat/WorkspaceAssistantChatSidebar';
import { WorkspaceHeader } from '../../web/components/WorkspaceHeader';
import { WorkspaceUnauthorized } from '../../web/components/WorkspaceUnauthorized';
import { WorkspaceChatConfigDocument } from '../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../web/graphql/routeLoaderGraphqlClient';
import { useLocale } from '../../web/hooks/useLocale';

// Workspace layout — wraps every `/workspace/*` page with the personal-
// assistant chat provider, so the conversation survives navigation
// between focus areas.
//
// Two responsive surfaces for the assistant chat:
//
//  - `lg+`: a persistent right-side **sidebar** (`WorkspaceAssistantChatSidebar`)
//    lives alongside the workspace surface and can be collapsed to a narrow
//    icon rail. The chat is in flow, not on top of the page — Cem can ask a
//    question and keep editing/reading without dismissing anything.
//  - `<lg`: the original right-side **Sheet** (`WorkspaceAssistantChatSheet`).
//    Mounted under a `lg:hidden` wrapper so it's gone from the DOM on
//    desktop and Radix doesn't keep an unused dialog primitive alive.
//
// The shared `<WorkspaceHeader />` mounts once at the top — every workspace
// surface gets the same chrome (logo + breadcrumb trail + assistant
// button) without each page rendering its own `<Header />` or
// `← Workspace` back-link. On `lg+` the header's assistant button toggles
// the sidebar's rail/expanded state; below `lg` it opens the Sheet. See
// `HeaderChatButton`.
//
// The layout loader fetches `WorkspaceChatConfig` once for every
// workspace surface — the model catalog + saved default ride along on
// the provider so every admin composer (hub, sheet, sidebar,
// `/workspace/assistant`) reads from a single shared source instead of
// refetching per route. See `docs/features/admin-chat-config.md`.
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
            <div className="flex min-h-screen flex-col">
                <WorkspaceHeader />
                {/* Row layout: outlet column on the left, persistent sidebar
                 *  on the right (lg+ only). `min-w-0` on the outlet column
                 *  is the standard fix for flex children whose intrinsic
                 *  content (long URLs, wide tables) would otherwise force
                 *  the row wider than the viewport. */}
                <div className="flex flex-1 min-h-0">
                    <div className="flex min-w-0 flex-1 flex-col">
                        <Outlet />
                    </div>
                    <div className="hidden lg:flex">
                        <WorkspaceAssistantChatSidebar locale={locale} />
                    </div>
                </div>
            </div>
            {/* Sheet is the narrow-viewport assistant surface. Gone from
             *  the DOM on `lg+` so it never doubles up with the sidebar. */}
            <div className="lg:hidden">
                <WorkspaceAssistantChatSheet locale={locale} />
            </div>
        </WorkspaceAssistantChatProvider>
    );
}
