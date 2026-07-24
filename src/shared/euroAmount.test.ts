import { describe, expect, it } from 'vitest';
import { centsToEuros, eurosToCents } from './euroAmount';

describe('centsToEuros', () => {
    it('formats cents as a fixed two-decimal string', () => {
        expect(centsToEuros(0)).toBe('0.00');
        expect(centsToEuros(123)).toBe('1.23');
        expect(centsToEuros(100)).toBe('1.00');
    });
});

describe('eurosToCents', () => {
    it('parses euro strings into integer cents', () => {
        expect(eurosToCents('1.23')).toBe(123);
        expect(eurosToCents('1,23')).toBe(123);
        expect(eurosToCents('  12.5  ')).toBe(1250);
        expect(eurosToCents('0')).toBe(0);
    });

    it('returns null for empty or invalid input', () => {
        expect(eurosToCents('')).toBeNull();
        expect(eurosToCents('   ')).toBeNull();
        expect(eurosToCents('abc')).toBeNull();
    });
});
