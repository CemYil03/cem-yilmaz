import * as React from 'react';
import { cn } from '../../utils/cn';
import {
    MessageScroller,
    MessageScrollerButton,
    MessageScrollerContent,
    MessageScrollerProvider,
    MessageScrollerViewport,
} from './message-scroller';

// Shared scaffolding every chat transcript in the app sits on top of. Pins the
// scroll config in exactly one place — `defaultScrollPosition="last-anchor"`,
// `scrollEdgeThreshold={64}`, the jump-to-latest pill at the tail — so a new
// surface can't drift by forgetting one. See docs/styles/chat.md.

export interface ChatTranscriptShellProps {
    /** Localised label for the SR-only text on the jump-to-latest pill.
     *  Required — every surface knows its own locale. */
    jumpToLatestLabel: string;
    /** Extra className on the outer `MessageScroller`. */
    className?: string;
    /** Extra className on the inner `MessageScrollerViewport`. */
    viewportClassName?: string;
    /** Transcript rows. Callers assemble their own date groups, streaming
     *  section, empty state, etc. — this component only owns the scroll
     *  container. */
    children: React.ReactNode;
}

export function ChatTranscriptShell({ jumpToLatestLabel, className, viewportClassName, children }: ChatTranscriptShellProps) {
    return (
        <MessageScrollerProvider
            // Follow the live edge as new messages / streamed chunks land, but
            // only while the reader is AT the edge — the primitive stops
            // following the moment they scroll up, select text, or open a link
            // (gated by `scrollEdgeThreshold`). Off by default in the
            // primitive, so it must be set explicitly or the transcript never
            // sticks to the bottom during streaming. See docs/styles/chat.md.
            autoScroll
            // `last-anchor` opens saved conversations at the last meaningful
            // turn (usually the last user message) — see docs/styles/chat.md
            // ("Opening a chat — anchor, don't dump").
            defaultScrollPosition="last-anchor"
            // 64 px absorbs Streamdown's sub-pixel content-height jitter
            // while streaming without dropping stick mode. Any smaller
            // chatters; larger and casual scroll-ups look like the reader
            // is still at the bottom.
            scrollEdgeThreshold={64}
        >
            <MessageScroller className={className}>
                {/*
                 * `scrollbar-gutter: stable` reserves the scrollbar column in
                 * its own lane so the vertical scrollbar never overlaps the
                 * rightmost user bubbles when it appears. `pr-2` gives the
                 * bubbles a couple of pixels of breathing room between content
                 * and the reserved gutter — without it a right-aligned bubble
                 * still visually touches the scrollbar track on WebKit. Baked
                 * in here so every surface (visitor sheet, workspace sidebar,
                 * deep-link route, compass interview) inherits the same
                 * treatment; a surface can only widen the gutter via
                 * `viewportClassName`, never turn it off. See
                 * docs/styles/chat.md ("Scrollbar gutter").
                 */}
                <MessageScrollerViewport className={cn('[scrollbar-gutter:stable] pr-2', viewportClassName)}>
                    <MessageScrollerContent>{children}</MessageScrollerContent>
                </MessageScrollerViewport>
                <MessageScrollerButton direction="end" variant="secondary" size="sm" className="gap-1.5 rounded-full px-3 text-xs">
                    {jumpToLatestLabel}
                </MessageScrollerButton>
            </MessageScroller>
        </MessageScrollerProvider>
    );
}

// Wraps the transcript's streaming section in an `aria-live="polite"` region
// so screen readers announce new tokens without interrupting the reader.
// `aria-atomic="false"` — announce only the newly-added content, not the whole
// buffer on every chunk. Callers render one of these around their in-flight
// streaming rows; empty children collapse the section (no live region on the
// wire while idle).
export function ChatStreamingRegion({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <section aria-live="polite" aria-atomic="false" className={className}>
            {children}
        </section>
    );
}
