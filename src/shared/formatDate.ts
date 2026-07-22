import { languageTagFromLocale } from './locale';
import type { Locale } from './locale';

const ISO_DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export type FormatDateOptions = {
    locale: Locale;
    dateStyle?: 'short' | 'medium' | 'long';
    weekday?: boolean;
    nullAs?: string;
};

export type FormatDateRangeOptions = {
    locale: Locale;
    openEnded?: boolean;
    dateStyle?: 'short' | 'medium' | 'long';
    nullAs?: string;
};

export type FormatMonthYearOptions = {
    locale: Locale;
    month?: 'short' | 'long';
};

function parseDisplayDate(value: string | Date): Date | null {
    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value;
    }

    if (ISO_DATE_ONLY.test(value)) {
        const [y, m, d] = value.split('-').map(Number);
        if (y == null || m == null || d == null) return null;
        const date = new Date(y, m - 1, d);
        return Number.isNaN(date.getTime()) ? null : date;
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value: string | Date | null | undefined, options: FormatDateOptions): string {
    const { locale, dateStyle = 'medium', weekday = false, nullAs = '—' } = options;
    if (value == null || value === '') return nullAs;

    const date = parseDisplayDate(value);
    if (!date) return typeof value === 'string' ? value : nullAs;

    // Intl forbids mixing `dateStyle` with individual field options like `weekday`.
    if (weekday) {
        return new Intl.DateTimeFormat(languageTagFromLocale(locale), {
            weekday: 'long',
            year: 'numeric',
            month: dateStyle === 'short' ? 'numeric' : dateStyle === 'long' ? 'long' : 'short',
            day: 'numeric',
        }).format(date);
    }

    return new Intl.DateTimeFormat(languageTagFromLocale(locale), { dateStyle }).format(date);
}

export function formatDateRange(
    startsOn: string | Date | null | undefined,
    endsOn: string | Date | null | undefined,
    options: FormatDateRangeOptions,
): string {
    const { locale, openEnded = false, dateStyle = 'medium', nullAs = '—' } = options;
    const dateOpts: FormatDateOptions = { locale, dateStyle, nullAs };

    if (startsOn == null && endsOn == null) return nullAs;
    if (startsOn != null && endsOn != null) {
        return `${formatDate(startsOn, dateOpts)} – ${formatDate(endsOn, dateOpts)}`;
    }
    if (!openEnded) {
        return formatDate(startsOn ?? endsOn, dateOpts);
    }
    if (startsOn != null) {
        return { de: `ab ${formatDate(startsOn, dateOpts)}`, en: `from ${formatDate(startsOn, dateOpts)}` }[locale];
    }
    return { de: `bis ${formatDate(endsOn, dateOpts)}`, en: `until ${formatDate(endsOn, dateOpts)}` }[locale];
}

export function formatMonthYear(value: string | Date, options: FormatMonthYearOptions): string {
    const { locale, month = 'short' } = options;
    const date = parseDisplayDate(value);
    if (!date) return typeof value === 'string' ? value : '';

    return new Intl.DateTimeFormat(languageTagFromLocale(locale), {
        month,
        year: 'numeric',
    }).format(date);
}
