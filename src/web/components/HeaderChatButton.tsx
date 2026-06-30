import { MessageCircleIcon, SparklesIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useVisitorChat } from '../chat/VisitorChatProvider';
import { useWorkspaceAssistantChat } from '../chat/WorkspaceAssistantChatProvider';
import { useLocale } from '../hooks/useLocale';
import { cn } from '../utils/cn';
import { Tooltip, TooltipContent, TooltipTrigger } from './base/tooltip';

// Header entry point into a chat sheet. Sized to match `LanguageSelector` /
// `ThemeSelector` so the right-side cluster stays visually balanced.
//
// Two variants, picked by the `variant` prop:
//
//   - `'visitor'` (default) — opens the public visitor sheet in its empty
//     state (previous-chats list + composer). Used on every public surface.
//     The landing-page hero composer uses a different entry point
//     (`openWithMessage`) that fires a seeded question on open.
//   - `'workspace'` — toggles the workspace personal-assistant surface. On
//     `lg+` the assistant lives in the persistent sidebar
//     (`WorkspaceAssistantChatSidebar`), and the button toggles its
//     rail/expanded state; below `lg` the assistant is a Sheet and the
//     button opens it. The two cases are split via CSS responsive
//     visibility so no JS breakpoint hook is needed — two buttons render,
//     only the right one for the viewport is visible. The provider for
//     this variant is mounted at `src/routes/{-$locale}/workspace.tsx`, so
//     the button is only valid inside that subtree.
//
// On every open → closed transition the relevant provider bumps a
// `highlightSignal` counter; we play a one-shot pulse animation here for
// ~1.4s so the user understands "your conversation went there, you can
// come back to it via this button." See `docs/styles/motion.md`.

const LABEL = {
    visitor: { de: 'Chats', en: 'Chats' },
    workspace: { de: 'Assistent', en: 'Assistant' },
    workspaceExpand: { de: 'Assistent ausklappen', en: 'Expand assistant' },
    workspaceCollapse: { de: 'Assistent einklappen', en: 'Collapse assistant' },
};

// Match the CSS animation duration in `styles.css` (.animate-chat-button-pulse
// runs `chat-button-pulse 1.2s ease-out 1`). Slightly longer here so the
// class strips after the final frame paints.
const PULSE_DURATION_MS = 1300;

type Props = {
    /** Which chat sheet this button opens. Defaults to `'visitor'`.
     *  `'workspace'` is only valid inside the workspace layout subtree —
     *  the provider it depends on is mounted there. */
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
    const { open, isCollapsed, setCollapsed, highlightSignal } = useWorkspaceAssistantChat();
    // CSS-responsive split: the `lg+` button toggles the sidebar's
    // rail/expanded state; the `<lg` button opens the Sheet. Two buttons
    // render simultaneously but only one is visible per viewport, so no
    // breakpoint hook (and no SSR mismatch risk) is needed.
    const desktopLabel = isCollapsed ? LABEL.workspaceExpand[locale] : LABEL.workspaceCollapse[locale];
    const sheetLabel = LABEL.workspace[locale];
    return (
        <>
            <div className="hidden lg:contents">
                <ChatButton
                    onClick={() => setCollapsed(!isCollapsed)}
                    label={desktopLabel}
                    icon={<SparklesIcon className="size-4" aria-hidden />}
                    highlightSignal={highlightSignal}
                    isPressed={!isCollapsed}
                />
            </div>
            <div className="contents lg:hidden">
                <ChatButton
                    onClick={open}
                    label={sheetLabel}
                    icon={<SparklesIcon className="size-4" aria-hidden />}
                    highlightSignal={highlightSignal}
                />
            </div>
        </>
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
    /** Optional pressed/active state — used by the workspace `lg+` variant
     *  to surface "the sidebar is expanded" as a visual affordance. */
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
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    type="button"
                    onClick={onClick}
                    aria-label={label}
                    aria-pressed={isPressed}
                    className={cn(
                        'grid size-10 place-items-center rounded-full border border-foreground/10 text-foreground/80 transition hover:bg-foreground/5 active:bg-foreground/10 dark:border-white/10 dark:hover:bg-white/8 dark:active:bg-white/14 cursor-pointer',
                        isPressed && 'bg-foreground/5 dark:bg-white/8',
                        isPulsing && 'animate-chat-button-pulse',
                    )}
                >
                    {icon}
                </button>
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
        </Tooltip>
    );
}
