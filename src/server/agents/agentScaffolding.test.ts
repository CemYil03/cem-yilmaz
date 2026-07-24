import { describe, expect, it } from 'vitest';
import { googleAgentProviderOptionsFor, subAgentClosingRules, summarizeDelegateError, tryParseSubAgentSentinel } from './agentScaffolding';

describe('googleAgentProviderOptionsFor', () => {
    it('uses high thinking with thought summaries on gemini-3.6-flash', () => {
        expect(googleAgentProviderOptionsFor('gemini-3.6-flash').google.thinkingConfig).toEqual({
            thinkingLevel: 'high',
            includeThoughts: true,
        });
    });

    it('disables thinking on other Flash models', () => {
        expect(googleAgentProviderOptionsFor('gemini-2.5-flash').google.thinkingConfig).toEqual({ thinkingBudget: 0 });
        expect(googleAgentProviderOptionsFor('gemini-2.5-flash-lite').google.thinkingConfig).toEqual({ thinkingBudget: 0 });
    });

    it('requests thought summaries on Pro models', () => {
        expect(googleAgentProviderOptionsFor('gemini-3.1-pro-preview').google.thinkingConfig).toEqual({ includeThoughts: true });
    });

    it('always enables structuredOutputs', () => {
        expect(googleAgentProviderOptionsFor('gemini-2.5-flash').google.structuredOutputs).toBe(true);
        expect(googleAgentProviderOptionsFor('gemini-3.6-flash').google.structuredOutputs).toBe(true);
        expect(googleAgentProviderOptionsFor('gemini-3.1-pro-preview').google.structuredOutputs).toBe(true);
    });
});

describe('subAgentClosingRules', () => {
    it('embeds domain label and out-of-domain example in the sentinel rules', () => {
        const lines = subAgentClosingRules({ domainLabel: 'media', outOfDomainExample: 'add a task' });
        const joined = lines.join('\n');
        expect(joined).toContain('needsMoreInfo');
        expect(joined).toContain('noOp');
        expect(joined).toContain('media');
        expect(joined).toContain('add a task');
    });
});

describe('tryParseSubAgentSentinel', () => {
    it('parses a bare needsMoreInfo object', () => {
        expect(tryParseSubAgentSentinel('{"status":"needsMoreInfo","missingFields":["title"],"summary":"Need a title"}')).toEqual({
            status: 'needsMoreInfo',
            missingFields: ['title'],
            summary: 'Need a title',
        });
    });

    it('parses a fenced noOp object', () => {
        expect(tryParseSubAgentSentinel('```json\n{"status":"noOp","missingFields":[],"summary":"Wrong domain"}\n```')).toEqual({
            status: 'noOp',
            missingFields: [],
            summary: 'Wrong domain',
        });
    });

    it('returns null for plain prose', () => {
        expect(tryParseSubAgentSentinel('Created the appointment.')).toBeNull();
    });
});

describe('summarizeDelegateError', () => {
    it('takes the first line of an Error message', () => {
        expect(summarizeDelegateError(new Error('boom\nstack'))).toBe('boom');
    });

    it('falls back for unknown shapes', () => {
        expect(summarizeDelegateError(null)).toBe('unknown error');
    });
});
