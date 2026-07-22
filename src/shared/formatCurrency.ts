import { languageTagFromLocale } from './locale';
import type { Locale } from './locale';

type FormatCurrencyNullAs = 'zero' | 'emDash' | 'empty';

export type FormatCurrencyOptions = {
    locale: Locale;
    currency?: string;
    maximumFractionDigits?: number;
    nullAs?: FormatCurrencyNullAs;
};

export function formatCurrency(cents: number | null | undefined, options: FormatCurrencyOptions): string {
    const { locale, currency = 'EUR', maximumFractionDigits, nullAs = 'zero' } = options;

    if (cents == null) {
        if (nullAs === 'emDash') return '—';
        if (nullAs === 'empty') return '';
        cents = 0;
    }

    return new Intl.NumberFormat(languageTagFromLocale(locale), {
        style: 'currency',
        currency,
        ...(maximumFractionDigits === undefined ? {} : { maximumFractionDigits }),
    }).format(cents / 100);
}
