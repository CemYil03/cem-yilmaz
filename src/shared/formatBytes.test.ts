import { describe, expect, it } from 'vitest';
import { formatBytes } from './formatBytes';

describe('formatBytes', () => {
    it('formats sizes with the right unit', () => {
        expect(formatBytes(0)).toBe('0 B');
        expect(formatBytes(512)).toBe('512 B');
        expect(formatBytes(1024)).toBe('1.0 KB');
        expect(formatBytes(1536)).toBe('1.5 KB');
        expect(formatBytes(1024 * 1024)).toBe('1.0 MB');
        expect(formatBytes(Math.round(1.5 * 1024 * 1024))).toBe('1.5 MB');
        expect(formatBytes(Math.round(2.3 * 1024 * 1024 * 1024))).toBe('2.3 GB');
    });

    it('handles invalid inputs without throwing', () => {
        expect(formatBytes(NaN)).toBe('0 B');
        expect(formatBytes(-100)).toBe('0 B');
        expect(formatBytes(Number.POSITIVE_INFINITY)).toBe('0 B');
    });
});
