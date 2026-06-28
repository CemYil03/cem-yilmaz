import { Outlet, createFileRoute } from '@tanstack/react-router';
import { WorkspaceAssistantChatProvider } from '../../web/chat/WorkspaceAssistantChatProvider';
import { WorkspaceAssistantChatSheet } from '../../web/chat/WorkspaceAssistantChatSheet';
import { WorkspaceAssistantLauncher } from '../../web/chat/WorkspaceAssistantLauncher';
import { useLocale } from '../../web/hooks/useLocale';

// Workspace layout — wraps every `/workspace/*` page with the personal-
// assistant chat provider, so the conversation survives navigation
// between focus areas, and mounts the sheet + floating launcher once.
//
// Pages render through `<Outlet />`. The launcher (a floating FAB-style
// button) appears on every workspace surface except the hub itself —
// the hub has a prominent in-flow composer at the top, so a floating
// launcher there would be redundant. The launcher decides whether to
// render based on the current pathname.
//
// See `docs/features/chat-workspace.md`.

export const Route = createFileRoute('/{-$locale}/workspace')({
    component: WorkspaceLayout,
});

function WorkspaceLayout() {
    const locale = useLocale();
    return (
        <WorkspaceAssistantChatProvider>
            <Outlet />
            <WorkspaceAssistantChatSheet locale={locale} />
            <WorkspaceAssistantLauncher locale={locale} />
        </WorkspaceAssistantChatProvider>
    );
}
