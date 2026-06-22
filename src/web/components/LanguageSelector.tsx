import { useLocation, useNavigate } from '@tanstack/react-router';
import { DEFAULT_LOCALE, LOCALES } from '../utils/locale';
import type { Locale } from '../utils/locale';
import { useLocale } from '../hooks/useLocale';
import { Tooltip, TooltipContent, TooltipTrigger } from './base/tooltip';

function setLocaleCookie(locale: Locale) {
    document.cookie = `locale=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

function buildLocalePath(pathname: string, currentLocale: Locale, targetLocale: Locale): string {
    const pathWithoutLocale = currentLocale !== DEFAULT_LOCALE ? pathname.replace(`/${currentLocale}`, '') || '/' : pathname;
    if (targetLocale === DEFAULT_LOCALE) return pathWithoutLocale;
    return `/${targetLocale}${pathWithoutLocale === '/' ? '' : pathWithoutLocale}`;
}

export function LanguageSelector() {
    const currentLocale = useLocale();
    const location = useLocation();
    const navigate = useNavigate();

    const nextLocale = LOCALES.find((locale) => locale !== currentLocale) ?? DEFAULT_LOCALE;
    const label = {
        de: `Sprache: Deutsch. Klicken, um zu Englisch zu wechseln.`,
        en: `Language: English. Click to switch to German.`,
    }[currentLocale];

    function toggleLocale() {
        setLocaleCookie(nextLocale);
        navigate({ to: buildLocalePath(location.pathname, currentLocale, nextLocale) });
    }

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    type="button"
                    onClick={toggleLocale}
                    aria-label={label}
                    className="grid size-10 place-items-center rounded-full border border-foreground/10 text-foreground/80 text-xs font-semibold transition hover:bg-foreground/5 active:bg-foreground/10 dark:border-white/10 dark:hover:bg-white/8 dark:active:bg-white/14 cursor-pointer capitalize"
                >
                    {currentLocale}
                </button>
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
        </Tooltip>
    );
}
