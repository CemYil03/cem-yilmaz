import { createRootRoute, HeadContent, Outlet, Scripts, useLocation } from '@tanstack/react-router';
import { useEffect } from 'react';
import { Provider as GraphQLClientProvider } from 'urql';
import appCss from '../styles.css?url';
import { VisitorChatProvider } from '../web/chat/VisitorChatProvider';
import { WebsiteVisitorAssistantChatSheet } from '../web/chat/WebsiteVisitorAssistantChatSheet';
import { AmbientBackdrop } from '../web/components/AmbientBackdrop';
import { Toaster } from '../web/components/base/sonner';
import { TooltipProvider } from '../web/components/base/tooltip';
import { NavigationProgress } from '../web/components/NavigationProgress';
import { urqlClient } from '../web/graphql/client';
import { useLocale } from '../web/hooks/useLocale';
import { DEFAULT_SHARE_IMAGE, DEFAULT_SHARE_IMAGE_DIMENSIONS, SITE_NAME } from '../web/seo/seoConstants';
import { webPageUrlGet } from '../web/seo/webPageUrlGet';
import { cn } from '../web/utils/cn';

const THEME_INIT_SCRIPT = `(function(){try{var stored=window.localStorage.getItem('theme');var mode=(stored==='light'||stored==='dark'||stored==='auto')?stored:'auto';var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;var resolved=mode==='auto'?(prefersDark?'dark':'light'):mode;var root=document.documentElement;root.classList.remove('light','dark');root.classList.add(resolved);if(mode==='auto'){root.removeAttribute('data-theme')}else{root.setAttribute('data-theme',mode)}root.style.colorScheme=resolved;var lightIcon=document.querySelector('link[rel="icon"][data-theme-icon="light"]');var darkIcon=document.querySelector('link[rel="icon"][data-theme-icon="dark"]');if(lightIcon&&darkIcon){if(mode==='auto'){lightIcon.media='(prefers-color-scheme: light)';darkIcon.media='(prefers-color-scheme: dark)';}else{lightIcon.media=resolved==='light'?'all':'not all';darkIcon.media=resolved==='dark'?'all':'not all';}}}catch(e){}})();`;

// Site-wide defaults. Every route's `head()` overrides title/description/OG
// per-page via `seoMeta()`; these only matter when a page omits `head()`
// entirely or when a crawler hits a redirect before the locale-aware route
// renders. Keep them generic and locale-neutral.
const FALLBACK_DESCRIPTION = 'Freelance full-stack & AI engineer — digitalisation, AI workflows, and web architecture.';

