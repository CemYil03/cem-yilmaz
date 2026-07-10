import { useLocation, useNavigate } from '@tanstack/react-router';
import { DEFAULT_LOCALE, LOCALES } from '../utils/locale';
import type { Locale } from '../utils/locale';
import { useLocale } from '../hooks/useLocale';
import { HeaderIconButton } from './HeaderIconButton';

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
        <HeaderIconButton onClick={toggleLocale} label={label} className="text-xs font-semibold capitalize">
            {currentLocale}
        </HeaderIconButton>
    );
}
