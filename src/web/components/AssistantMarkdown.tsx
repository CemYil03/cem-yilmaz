import { createContext, useContext } from 'react';
import { Streamdown } from 'streamdown';
import { code } from '@streamdown/code';
import { cn } from '../utils/cn';

// Whether markdown links to external sites go through Streamdown's built-in
// "you're about to visit an external website" confirmation modal. Defaults to
// `true` — safe for the public visitor chat, where the assistant links out to
// third-party pages and the visitor should get an interstitial. The workspace
// assistant links to the admin's own trusted surfaces (e.g.
// `/workspace/medical?tab=…`), so it wraps its transcript in the provider with
// `false`: the modal there both adds friction and renders clipped inside the
// transcript's scroll container (impossible to confirm). Read via context so
// the persisted (`ChatMessageAssistantText`) and streaming render paths both
// pick it up without threading a prop through every intermediate component.
const ExternalLinkConfirmationContext = createContext(true);

export function ExternalLinkConfirmationProvider({ enabled, children }: { enabled: boolean; children: React.ReactNode }) {
    return <ExternalLinkConfirmationContext.Provider value={enabled}>{children}</ExternalLinkConfirmationContext.Provider>;
}

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
    const externalLinkConfirmation = useContext(ExternalLinkConfirmationContext);
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
            linkSafety={{ enabled: externalLinkConfirmation }}
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
