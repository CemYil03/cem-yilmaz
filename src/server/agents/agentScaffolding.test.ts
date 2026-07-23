import { describe, expect, it } from 'vitest';
import { googleAgentProviderOptionsFor } from './agentScaffolding';

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
