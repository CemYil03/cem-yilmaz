import { useParams } from '@tanstack/react-router';
import { DEFAULT_LOCALE, LOCALES } from '../utils/locale';
import type { Locale } from '../utils/locale';

export function useLocale(): Locale {
    const params: { locale?: string } = useParams({ strict: false });
    const locale = params.locale;
    if (locale && LOCALES.includes(locale as Locale)) return locale as Locale;
    return DEFAULT_LOCALE;
}
