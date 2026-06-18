import { Outlet, createFileRoute, notFound, redirect } from '@tanstack/react-router';
import { createIsomorphicFn } from '@tanstack/react-start';
import { getRequestHeader, setResponseHeader } from '@tanstack/react-start/server';
import { DEFAULT_LOCALE, LOCALES, localeFromAcceptLanguage } from '../web/utils/locale';
import type { Locale } from '../web/utils/locale';

const LOCALE_COOKIE = 'locale';

const detectLocale = createIsomorphicFn()
    .server(() => {
        const cookie = getRequestHeader('cookie');
        const match = cookie?.match(/(?:^|;\s*)locale=([^;]+)/);
        if (match && LOCALES.includes(match[1] as Locale)) return match[1] as Locale;
        const detected = localeFromAcceptLanguage(getRequestHeader('accept-language'));
        setResponseHeader('Set-Cookie', `${LOCALE_COOKIE}=${detected}; Path=/; Max-Age=31536000; SameSite=Lax`);
        return detected;
    })
    .client(() => {
        const match = document.cookie.match(/(?:^|;\s*)locale=([^;]+)/);
        if (match && LOCALES.includes(match[1] as Locale)) return match[1] as Locale;
        return DEFAULT_LOCALE;
    });

export const Route = createFileRoute('/{-$locale}')({
    beforeLoad: ({ params, location }) => {
        if (params.locale && !LOCALES.includes(params.locale as Locale)) {
            throw notFound();
        }
        if (!params.locale) {
            const detected = detectLocale();
            if (detected !== DEFAULT_LOCALE) {
                throw redirect({ href: `/${detected}${location.pathname === '/' ? '' : location.pathname}` });
            }
        }
    },
    component: () => <Outlet />,
});
