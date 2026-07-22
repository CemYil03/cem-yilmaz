import { DEFAULT_LOCALE, LOCALES } from '../../shared/locale';
import type { Locale } from '../../shared/locale';

export { DEFAULT_LOCALE, LOCALES } from '../../shared/locale';
export type { Locale } from '../../shared/locale';

export function localeFromAcceptLanguage(header: string | null | undefined): Locale {
    if (!header) return DEFAULT_LOCALE;
    const preferred = header
        .split(',')
        .map((part) => {
            const [lang, q] = part.trim().split(';q=');
            return { lang: lang!.split('-')[0]!.toLowerCase(), q: q ? parseFloat(q) : 1 };
        })
        .sort((a, b) => b.q - a.q);
    for (const { lang } of preferred) {
        if (LOCALES.includes(lang as Locale)) return lang as Locale;
    }
    return DEFAULT_LOCALE;
}

// Same logic as `useLocale()` but works in non-component contexts (e.g.
// TanStack Router's `head()` callback, which runs without React hooks).
export function localeFromParam(params: { locale?: string | undefined } | undefined): Locale {
    const locale = params?.locale;
    if (locale && LOCALES.includes(locale as Locale)) return locale as Locale;
    return DEFAULT_LOCALE;
}
