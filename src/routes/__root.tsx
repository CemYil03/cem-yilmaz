import { HeadContent, Outlet, Scripts, createRootRoute, useLocation } from '@tanstack/react-router';
import { useEffect } from 'react';
import { Provider as GraphQLClientProvider } from 'urql';
import appCss from '../styles.css?url';
import { AmbientBackdrop } from '../web/components/AmbientBackdrop';
import { Toaster } from '../web/components/base/sonner';
import { TooltipProvider } from '../web/components/base/tooltip';
import { NavigationProgress } from '../web/components/NavigationProgress';
import { urqlClient } from '../web/graphql/client';
import { useLocale } from '../web/hooks/useLocale';

const THEME_INIT_SCRIPT = `(function(){try{var stored=window.localStorage.getItem('theme');var mode=(stored==='light'||stored==='dark'||stored==='auto')?stored:'auto';var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;var resolved=mode==='auto'?(prefersDark?'dark':'light'):mode;var root=document.documentElement;root.classList.remove('light','dark');root.classList.add(resolved);if(mode==='auto'){root.removeAttribute('data-theme')}else{root.setAttribute('data-theme',mode)}root.style.colorScheme=resolved;var lightIcon=document.querySelector('link[rel="icon"][data-theme-icon="light"]');var darkIcon=document.querySelector('link[rel="icon"][data-theme-icon="dark"]');if(lightIcon&&darkIcon){if(mode==='auto'){lightIcon.media='(prefers-color-scheme: light)';darkIcon.media='(prefers-color-scheme: dark)';}else{lightIcon.media=resolved==='light'?'all':'not all';darkIcon.media=resolved==='dark'?'all':'not all';}}}catch(e){}})();`;

export const Route = createRootRoute({
    head: () => ({
        meta: [
            {
                charSet: 'utf-8',
            },
            {
                name: 'viewport',
                content: 'width=device-width, initial-scale=1',
            },
        ],
        links: [
            {
                rel: 'stylesheet',
                href: appCss,
            },
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
        ],
    }),
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

    return (
        <html lang={locale} suppressHydrationWarning>
            <head>
                <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
                <HeadContent />
            </head>
            {/* selection:bg-[rgba(79,184,178,0.24)] */}
            <body className="font-sans antialiased wrap-anywhere">
                <AmbientBackdrop />
                <NavigationProgress />
                <TooltipProvider>
                    <GraphQLClientProvider value={urqlClient}>{children}</GraphQLClientProvider>
                </TooltipProvider>
                <Toaster position="bottom-center" richColors />
                <Scripts />
            </body>
        </html>
    );
}
