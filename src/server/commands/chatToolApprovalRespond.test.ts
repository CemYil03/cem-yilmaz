import { eq } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';

import { chatMessages, chatMessagesToolApprovalRequest, chatMessagesToolApprovalResponse, chatMessagesToolCall, chats } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import type { GqlSChatAssistantOptions, GqlSUserMutation } from '../graphql/generated';
import { chatToolApprovalRespond } from './chatToolApprovalRespond';

// `chatAssistantTurnRun` calls Gemini, which we don't want to hit from a unit
// test. Mock it as a no-op so the respond command writes its row and we can
// inspect it; the SDK-driven `execute` itself is exercised on the next turn
// and is covered by manual verification per the plan.
vi.mock('./chatAssistantTurnRun', () => ({
    chatAssistantTurnRunDetached: vi.fn(() => undefined),
}));

const stubAssistantOptions: GqlSChatAssistantOptions = {
    generationId: null,
    requireToolCallApprovals: true,
};

// Drives the `chatUpdates` publish path — only set when the test wants to
// observe `ChatUpdateMessageAppended` events.
const streamingAssistantOptions: GqlSChatAssistantOptions = {
    generationId: 'gen-test',
    requireToolCallApprovals: true,
};

// Seeds a chat with a pending `toolApprovalRequest` and returns the ids the
// test needs to drive `chatToolApprovalRespond`. The session+user come from
// `commandSetup.withUser`; everything chat-shaped lives here.
async function seedApprovalRequest(toolName: string, toolArgs: object) {
    const setup = await commandSetup.withUser();
    const chatId = crypto.randomUUID();
    const requestMessageId = crypto.randomUUID();
    const approvalId = `approval-${crypto.randomUUID()}`;
    const toolCallId = `tc-${crypto.randomUUID()}`;

    await testDb.insert(chats).values({ chatId });
    await testDb.insert(chatMessages).values({
        chatMessageId: requestMessageId,
        chatId,
        kind: 'toolApprovalRequest',
    });
    await testDb.insert(chatMessagesToolApprovalRequest).values({
        chatMessageId: requestMessageId,
        approvalId,
        toolCallId,
        toolName,
        toolArgs,
    });

    const parent: GqlSUserMutation = { userId: setup.user.userId } as GqlSUserMutation;
    return { ...setup, parent, chatId, requestMessageId, approvalId, toolCallId };
}

