import { describe, expect, it } from 'vitest';
import type { ChatMessageRowJoined } from './toGqlChatMessage';
import { toGqlChatMessage } from './toGqlChatMessage';

// Focused on the generation-metadata field carried by the four AI-produced
// variants (`assistantText`, `toolCall`, `toolApprovalRequest`,
// `assistantInputCollection`). The full per-variant rendering is exercised by
// the integration / DB-backed tests; here we just pin the
// modelId-or-null contract and the per-token-field passthrough.

function assistantTextRow(overrides: Partial<NonNullable<ChatMessageRowJoined['assistantText']>> = {}): ChatMessageRowJoined {
    const chatMessageId = crypto.randomUUID();
    return {
        spine: {
            chatMessageId,
            chatId: 'c',
            kind: 'assistantText',
            authorUserId: null,
            createdAt: new Date('2026-06-01T00:00:00Z'),
        },
        assistantText: {
            chatMessageId,
            body: 'hi',
            modelId: null,
            inputTokens: null,
            outputTokens: null,
            totalTokens: null,
            reasoningTokens: null,
            cachedInputTokens: null,
            ...overrides,
        },
    };
}

describe('toGqlChatMessage — generation metadata', () => {
    it('returns generation: null for legacy rows that have no modelId', () => {
        // Arrange
        const row = assistantTextRow();

        // Act
        const message = toGqlChatMessage(row);

        // Assert
        if (message.gqlTypeName !== 'ChatMessageAssistantText') throw new Error('expected ChatMessageAssistantText');
        expect(message.generation).toBeNull();
    });

    it('passes every persisted token field through verbatim when modelId is set', () => {
        // Arrange
        const row = assistantTextRow({
            modelId: 'gemini-2.5-flash',
            inputTokens: 100,
            outputTokens: 42,
            totalTokens: 142,
            reasoningTokens: 7,
            cachedInputTokens: 3,
        });

        // Act
        const message = toGqlChatMessage(row);

        // Assert
        if (message.gqlTypeName !== 'ChatMessageAssistantText') throw new Error('expected ChatMessageAssistantText');
        expect(message.generation).toEqual({
            modelId: 'gemini-2.5-flash',
            inputTokens: 100,
            outputTokens: 42,
            totalTokens: 142,
            reasoningTokens: 7,
            cachedInputTokens: 3,
        });
    });

    it('preserves null token fields alongside a present modelId (provider omitted them)', () => {
        // Arrange — Gemini reports input/output/total but never reasoningTokens.
        const row = assistantTextRow({
            modelId: 'gemini-2.5-flash',
            inputTokens: 50,
            outputTokens: 10,
            totalTokens: 60,
        });

        // Act
        const message = toGqlChatMessage(row);

        // Assert
        if (message.gqlTypeName !== 'ChatMessageAssistantText') throw new Error('expected ChatMessageAssistantText');
        expect(message.generation).toEqual({
            modelId: 'gemini-2.5-flash',
            inputTokens: 50,
            outputTokens: 10,
            totalTokens: 60,
            reasoningTokens: null,
            cachedInputTokens: null,
        });
    });
});
