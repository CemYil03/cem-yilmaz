import { code } from '@streamdown/code';
import { useRouter } from '@tanstack/react-router';
import { createContext, useContext, useState } from 'react';
import type { Components } from 'streamdown';
import { Streamdown } from 'streamdown';
import { cn } from '../utils/cn';
import type { Locale } from '../utils/locale';
import { DEFAULT_LOCALE, LOCALES } from '../utils/locale';
import { AssistantPendingStatus } from './AssistantPendingStatus';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from './base/alert-dialog';

// Whether markdown links to *external* sites go through a "you're about to
// visit an external website" confirmation before opening. Defaults to `true` —
// safe for the public visitor chat, where the assistant may link out to
// third-party pages and the visitor should get an interstitial. The workspace
// assistant links to the admin's own trusted surfaces and wraps its transcript
// in the provider with `false`. Internal links (paths on this site) are never
// gated by this — they navigate in-app regardless (see `MarkdownAnchor`). Read
// via context so the persisted (`ChatMessageAssistantText`) and streaming
// render paths both pick it up without threading a prop through every
// intermediate component.
const ExternalLinkConfirmationContext = createContext(true);

export function ExternalLinkConfirmationProvider({ enabled, children }: { enabled: boolean; children: React.ReactNode }) {
    return <ExternalLinkConfirmationContext.Provider value={enabled}>{children}</ExternalLinkConfirmationContext.Provider>;
}

// A link is "internal" when it points at a path on this site — a single
// leading slash, not the `//host` protocol-relative form that resolves
// off-site. The assistant is prompted to emit relative paths like `/cv`; those
// should navigate in-app (SPA, same tab, no interstitial) rather than trigger a
// full document load or an external-site warning.
export function isInternalHref(href: string | undefined): href is string {
    return !!href && href.startsWith('/') && !href.startsWith('//');
}

// The site is bilingual behind a `{-$locale}` segment: German lives at `/cv`,
// English at `/en/cv`. The assistant emits locale-less paths (`/cv`), so when
// the visitor is on an English route we prefix `/en` — unless the model already
// included a locale segment. Derived from the router's current pathname rather
// than `useParams` so it stays provider-independent (Storybook / SSR).
export function localizeInternalHref(href: string, locale: Locale): string {
    if (locale === DEFAULT_LOCALE) return href;
    const firstSegment = href.split('/')[1];
    if (LOCALES.includes(firstSegment as Locale)) return href;
    return href === '/' ? `/${locale}` : `/${locale}${href}`;
}

export function localeFromPathname(pathname: string | undefined): Locale {
    const segment = pathname?.split('/')[1];
    return LOCALES.includes(segment as Locale) ? (segment as Locale) : DEFAULT_LOCALE;
}

// Custom anchor for assistant markdown. Replaces Streamdown's built-in link
// (which routes every href — relative ones included — through its own
// external-site modal and always opens a new tab). Three cases:
//
//   - incomplete (mid-stream `streamdown:incomplete-link` sentinel) → styled
//     but inert, so a half-streamed link isn't clickable.
//   - internal (`/…`) → in-app navigation, same tab, no confirmation, with the
//     path locale-prefixed to match the route the visitor is on.
//   - external → preserves the per-surface behaviour the confirmation context
//     encodes: visitor chat confirms first, workspace opens directly. Both open
//     in a new tab, as before.
function MarkdownAnchor({
    href,
    children,
    className,
    node: _node,
    // Streamdown's rehype pipeline injects `target="_blank"` / `rel` onto every
    // link. We drop them from the forwarded rest props and re-apply per branch
    // so internal (in-app) links don't inherit a new-tab target.
    target: _target,
    rel: _rel,
    ...rest
}: React.ComponentProps<'a'> & { node?: unknown }) {
    const externalLinkConfirmation = useContext(ExternalLinkConfirmationContext);
    // `warn: false` so this returns `undefined` (instead of console-warning)
    // when rendered outside a RouterProvider — e.g. Storybook — where we fall
    // back to a plain anchor. The hook's declared return type is non-nullable,
    // but it genuinely returns `undefined` with no provider, so we widen it to
    // keep the fallback guards honest.
    const router = useRouter({ warn: false }) as ReturnType<typeof useRouter> | undefined;
    const [confirmOpen, setConfirmOpen] = useState(false);

    const linkClassName = cn('wrap-anywhere font-medium text-primary underline', className);

    if (href === 'streamdown:incomplete-link' || !href) {
        return (
            <a className={linkClassName} data-streamdown="link" data-incomplete {...rest}>
                {children}
            </a>
        );
    }

    if (isInternalHref(href)) {
        const locale = localeFromPathname(router?.state.location.pathname);
        const target = localizeInternalHref(href, locale);
        return (
            <a
                className={linkClassName}
                data-streamdown="link"
                href={target}
                onClick={(event) => {
                    // Let the browser handle modified clicks (open in new tab /
                    // window) and non-primary buttons; only intercept a plain
                    // left-click for SPA navigation.
                    if (!router || event.defaultPrevented) return;
                    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
                    event.preventDefault();
                    void router.navigate({ href: target });
                }}
                {...rest}
            >
                {children}
            </a>
        );
    }

    if (!externalLinkConfirmation) {
        return (
            <a className={linkClassName} data-streamdown="link" href={href} rel="noreferrer" target="_blank" {...rest}>
                {children}
            </a>
        );
    }

    return (
        <>
            <button
                type="button"
                className={cn(linkClassName, 'appearance-none bg-transparent p-0 text-left')}
                data-streamdown="link"
                onClick={() => setConfirmOpen(true)}
            >
                {children}
            </button>
            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Externen Link öffnen? / Open external link?</AlertDialogTitle>
                        <AlertDialogDescription>
                            <span className="break-all font-mono text-xs">{href}</span>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Abbrechen / Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                window.open(href, '_blank', 'noreferrer');
                            }}
                        >
                            Öffnen / Open
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

const markdownComponents: Components = { a: MarkdownAnchor };

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
        // Belt-and-suspenders: an empty streaming buffer (rare — the client
        // usually mounts the pending row from `isGenerating` before any chunk)
        // still shows the same shimmer status as the transcript-level pending
        // row. See `AssistantPendingStatus` / docs/styles/chat.md.
        return <AssistantPendingStatus className={className} />;
    }
    return (
        <Streamdown
            plugins={{ code }}
            components={markdownComponents}
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
