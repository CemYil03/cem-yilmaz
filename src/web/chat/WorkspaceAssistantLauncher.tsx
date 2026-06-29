import { useLocation } from '@tanstack/react-router';
import { SparklesIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '../components/base/tooltip';
import { cn } from '../utils/cn';
import type { Locale } from '../utils/locale';
import { useWorkspaceAssistantChat } from './WorkspaceAssistantChatProvider';

// Floating launcher for the workspace personal-assistant sheet. A small
// FAB-style circle anchored bottom-right of the viewport — sits above
// page content on every workspace surface so the assistant is one click
// away while the user is doing other work (editing the CV, reading a
// focus area page, reviewing visitor chats).
//
// Two surfaces explicitly hide the launcher:
//
//   - `/workspace` (the hub) — the hub puts the assistant composer right
//     under the hero quote. A second launcher would compete with it.
//   - `/workspace/assistant` (the dedicated route) — the page IS the
//     chat. A launcher pointing at the sheet for the same conversation
//     would be confusing.
//
// The active dot pulses while a turn is in flight so the user can tell
// the assistant is still working even when the sheet is closed.
//
// On every open → closed transition the provider bumps a
// `highlightSignal` counter; we play a one-shot box-shadow pulse here
// for ~1.4s so the user knows the conversation went here, not into
// the void. See `docs/styles/motion.md`.

const COPY = {
    label: { de: 'Assistent öffnen', en: 'Open assistant' },
};

// Match the CSS animation total duration in `styles.css`
// (.animate-chat-button-pulse runs `chat-button-pulse 1.2s ease-out 1`).
// Slightly longer here so the class strips after the final frame paints.
const PULSE_DURATION_MS = 1300;

// Strip a leading `/en` locale segment so the hide list matches both
// `/workspace` and `/en/workspace`.
function normalizePath(pathname: string): string {
    let p = pathname.replace(/^\/(en)(?=\/|$)/, '');
    if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
    return p === '' ? '/' : p;
}

const HIDDEN_ON = new Set(['/workspace', '/workspace/assistant']);

export function WorkspaceAssistantLauncher({ locale }: { locale: Locale }) {
    const { open, live, isOpen, highlightSignal } = useWorkspaceAssistantChat();
    const { pathname } = useLocation();
    const [isPulsing, setIsPulsing] = useState(false);

    useEffect(() => {
        if (highlightSignal === 0) return;
        setIsPulsing(true);
        const handle = window.setTimeout(() => setIsPulsing(false), PULSE_DURATION_MS);
        return () => window.clearTimeout(handle);
    }, [highlightSignal]);

    const normalized = normalizePath(pathname);
    if (HIDDEN_ON.has(normalized)) return null;
    // No second launcher while the sheet is already open — the X on the
    // sheet itself is the close affordance.
    if (isOpen) return null;
    const label = COPY.label[locale];

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    type="button"
                    onClick={open}
                    aria-label={label}
                    className={cn(
                        'fixed bottom-6 right-6 z-40 grid size-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg ring-1 ring-black/5 transition hover:scale-105 hover:shadow-xl active:scale-95 focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 dark:ring-white/10',
                        isPulsing && 'animate-chat-button-pulse',
                    )}
                >
                    <SparklesIcon className="size-5" aria-hidden />
                    {live.isGenerating ? (
                        <span
                            className="absolute right-1 top-1 size-2.5 rounded-full bg-emerald-400 ring-2 ring-background animate-pulse-dot"
                            aria-hidden
                        />
                    ) : null}
                </button>
            </TooltipTrigger>
            <TooltipContent side="left">{label}</TooltipContent>
        </Tooltip>
    );
}
