import { Streamdown } from 'streamdown';
import { code } from '@streamdown/code';
import { cn } from '../utils/cn';

// Shared markdown renderer for assistant messages — used both for the
// streaming preview during a turn and for the persisted `ChatMessageAssistantText`
// row that swaps into its slot at end-of-stream. Centralizing the Streamdown
// config (plugins, table/code/mermaid controls) means the swap can never
// produce a visible reflow even when the assistant emitted a code or table
// block mid-stream. Static content (streaming=false) uses mode="static" so
// Streamdown updates synchronously — streaming mode wraps block updates in
// useTransition, which defers re-renders and causes stale content when the
// text prop changes (e.g. locale switch on the CV page).

export function AssistantMarkdown({ text, className, streaming = false }: { text: string; className?: string; streaming?: boolean }) {
    if (streaming && !text) {
        // Shimmer sweep across the label reads as "the assistant is actively
        // thinking" — a signal, not an idle placeholder. `shimmer` is a pure-CSS
        // utility from the shadcn package; the highlight derives from
        // `currentColor` so it adapts to light/dark without extra config.
        return <span className={cn('shimmer text-sm leading-relaxed text-muted-foreground', className)}>Thinking…</span>;
    }
    return (
        <Streamdown
            plugins={{ code }}
            mode={streaming ? 'streaming' : 'static'}
            controls={{
                table: { copy: false, download: false, fullscreen: false },
                code: { copy: true, download: false },
                mermaid: { download: false, copy: true, fullscreen: true, panZoom: true },
            }}
            parseIncompleteMarkdown={streaming}
            className={cn(
                'text-sm leading-relaxed wrap-break-word *:first:mt-0 *:last:mb-0',
                // Tailwind's preflight strips list markers and padding, so wrapped lines fall back under the bullet.
                // `list-outside` + left padding puts the marker in a gutter and aligns wrapped text under the first line.
                '[&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-6 [&_ol]:pl-6 [&_li]:pl-1 [&_li]:marker:text-foreground/60 [&_ul]:list-outside [&_ol]:list-outside',
                className,
            )}
        >
            {text}
        </Streamdown>
    );
}
