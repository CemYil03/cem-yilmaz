export type Locale = 'de' | 'en';
export const LOCALES = ['de', 'en'] as const;
export const DEFAULT_LOCALE: Locale = 'de';

export function languageTagFromLocale(locale: Locale): 'de-DE' | 'en-US' {
    return locale === 'de' ? 'de-DE' : 'en-US';
}
