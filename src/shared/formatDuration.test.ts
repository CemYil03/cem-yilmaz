import { describe, expect, it } from 'vitest';
import { formatDuration, formatHms } from './formatDuration';

describe('formatDuration', () => {
    it('formats short stretches in seconds or minutes', () => {
        expect(formatDuration(0)).toBe('0s');
        expect(formatDuration(45)).toBe('45s');
        expect(formatDuration(60)).toBe('1m');
        expect(formatDuration(125)).toBe('2m');
    });

    it('formats hours with optional remaining minutes', () => {
        expect(formatDuration(3600)).toBe('1h');
        expect(formatDuration(3660)).toBe('1h 1m');
        expect(formatDuration(7200)).toBe('2h');
    });
});

describe('formatHms', () => {
    it('pads hours, minutes, and seconds to two digits', () => {
        expect(formatHms(0)).toBe('00:00:00');
        expect(formatHms(5)).toBe('00:00:05');
        expect(formatHms(65)).toBe('00:01:05');
        expect(formatHms(3661)).toBe('01:01:01');
    });
});
