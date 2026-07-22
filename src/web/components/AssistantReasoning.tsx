import { ChevronDownIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocale } from '../hooks/useLocale';
import { cn } from '../utils/cn';
import { AssistantMarkdown } from './AssistantMarkdown';

// Collapsed Gemini thought-summary region shown above an assistant answer.
// Fed live by `ChatUpdateAssistantReasoningChunk` (Pro + `includeThoughts`)
// and durably by `ChatMessageAssistantText.reasoning` after the turn commits.
// Flash never emits these. While `live`, the disclosure stays open so the
// growing summary is readable; once the turn settles it starts collapsed with
// a chevron to expand.
//
// User toggles animate height (`grid-template-rows` 0fr→1fr) + opacity +
// chevron rotate (200 ms ease-out). Live-driven open/close is instant so
// stick-to-bottom scroll is not fought. See docs/styles/chat.md.

export function AssistantReasoning({ text, live = false, className }: { text: string; live?: boolean; className?: string }) {
    const locale = useLocale();
    // Settled turns start collapsed; live turns stay forced open.
    const [open, setOpen] = useState(live);
    // Transitions only for user clicks — programmatic `live` sync stays instant.
    const [animate, setAnimate] = useState(false);

    useEffect(() => {
        setAnimate(false);
        setOpen(live);
    }, [live]);

    if (!text) return null;

    const label = live ? { de: 'Denke nach…', en: 'Thinking…' }[locale] : { de: 'Nachgedacht', en: 'Thought' }[locale];

    return (
        <div className={cn('min-w-0 text-sm text-muted-foreground', className)}>
            <button
                type="button"
                aria-expanded={open}
                disabled={live}
                onClick={() => {
                    if (live) return;
                    setAnimate(true);
                    setOpen((current) => !current);
                }}
                className={cn(
                    'flex max-w-full items-center gap-1 rounded py-0.5 text-left font-medium',
                    'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                    live ? 'cursor-default' : 'cursor-pointer hover:text-foreground active:text-foreground',
                    live && 'shimmer',
                )}
            >
                <span className="truncate">{label}</span>
                {live ? null : (
                    <ChevronDownIcon
                        aria-hidden
                        className={cn(
                            'size-3.5 shrink-0 opacity-70 transition-transform duration-200 ease-out motion-reduce:transition-none',
                            open && 'rotate-180',
                        )}
                    />
                )}
            </button>
            <div
                className={cn(
                    'grid',
                    open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
                    animate && 'transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none',
                )}
            >
                <div className="min-h-0 overflow-hidden" aria-hidden={!open} inert={!open}>
                    <div
                        className={cn(
                            'my-4',
                            animate && 'transition-opacity duration-200 ease-out motion-reduce:transition-none',
                            open ? 'opacity-90' : 'opacity-0',
                        )}
                    >
                        <AssistantMarkdown text={text} streaming={live} className="text-xs text-muted-foreground" />
                    </div>
                </div>
            </div>
        </div>
    );
}
