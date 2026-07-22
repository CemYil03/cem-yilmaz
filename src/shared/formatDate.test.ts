import { describe, expect, it } from 'vitest';
import { formatDate, formatDateRange, formatMonthYear } from './formatDate';
import { formatIsoDate } from './formatIsoDate';

describe('formatDate', () => {
    it('formats an ISO date-only string as a local calendar date', () => {
        const de = formatDate('2026-03-15', { locale: 'de' });
        const en = formatDate('2026-03-15', { locale: 'en' });
        expect(de).toMatch(/15/);
        expect(de).toMatch(/2026/);
        expect(en).toMatch(/Mar/);
        expect(en).toMatch(/15/);
    });

    it('returns an em dash for null', () => {
        expect(formatDate(null, { locale: 'en' })).toBe('—');
    });

    it('supports short date style', () => {
        const formatted = formatDate(new Date(2026, 2, 15), { locale: 'de', dateStyle: 'short' });
        expect(formatted).toMatch(/15/);
        expect(formatted).toMatch(/03|3/);
        expect(formatted).toMatch(/26|2026/);
    });

    it('includes weekday when requested', () => {
        const formatted = formatDate('2026-03-15', { locale: 'en', weekday: true });
        expect(formatted.toLowerCase()).toMatch(/sunday|sun/);
    });
});

describe('formatDateRange', () => {
    it('joins both ends with an en dash', () => {
        const formatted = formatDateRange('2026-03-01', '2026-03-15', { locale: 'en' });
        expect(formatted).toContain('–');
        expect(formatted).toMatch(/Mar/);
    });

    it('prefixes open-ended starts and ends', () => {
        expect(formatDateRange('2026-03-01', null, { locale: 'de', openEnded: true })).toMatch(/^ab /);
        expect(formatDateRange(null, '2026-03-15', { locale: 'en', openEnded: true })).toMatch(/^until /);
    });

    it('returns em dash when both ends are missing', () => {
        expect(formatDateRange(null, undefined, { locale: 'de' })).toBe('—');
    });
});

describe('formatMonthYear', () => {
    it('formats short and long month styles', () => {
        expect(formatMonthYear('2026-07-01', { locale: 'en' })).toMatch(/Jul/);
        expect(formatMonthYear('2026-07-01', { locale: 'en', month: 'long' })).toMatch(/July/);
    });
});

describe('formatIsoDate', () => {
    it('formats a local Date without UTC shift', () => {
        expect(formatIsoDate(new Date(2026, 2, 15))).toBe('2026-03-15');
    });
});
