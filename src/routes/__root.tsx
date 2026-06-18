import { HeadContent, Outlet, Scripts, createRootRoute, useLocation } from '@tanstack/react-router';
import { useEffect } from 'react';
import { Provider as GraphQLClientProvider } from 'urql';
import appCss from '../styles.css?url';
import { Toaster } from '../web/components/base/sonner';
import { TooltipProvider } from '../web/components/base/tooltip';
import { NavigationProgress } from '../web/components/NavigationProgress';
import { urqlClient } from '../web/graphql/client';
import { useLocale } from '../web/hooks/useLocale';

const THEME_INIT_SCRIPT = `(function(){try{var stored=window.localStorage.getItem('theme');var mode=(stored==='light'||stored==='dark'||stored==='auto')?stored:'auto';var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;var resolved=mode==='auto'?(prefersDark?'dark':'light'):mode;var root=document.documentElement;root.classList.remove('light','dark');root.classList.add(resolved);if(mode==='auto'){root.removeAttribute('data-theme')}else{root.setAttribute('data-theme',mode)}root.style.colorScheme=resolved;}catch(e){}})();`;

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
