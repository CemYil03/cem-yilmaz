import { useLocation, useNavigate } from '@tanstack/react-router';
import { DEFAULT_LOCALE, LOCALES } from '../utils/locale';
import type { Locale } from '../utils/locale';
import { useLocale } from '../hooks/useLocale';

function setLocaleCookie(locale: Locale) {
    document.cookie = `locale=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

function buildLocalePath(pathname: string, currentLocale: Locale, targetLocale: Locale): string {
    const pathWithoutLocale = currentLocale !== DEFAULT_LOCALE ? pathname.replace(`/${currentLocale}`, '') || '/' : pathname;
    if (targetLocale === DEFAULT_LOCALE) return pathWithoutLocale;
    return `/${targetLocale}${pathWithoutLocale === '/' ? '' : pathWithoutLocale}`;
}

export function LanguageSwitcher() {
    const currentLocale = useLocale();
    const location = useLocation();
    const navigate = useNavigate();

    return (
        <div className="flex gap-1">
            {LOCALES.map((locale) => (
                <button
                    key={locale}
                    type="button"
                    onClick={() => {
                        setLocaleCookie(locale);
                        navigate({ to: buildLocalePath(location.pathname, currentLocale, locale) });
                    }}
                    className={`cursor-pointer rounded px-2 py-1 text-sm uppercase ${locale === currentLocale ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:bg-accent'}`}
                >
                    {locale}
                </button>
            ))}
        </div>
    );
}