describe('chatToolApprovalRespond', () => {
    it('approves a pending writeToConsole call: writes the response row and defers execution to the next turn', async () => {
        // Arrange — guard that the command itself does NOT execute the tool.
        const seed = await seedApprovalRequest('writeToConsole', { message: 'hello-from-test' });

        // Act
        const result = await chatToolApprovalRespond(
            seed.parent,
            { approvalId: seed.approvalId, approved: true, assistantOptions: streamingAssistantOptions },
            seed.requestingSession,
            seed.serverRuntime,
        );

        // Assert — mutation result
        expect(result).not.toBeNull();
        expect(result!.chatId).toBe(seed.chatId);

        // Assert — response row landed; no tool-call row written by the
        // respond command. The SDK owns execution: `toModelMessages` replays
        // the response row as a `tool-approval-response` part on the next
        // turn and the SDK then calls `execute`. Whatever tool-call row that
        // turn produces is persisted by `onStepFinish` in
        // `chatAssistantTurnRun`, not here.
        const [responseRows, toolCallRows] = await Promise.all([
            testDb.select().from(chatMessagesToolApprovalResponse).where(eq(chatMessagesToolApprovalResponse.approvalId, seed.approvalId)),
            testDb.select().from(chatMessagesToolCall).where(eq(chatMessagesToolCall.toolCallId, seed.toolCallId)),
        ]);
        expect(responseRows).toHaveLength(1);
        expect(responseRows[0]!.approved).toBe(true);
        // No reason argument was passed — column is null on this row.
        expect(responseRows[0]!.reason).toBeNull();
        expect(toolCallRows).toHaveLength(0);

        // Assert — the command itself did not run the tool.
        expect(console.log).not.toHaveBeenCalled();

        // Assert — exactly one MessageAppended event fires: the response row.
        const appended = vi
            .mocked(seed.serverRuntime.publish.chatUpdates)
            .mock.calls.map(([args]) => args)
            .filter(({ update }) => update.gqlTypeName === 'ChatUpdateMessageAppended');
        expect(appended).toHaveLength(1);
        expect(appended[0]!.generationId).toBe('gen-test');
        const message = (appended[0]!.update as { message: { gqlTypeName: string; approved?: boolean } }).message;
        expect(message.gqlTypeName).toBe('ChatMessageToolApprovalResponse');
        expect(message.approved).toBe(true);
    });

    it('declines a pending call: writes the response row with approved=false and does not execute the tool', async () => {
        // Arrange
        const seed = await seedApprovalRequest('writeToConsole', { message: 'should-not-run' });

        // Act
        const result = await chatToolApprovalRespond(
            seed.parent,
            { approvalId: seed.approvalId, approved: false, assistantOptions: streamingAssistantOptions },
            seed.requestingSession,
            seed.serverRuntime,
        );

        // Assert
        expect(result).not.toBeNull();

        const [responseRows, toolCallRows] = await Promise.all([
            testDb.select().from(chatMessagesToolApprovalResponse).where(eq(chatMessagesToolApprovalResponse.approvalId, seed.approvalId)),
            testDb.select().from(chatMessagesToolCall).where(eq(chatMessagesToolCall.toolCallId, seed.toolCallId)),
        ]);
        expect(responseRows[0]!.approved).toBe(false);
        // No reason supplied → column stays null on the bare-decline path.
        expect(responseRows[0]!.reason).toBeNull();

        // No tool-call row from the command — and obviously no console output.
        expect(toolCallRows).toHaveLength(0);
        expect(console.log).not.toHaveBeenCalled();

        // Assert — exactly one MessageAppended event fires (the response).
        const appended = vi
            .mocked(seed.serverRuntime.publish.chatUpdates)
            .mock.calls.map(([args]) => args)
            .filter(({ update }) => update.gqlTypeName === 'ChatUpdateMessageAppended');
        expect(appended).toHaveLength(1);
        const message = (appended[0]!.update as { message: { gqlTypeName: string; approved?: boolean } }).message;
        expect(message.gqlTypeName).toBe('ChatMessageToolApprovalResponse');
        expect(message.approved).toBe(false);
    });

    it('declines with a reason: persists the reason and surfaces it on the published MessageAppended payload', async () => {
        // Arrange
        const seed = await seedApprovalRequest('writeToConsole', { message: 'should-not-run' });
        const reason = "Wrong restaurant — let's pick a different one.";

        // Act
        const result = await chatToolApprovalRespond(
            seed.parent,
            { approvalId: seed.approvalId, approved: false, reason, assistantOptions: streamingAssistantOptions },
            seed.requestingSession,
            seed.serverRuntime,
        );

        // Assert
        expect(result).not.toBeNull();

        const responseRows = await testDb
            .select()
            .from(chatMessagesToolApprovalResponse)
            .where(eq(chatMessagesToolApprovalResponse.approvalId, seed.approvalId));
        expect(responseRows[0]!.approved).toBe(false);
        expect(responseRows[0]!.reason).toBe(reason);

        // The published MessageAppended carries the reason through to the
        // subscriber so the transcript reflects it without a refetch — same
        // shape `chatFindOne` would emit.
        const appended = vi
            .mocked(seed.serverRuntime.publish.chatUpdates)
            .mock.calls.map(([args]) => args)
            .filter(({ update }) => update.gqlTypeName === 'ChatUpdateMessageAppended');
        expect(appended).toHaveLength(1);
        const message = (appended[0]!.update as { message: { gqlTypeName: string; approved?: boolean; reason?: string | null } }).message;
        expect(message.gqlTypeName).toBe('ChatMessageToolApprovalResponse');
        expect(message.approved).toBe(false);
        expect(message.reason).toBe(reason);
    });

    it('rejects a second response for the same approvalId (idempotency guard)', async () => {
        // Arrange — first attempt carries a reason.
        const seed = await seedApprovalRequest('writeToConsole', { message: 'one-shot' });
        await chatToolApprovalRespond(
            seed.parent,
            { approvalId: seed.approvalId, approved: true, reason: 'looks fine', assistantOptions: stubAssistantOptions },
            seed.requestingSession,
            seed.serverRuntime,
        );

        // Act — second attempt with different fields
        const second = await chatToolApprovalRespond(
            seed.parent,
            { approvalId: seed.approvalId, approved: false, reason: 'changed my mind', assistantOptions: stubAssistantOptions },
            seed.requestingSession,
            seed.serverRuntime,
        );

        // Assert — first write wins and is preserved verbatim.
        expect(second).toBeNull();

        const responseRows = await testDb
            .select()
            .from(chatMessagesToolApprovalResponse)
            .where(eq(chatMessagesToolApprovalResponse.approvalId, seed.approvalId));
        expect(responseRows).toHaveLength(1);
        expect(responseRows[0]!.approved).toBe(true);
        expect(responseRows[0]!.reason).toBe('looks fine');
    });

    it('returns null for an unknown approvalId without writing any rows', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser();

        // Act
        const result = await chatToolApprovalRespond(
            { userId: user.userId } as GqlSUserMutation,
            { approvalId: 'does-not-exist', approved: true, assistantOptions: stubAssistantOptions },
            requestingSession,
            serverRuntime,
        );

        // Assert
        expect(result).toBeNull();
    });
});
