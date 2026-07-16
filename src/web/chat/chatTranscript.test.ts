import { describe, expect, it } from 'vitest';
import { activeToolCallId } from './chatTranscript';
import type { TranscriptMessage } from './chatTranscript';

// Minimal fixtures — `activeToolCallId` only reads `__typename` and
// `chatMessageId`, so a partial cast is enough and keeps the test readable.
const toolCall = (chatMessageId: string): TranscriptMessage =>
    ({ __typename: 'ChatMessageToolCall', chatMessageId }) as unknown as TranscriptMessage;
const userMessage = (chatMessageId: string): TranscriptMessage =>
    ({ __typename: 'ChatMessageUser', chatMessageId }) as unknown as TranscriptMessage;

describe('activeToolCallId', () => {
    it('returns null when not generating', () => {
        const rows = [toolCall('t1')];
        expect(activeToolCallId(rows, new Set(['t1']), false, false)).toBeNull();
    });

    it('returns null once assistant text has started streaming', () => {
        const rows = [toolCall('t1')];
        expect(activeToolCallId(rows, new Set(['t1']), true, true)).toBeNull();
    });

    it('shimmers the trailing tool call when it belongs to the live turn', () => {
        const rows = [userMessage('u1'), toolCall('t1')];
        expect(activeToolCallId(rows, new Set(['u1', 't1']), true, false)).toBe('t1');
    });

    it('does NOT shimmer a trailing tool call from a previous, settled turn', () => {
        // The live turn appended only the new user message; the trailing tool
        // call is from a prior completed turn, so it must stay settled.
        const rows = [toolCall('t-old'), userMessage('u-new')];
        // Trailing row is the user message (not a tool call) — but even a
        // prior tool call at the tail must not light up:
        const rowsWithTrailingOldTool = [userMessage('u-new'), toolCall('t-old')];
        expect(activeToolCallId(rows, new Set(['u-new']), true, false)).toBeNull();
        expect(activeToolCallId(rowsWithTrailingOldTool, new Set(['u-new']), true, false)).toBeNull();
    });

    it('returns null for an unrelated, non-generating chat (empty live set)', () => {
        const rows = [toolCall('t1')];
        expect(activeToolCallId(rows, new Set(), true, false)).toBeNull();
    });

    it('considers only the LAST tool call, not an earlier live one', () => {
        // Earlier tool call is live, but a later (non-live, prior-turn) tool
        // call is the trailing one → nothing shimmers.
        const rows = [toolCall('t-live'), toolCall('t-old')];
        expect(activeToolCallId(rows, new Set(['t-live']), true, false)).toBeNull();
    });

    it('returns null when there are no tool calls', () => {
        const rows = [userMessage('u1')];
        expect(activeToolCallId(rows, new Set(['u1']), true, false)).toBeNull();
    });
});
