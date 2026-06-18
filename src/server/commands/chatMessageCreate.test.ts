import { eq } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';

import { chatMessageUserAttachments, chatMessages, chatMessagesUser, chats } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import type { GqlSChatAssistantOptions, GqlSUserMutation } from '../graphql/generated';
import { chatAssistantTurnRunDetached } from './chatAssistantTurnRun';
import { chatMessageCreate } from './chatMessageCreate';
import { fileUploadCreate } from './fileUploadCreate';

// `chatAssistantTurnRunDetached` would call Gemini; mock it as a no-op so the
// test can inspect the user-message persistence + publish path in isolation.
// We mock the detached entry point (not the inner `chatAssistantTurnRun`)
// because that's what the command actually calls — the two live in the same
// module, and a mock of one doesn't intercept intra-module calls to the other.
vi.mock('./chatAssistantTurnRun', () => ({
    chatAssistantTurnRunDetached: vi.fn(() => undefined),
}));

const streamingAssistantOptions: GqlSChatAssistantOptions = {
    generationId: 'gen-test',
    requireToolCallApprovals: false,
};

describe('chatMessageCreate', () => {
    it('creates a new chat, persists the user message, and publishes MessageAppended before the assistant turn runs', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser();
        const parent: GqlSUserMutation = { userId: user.userId } as GqlSUserMutation;

        // Act
        const result = await chatMessageCreate(
            parent,
            { chatId: null, message: 'hello world', assistantOptions: streamingAssistantOptions },
            requestingSession,
            serverRuntime,
        );

        // Assert — mutation result
        expect(result).not.toBeNull();
        const { chatId, chatMessageId } = result!;
        expect(chatId).toBeTruthy();
        expect(chatMessageId).toBeTruthy();

        // Assert — chat row + user spine + variant rows persisted in one
        // round-trip; these are independent reads.
        const [chatRows, spineRows, userRows] = await Promise.all([
            testDb.select().from(chats).where(eq(chats.chatId, chatId)),
            testDb.select().from(chatMessages).where(eq(chatMessages.chatMessageId, chatMessageId)),
            testDb.select().from(chatMessagesUser).where(eq(chatMessagesUser.chatMessageId, chatMessageId)),
        ]);
        expect(chatRows).toHaveLength(1);
        expect(spineRows).toHaveLength(1);
        expect(spineRows[0]!.kind).toBe('user');
        expect(spineRows[0]!.authorUserId).toBe(user.userId);
        expect(userRows).toHaveLength(1);
        expect(userRows[0]!.body).toBe('hello world');

        // Assert — exactly one MessageAppended fired (for the user row),
        // before chatAssistantTurnRun was invoked.
        const appended = vi
            .mocked(serverRuntime.publish.chatUpdates)
            .mock.calls.map(([args]) => args)
            .filter(({ update }) => update.gqlTypeName === 'ChatUpdateMessageAppended');
        expect(appended).toHaveLength(1);
        expect(appended[0]!.generationId).toBe('gen-test');
        const message = (appended[0]!.update as { message: { gqlTypeName: string; chatMessageId: string; body?: string } }).message;
        expect(message.gqlTypeName).toBe('ChatMessageUser');
        expect(message.chatMessageId).toBe(chatMessageId);
        expect(message.body).toBe('hello world');

        // The mock asserts the detached turn was kicked off exactly once —
        // we don't care about the LLM result here, only the publish ordering.
        expect(chatAssistantTurnRunDetached).toHaveBeenCalledTimes(1);
    });

    it('does not publish MessageAppended when no generationId is supplied', async () => {
        // Arrange — no generationId means no live subscriber to push to.
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser();
        const parent: GqlSUserMutation = { userId: user.userId } as GqlSUserMutation;
        const noStreamOptions: GqlSChatAssistantOptions = {
            generationId: null,
            requireToolCallApprovals: false,
        };

        // Act
        const result = await chatMessageCreate(
            parent,
            { chatId: null, message: 'silent send', assistantOptions: noStreamOptions },
            requestingSession,
            serverRuntime,
        );

        // Assert — persistence still happens; only the publish is skipped.
        expect(result).not.toBeNull();
        const userRows = await testDb.select().from(chatMessagesUser).where(eq(chatMessagesUser.chatMessageId, result!.chatMessageId));
        expect(userRows).toHaveLength(1);
        expect(serverRuntime.publish.chatUpdates).not.toHaveBeenCalled();
    });

    it('links attachments to the user message and exposes them on the published payload', async () => {
        // Arrange — pre-upload two attachments owned by the seeded user.
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser();
        const parent: GqlSUserMutation = { userId: user.userId } as GqlSUserMutation;
        const a1 = await fileUploadCreate(testDb, {
            userId: user.userId,
            filename: 'photo.png',
            mediaType: 'image/png',
            bytes: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
        });
        const a2 = await fileUploadCreate(testDb, {
            userId: user.userId,
            filename: 'report.pdf',
            mediaType: 'application/pdf',
            bytes: Buffer.from('%PDF-1.4'),
        });

        // Act
        const result = await chatMessageCreate(
            parent,
            {
                chatId: null,
                message: 'see attached',
                fileUploadIds: [a1.fileUploadId, a2.fileUploadId],
                assistantOptions: streamingAssistantOptions,
            },
            requestingSession,
            serverRuntime,
        );

        // Assert — join rows present in send-order.
        expect(result).not.toBeNull();
        const joinRows = await testDb
            .select()
            .from(chatMessageUserAttachments)
            .where(eq(chatMessageUserAttachments.chatMessageId, result!.chatMessageId));
        const inOrder = joinRows.sort((x, y) => x.position - y.position);
        expect(inOrder.map((r) => r.fileUploadId)).toEqual([a1.fileUploadId, a2.fileUploadId]);

        // Assert — the published MessageAppended carries `attachments` with
        // resolver-shaped url, mediaType, etc.
        const appended = vi
            .mocked(serverRuntime.publish.chatUpdates)
            .mock.calls.map(([args]) => args)
            .find(({ update }) => update.gqlTypeName === 'ChatUpdateMessageAppended');
        expect(appended).toBeDefined();
        const message = (
            appended!.update as {
                message: { gqlTypeName: string; attachments: Array<{ fileUploadId: string; url: string; mediaType: string }> };
            }
        ).message;
        expect(message.gqlTypeName).toBe('ChatMessageUser');
        expect(message.attachments).toHaveLength(2);
        expect(message.attachments[0]!.fileUploadId).toBe(a1.fileUploadId);
        expect(message.attachments[0]!.url).toBe(`/api/file-uploads/${a1.fileUploadId}`);
        expect(message.attachments[0]!.mediaType).toBe('image/png');
        expect(message.attachments[1]!.fileUploadId).toBe(a2.fileUploadId);
    });

    it('rejects fileUploadIds owned by a different user', async () => {
        // Arrange — file upload owned by user B; user A tries to send it.
        const a = await commandSetup.withUser();
        const b = await commandSetup.withUser();
        const parentA: GqlSUserMutation = { userId: a.user.userId } as GqlSUserMutation;
        const otherUsersFileUpload = await fileUploadCreate(testDb, {
            userId: b.user.userId,
            filename: 'other.txt',
            mediaType: 'text/plain',
            bytes: Buffer.from('hi'),
        });

        // Act — A passes B's file-upload id; the command's try/catch should
        // log and return null instead of persisting a half-row.
        const result = await chatMessageCreate(
            parentA,
            {
                chatId: null,
                message: 'borrowed!',
                fileUploadIds: [otherUsersFileUpload.fileUploadId],
                assistantOptions: streamingAssistantOptions,
            },
            a.requestingSession,
            a.serverRuntime,
        );

        // Assert — null result, no user rows persisted, no publish, no agent kicked off.
        expect(result).toBeNull();
        const userRows = await testDb.select().from(chatMessagesUser);
        expect(userRows.find((r) => r.body === 'borrowed!')).toBeUndefined();
        expect(a.serverRuntime.publish.chatUpdates).not.toHaveBeenCalled();
        expect(chatAssistantTurnRunDetached).not.toHaveBeenCalled();
    });
});