export const Route = createRootRoute({
    head: () => {
        const webPageUrl = webPageUrlGet();
        const shareImageAbsolute = `${webPageUrl}${DEFAULT_SHARE_IMAGE}`;
        return {
            meta: [
                { charSet: 'utf-8' },
                // `maximum-scale=1` prevents iOS Safari's auto-zoom on input
                // focus — the page no longer zooms in (and leaves the user
                // horizontally scrolled afterwards) when the chat composer is
                // tapped. We deliberately omit `user-scalable=no` so pinch-
                // zoom stays available for accessibility: iOS Safari overrides
                // `maximum-scale` for genuine user gestures, and Chrome
                // (since v88) does the same.
                { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1' },
                { name: 'theme-color', content: '#0f172a' },
                // Fallback social-share metadata. Per-page `seoMeta()` calls
                // override these for indexable pages; this block exists so
                // crawlers that hit a redirect or a route without its own
                // `head()` still see a complete card.
                { name: 'description', content: FALLBACK_DESCRIPTION },
                { property: 'og:site_name', content: SITE_NAME },
                { property: 'og:type', content: 'website' },
                { property: 'og:title', content: SITE_NAME },
                { property: 'og:description', content: FALLBACK_DESCRIPTION },
                { property: 'og:image', content: shareImageAbsolute },
                { property: 'og:image:width', content: String(DEFAULT_SHARE_IMAGE_DIMENSIONS.width) },
                { property: 'og:image:height', content: String(DEFAULT_SHARE_IMAGE_DIMENSIONS.height) },
                { name: 'twitter:card', content: 'summary_large_image' },
                { name: 'twitter:title', content: SITE_NAME },
                { name: 'twitter:description', content: FALLBACK_DESCRIPTION },
                { name: 'twitter:image', content: shareImageAbsolute },
                // iOS home-screen / web-app cosmetics. Doesn't affect SEO, but
                // pairs with `manifest.json` for a cohesive PWA install. The
                // standard `mobile-web-app-capable` is the modern equivalent;
                // the `apple-` variant stays for older iOS Safari.
                { name: 'mobile-web-app-capable', content: 'yes' },
                { name: 'apple-mobile-web-app-capable', content: 'yes' },
                { name: 'apple-mobile-web-app-title', content: SITE_NAME },
                { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
            ],
            links: [
                { rel: 'stylesheet', href: appCss },
                // PWA manifest — declares short_name, theme_color, start_url
                // for the install prompt. The file lives at `public/manifest.json`.
                { rel: 'manifest', href: '/manifest.json' },
                // Favicon swap: the browser picks one of these two by media query
                // when theme mode is `auto`. When the user manually toggles light
                // or dark, THEME_INIT_SCRIPT and ThemeSelector rewrite both `media`
                // attributes so the active icon follows the chosen mode rather
                // than the OS preference. The `data-theme-icon` hooks identify
                // them for that script. See docs/styles/theme.md.
                {
                    rel: 'icon',
                    href: '/favicon.ico',
                    type: 'image/x-icon',
                    media: '(prefers-color-scheme: light)',
                    'data-theme-icon': 'light',
                },
                {
                    rel: 'icon',
                    href: '/favicon-dark.ico',
                    type: 'image/x-icon',
                    media: '(prefers-color-scheme: dark)',
                    'data-theme-icon': 'dark',
                },
                // Universal fallback for older crawlers / clients that ignore
                // the media-query variants above. Picked up by anything that
                // walks `<link rel="icon">` without honouring `media`.
                { rel: 'shortcut icon', href: '/favicon.ico', type: 'image/x-icon' },
            ],
        };
    },
    component: RootComponent,
    notFoundComponent: NotFound,
    shellComponent: RootDocument,
});

function RootComponent() {
    return <Outlet />;
}

function NotFound() {
    const location = useLocation();

    useEffect(() => {
        console.warn(`[404] Not found: ${location.pathname}`);
    }, [location.pathname]);

    return (
        <div className="flex min-h-screen items-center justify-center">
            <div className="text-center">
                <h1 className="text-4xl font-bold">404</h1>
                <p className="text-muted-foreground mt-2">Page not found</p>
            </div>
        </div>
    );
}

function RootDocument({ children }: { children: React.ReactNode }) {
    const locale = useLocale();
    // `/server/*` routes are headless Chromium capture targets (PDF /
    // screenshot) — see docs/architecture/browser-capture.md. They must not
    // inherit site chrome: fixed AmbientBackdrop reprints on every PDF page
    // (top-left brand bleed), and body `bg-background` shows as gray in page
    // margins / trailing empty space on the last page.
    const isBrowserCaptureRoute = useLocation({ select: (location) => location.pathname.startsWith('/server/') });

    return (
        <html lang={locale} suppressHydrationWarning>
            <head>
                <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
                <HeadContent />
            </head>
            {/* selection:bg-[rgba(79,184,178,0.24)] */}
            <body
                className={cn(
                    // `overflow-x-clip` (not `hidden`): `hidden` forces
                    // `overflow-y: auto` and turns `<body>` into a scroll
                    // container, so the scrollbar appears/disappears with
                    // content height and shoves the layout sideways. `clip`
                    // still kills horizontal bleed without creating a
                    // scrollport. Pair with `html { scrollbar-gutter: stable }`
                    // in styles.css — see docs/styles/theme.md.
                    'font-sans antialiased wrap-anywhere overflow-x-clip',
                    // `!` so this beats the global `body { @apply bg-background }`
                    // rule — capture pages need a true white canvas.
                    isBrowserCaptureRoute && 'bg-white!',
                )}
            >
                {!isBrowserCaptureRoute && <AmbientBackdrop />}
                {!isBrowserCaptureRoute && <NavigationProgress />}
                <TooltipProvider>
                    <GraphQLClientProvider value={urqlClient}>
                        <VisitorChatProvider>
                            {children}
                            {/* Visitor chat sheet mounts once at root so the
                             *  header button (and any other surface) can open
                             *  it from any public route. Renders nothing
                             *  until `useVisitorChat()` flips `isOpen`. */}
                            {!isBrowserCaptureRoute && <WebsiteVisitorAssistantChatSheet locale={locale} />}
                        </VisitorChatProvider>
                    </GraphQLClientProvider>
                </TooltipProvider>
                {!isBrowserCaptureRoute && <Toaster position="bottom-center" richColors />}
                <Scripts />
            </body>
        </html>
    );
}
