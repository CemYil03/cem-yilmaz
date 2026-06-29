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
//   - `'workspace'` — opens the workspace personal-assistant sheet. Used on
//     workspace surfaces, where the visitor chat is irrelevant and the
//     header should lead to the admin chat instead. The provider for this
//     variant is mounted at `src/routes/{-$locale}/workspace.tsx`, so the
//     button is only valid inside that subtree.
//
// On every open → closed transition the relevant provider bumps a
// `highlightSignal` counter; we play a one-shot pulse animation here for
// ~1.4s so the user understands "your conversation went there, you can
// come back to it via this button." See `docs/styles/motion.md`.

const LABEL = {
    visitor: { de: 'Chats', en: 'Chats' },
    workspace: { de: 'Assistent', en: 'Assistant' },
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
    const { open, highlightSignal } = useWorkspaceAssistantChat();
    const label = LABEL.workspace[locale];
    return (
        <ChatButton onClick={open} label={label} icon={<SparklesIcon className="size-4" aria-hidden />} highlightSignal={highlightSignal} />
    );
}

function ChatButton({
    onClick,
    label,
    icon,
    highlightSignal,
}: {
    onClick: () => void;
    label: string;
    icon: React.ReactNode;
    highlightSignal: number;
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
                    className={cn(
                        'grid size-10 place-items-center rounded-full border border-foreground/10 text-foreground/80 transition hover:bg-foreground/5 active:bg-foreground/10 dark:border-white/10 dark:hover:bg-white/8 dark:active:bg-white/14 cursor-pointer',
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
