import { MessageCircleIcon, SparklesIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useVisitorChat } from '../chat/VisitorChatProvider';
import { useSidebar } from './base/sidebar';
import { useLocale } from '../hooks/useLocale';
import { cn } from '../utils/cn';
import { HeaderIconButton } from './HeaderIconButton';

// Header entry point into a chat surface. Sized to match `LanguageSelector` /
// `ThemeSelector` so the right-side cluster stays visually balanced.
//
// Two variants, picked by the `variant` prop:
//
//   - `'visitor'` (default) — opens the public visitor sheet in its empty
//     state (previous-chats list + composer). Used on every public surface.
//     The landing-page hero composer uses a different entry point
//     (`openWithMessage`) that fires a seeded question on open.
//   - `'workspace'` — toggles the persistent workspace assistant sidebar
//     built on shadcn's `<Sidebar>` primitive. The button dispatches to
//     `useSidebar().toggleSidebar()`, which collapses/expands the sidebar
//     on desktop and opens/closes the mobile Sheet that shadcn's
//     `<Sidebar>` switches to under `md`. The button reflects the current
//     state through `aria-pressed`. The provider it depends on
//     (`SidebarProvider`) is mounted at `src/routes/{-$locale}/workspace.tsx`,
//     so this variant is only valid inside that subtree.
//
// On every open → closed transition the visitor provider bumps a
// `highlightSignal` counter; we play a one-shot pulse animation here for
// ~1.4s so the user understands "your conversation went there, you can
// come back to it via this button." See `docs/styles/motion.md`. The
// workspace variant has no equivalent — the sidebar's collapsed rail is
// already the "your conversation lives here" affordance.

const LABEL = {
    visitor: { de: 'Chats', en: 'Chats' },
    workspaceExpand: { de: 'Assistent ausklappen', en: 'Expand assistant' },
    workspaceCollapse: { de: 'Assistent einklappen', en: 'Collapse assistant' },
};

// Match the CSS animation duration in `styles.css` (.animate-chat-button-pulse
// runs `chat-button-pulse 1.2s ease-out 1`). Slightly longer here so the
// class strips after the final frame paints.
const PULSE_DURATION_MS = 1300;

type Props = {
    /** Which chat surface this button toggles. Defaults to `'visitor'`.
     *  `'workspace'` is only valid inside the workspace layout subtree —
     *  the `SidebarProvider` it depends on is mounted there. */
    variant?: 'visitor' | 'workspace';
};

export function HeaderChatButton({ variant = 'visitor' }: Props) {
    if (variant === 'workspace') return <WorkspaceVariant />;
    return <VisitorVariant />;
}

function VisitorVariant() {
    const locale = useLocale();
    const { openEmpty, highlightSignal } = useVisitorChat();
    const label = LABEL.visitor[locale];
    return (
        <ChatButton
            onClick={openEmpty}
            label={label}
            icon={<MessageCircleIcon className="size-4" aria-hidden />}
            highlightSignal={highlightSignal}
        />
    );
}

function WorkspaceVariant() {
    const locale = useLocale();
    const { open, openMobile, isMobile, toggleSidebar } = useSidebar();
    // On desktop `open` is the cookie-backed sidebar state; on mobile
    // `openMobile` is the shadcn-internal Sheet state. The pressed affordance
    // tracks whichever applies to the current viewport.
    const isVisible = isMobile ? openMobile : open;
    const label = isVisible ? LABEL.workspaceCollapse[locale] : LABEL.workspaceExpand[locale];
    return (
        <ChatButton
            onClick={toggleSidebar}
            label={label}
            icon={<SparklesIcon className="size-4" aria-hidden />}
            highlightSignal={0}
            isPressed={isVisible}
        />
    );
}

function ChatButton({
    onClick,
    label,
    icon,
    highlightSignal,
    isPressed,
}: {
    onClick: () => void;
    label: string;
    icon: React.ReactNode;
    highlightSignal: number;
    /** Optional pressed/active state — used by the workspace variant to
     *  surface "the sidebar is open" as a visual affordance. */
    isPressed?: boolean;
}) {
    const [isPulsing, setIsPulsing] = useState(false);

    useEffect(() => {
        if (highlightSignal === 0) return;
        setIsPulsing(true);
        const handle = window.setTimeout(() => setIsPulsing(false), PULSE_DURATION_MS);
        return () => window.clearTimeout(handle);
    }, [highlightSignal]);

    return (
        <HeaderIconButton onClick={onClick} label={label} isPressed={isPressed} className={cn(isPulsing && 'animate-chat-button-pulse')}>
            {icon}
        </HeaderIconButton>
    );
}
