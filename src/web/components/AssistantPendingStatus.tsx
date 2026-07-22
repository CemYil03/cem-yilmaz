import { useLocale } from '../hooks/useLocale';
import { cn } from '../utils/cn';

// Shimmering "still working" label shown while an assistant turn is in flight
// but no answer text has started streaming yet. Driven by turn-level
// `isGenerating` in the transcript — independent of tool-call rows — so the
// wait before the first token (and after tools settle, before text) is never
// dead air. See docs/styles/chat.md ("Streaming — pending status").

export function AssistantPendingStatus({ className }: { className?: string }) {
    const locale = useLocale();
    return (
        <span className={cn('shimmer text-sm leading-relaxed text-muted-foreground', className)}>
            {{ de: 'Denke nach…', en: 'Thinking…' }[locale]}
        </span>
    );
}
