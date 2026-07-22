import { describe, expect, it } from 'vitest';
import { googleAgentProviderOptionsFor } from './agentScaffolding';

describe('googleAgentProviderOptionsFor', () => {
    it('disables thinking on Flash models', () => {
        expect(googleAgentProviderOptionsFor('gemini-2.5-flash').google.thinkingConfig).toEqual({ thinkingBudget: 0 });
        expect(googleAgentProviderOptionsFor('gemini-3.5-flash').google.thinkingConfig).toEqual({ thinkingBudget: 0 });
    });

    it('requests thought summaries on Pro models', () => {
        expect(googleAgentProviderOptionsFor('gemini-2.5-pro').google.thinkingConfig).toEqual({ includeThoughts: true });
        expect(googleAgentProviderOptionsFor('gemini-3.1-pro-preview').google.thinkingConfig).toEqual({ includeThoughts: true });
    });

    it('always enables structuredOutputs', () => {
        expect(googleAgentProviderOptionsFor('gemini-2.5-flash').google.structuredOutputs).toBe(true);
        expect(googleAgentProviderOptionsFor('gemini-2.5-pro').google.structuredOutputs).toBe(true);
    });
});
