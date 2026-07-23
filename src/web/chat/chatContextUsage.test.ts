import { describe, expect, it } from 'vitest';
import { chatContextTokensUsed, formatTokenCount } from './chatContextUsage';

describe('chatContextTokensUsed', () => {
    it('returns null when there are no messages', () => {
        expect(chatContextTokensUsed([])).toBeNull();
    });

    it('returns null when no message carries generation inputTokens', () => {
        expect(chatContextTokensUsed([{ generation: null }, { generation: { inputTokens: null } }])).toBeNull();
    });

    it('returns the newest non-null inputTokens', () => {
        expect(
            chatContextTokensUsed([{ generation: { inputTokens: 1_000 } }, { generation: null }, { generation: { inputTokens: 12_400 } }]),
        ).toBe(12_400);
    });

    it('skips trailing rows without usage and keeps an earlier step', () => {
        expect(chatContextTokensUsed([{ generation: { inputTokens: 8_000 } }, { generation: { inputTokens: null } }, {}])).toBe(8_000);
    });
});

describe('formatTokenCount', () => {
    it('keeps small counts as integers', () => {
        expect(formatTokenCount(850)).toBe('850');
    });

    it('formats thousands with one decimal when under 10k', () => {
        expect(formatTokenCount(12_400)).toBe('12.4k');
        expect(formatTokenCount(1_000)).toBe('1k');
    });

    it('formats millions compactly', () => {
        expect(formatTokenCount(1_048_576)).toBe('1M');
        expect(formatTokenCount(2_097_152)).toBe('2.1M');
    });
});
