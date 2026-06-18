import { eq } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';

import { chatMessages, chatMessagesAssistantInputCollection, chatMessagesUserInput, chats } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import type { GqlSChatAssistantOptions, GqlSUserMutation } from '../graphql/generated';
import { chatAssistantTurnRunDetached } from './chatAssistantTurnRun';
import { chatInputCollectionRespond } from './chatInputCollectionRespond';

// `chatAssistantTurnRunDetached` would call Gemini; mock it as a no-op so the
// test can inspect the userInput-row persistence + publish path in isolation.
vi.mock('./chatAssistantTurnRun', () => ({
    chatAssistantTurnRunDetached: vi.fn(() => undefined),
}));

const streamingAssistantOptions: GqlSChatAssistantOptions = {
    generationId: 'gen-test',
    requireToolCallApprovals: false,
};

interface CollectionInputSeed {
    inputId: string;
    kind: 'Text' | 'Boolean';
    prompt: string;
}

// Seeds a chat with one open `assistantInputCollection` message. Returns the
// ids the test needs to drive `chatInputCollectionRespond` and assert on the
// resulting rows. Uses `commandSetup.withUser` for the session+user; everything
// chat-shaped is its own concern and lives here.
async function seedOpenCollection(input: CollectionInputSeed = { inputId: crypto.randomUUID(), kind: 'Text', prompt: 'When?' }) {
    const setup = await commandSetup.withUser();
    const chatId = crypto.randomUUID();
    const collectionMessageId = crypto.randomUUID();

    await testDb.insert(chats).values({ chatId });
    await testDb.insert(chatMessages).values({
        chatMessageId: collectionMessageId,
        chatId,
        kind: 'assistantInputCollection',
    });
    await testDb.insert(chatMessagesAssistantInputCollection).values({
        chatMessageId: collectionMessageId,
        prompt: input.prompt,
        inputs: [input],
    });

    const parent: GqlSUserMutation = { userId: setup.user.userId } as GqlSUserMutation;
    return { ...setup, parent, chatId, collectionMessageId, inputId: input.inputId };
}

describe('chatInputCollectionRespond', () => {
    it('persists the userInput row and publishes MessageAppended before the assistant turn runs', async () => {
        // Arrange
        const seed = await seedOpenCollection();

        // Act
        const result = await chatInputCollectionRespond(
            seed.parent,
            {
                collectionMessageId: seed.collectionMessageId,
                answers: [{ inputId: seed.inputId, kind: 'String', string: 'Friday' }],
                assistantOptions: streamingAssistantOptions,
            },
            seed.requestingSession,
            seed.serverRuntime,
        );

        // Assert — mutation result
        expect(result).not.toBeNull();
        expect(result!.chatId).toBe(seed.chatId);

        // Assert — userInput rows landed
        const userInputRows = await testDb
            .select()
            .from(chatMessagesUserInput)
            .where(eq(chatMessagesUserInput.chatMessageId, result!.chatMessageId));
        expect(userInputRows).toHaveLength(1);
        expect(userInputRows[0]!.collectionMessageId).toBe(seed.collectionMessageId);

        // Assert — exactly one MessageAppended fired (for the userInput row)
        // and chatAssistantTurnRun was called once.
        const appended = vi
            .mocked(seed.serverRuntime.publish.chatUpdates)
            .mock.calls.map(([args]) => args)
            .filter(({ update }) => update.gqlTypeName === 'ChatUpdateMessageAppended');
        expect(appended).toHaveLength(1);
        expect(appended[0]!.generationId).toBe('gen-test');
        const message = (appended[0]!.update as { message: { gqlTypeName: string; chatMessageId: string } }).message;
        expect(message.gqlTypeName).toBe('ChatMessageUserInput');
        expect(message.chatMessageId).toBe(result!.chatMessageId);

        expect(chatAssistantTurnRunDetached).toHaveBeenCalledTimes(1);
    });

    it('persists an empty-answers row when the user clicks Skip', async () => {
        // Arrange — same seed; the explicit Skip click submits with `answers: []`.
        const seed = await seedOpenCollection();

        // Act
        const result = await chatInputCollectionRespond(
            seed.parent,
            {
                collectionMessageId: seed.collectionMessageId,
                answers: [],
                assistantOptions: streamingAssistantOptions,
            },
            seed.requestingSession,
            seed.serverRuntime,
        );

        // Assert — a userInput row was written with no answers and the
        // assistant turn was kicked off; toModelMessages turns this into
        // `{ status: 'skipped', answers: [] }` for the LLM.
        expect(result).not.toBeNull();
        const userInputRows = await testDb
            .select()
            .from(chatMessagesUserInput)
            .where(eq(chatMessagesUserInput.collectionMessageId, seed.collectionMessageId));
        expect(userInputRows).toHaveLength(1);
        expect(userInputRows[0]!.answers).toEqual([]);
        expect(chatAssistantTurnRunDetached).toHaveBeenCalledTimes(1);
    });

    it('refuses to write a second userInput for the same collection', async () => {
        // Arrange — seed and submit a first answer so the collection is closed.
        const seed = await seedOpenCollection();
        const first = await chatInputCollectionRespond(
            seed.parent,
            {
                collectionMessageId: seed.collectionMessageId,
                answers: [{ inputId: seed.inputId, kind: 'String', string: 'Friday' }],
                assistantOptions: streamingAssistantOptions,
            },
            seed.requestingSession,
            seed.serverRuntime,
        );
        expect(first).not.toBeNull();
        expect(chatAssistantTurnRunDetached).toHaveBeenCalledTimes(1);

        // Act — a second submit against the now-answered collection.
        const second = await chatInputCollectionRespond(
            seed.parent,
            {
                collectionMessageId: seed.collectionMessageId,
                answers: [{ inputId: seed.inputId, kind: 'String', string: 'Saturday' }],
                assistantOptions: streamingAssistantOptions,
            },
            seed.requestingSession,
            seed.serverRuntime,
        );

        // Assert — the second call returns null, leaves a single userInput
        // row in place, and does not kick off a second assistant turn.
        expect(second).toBeNull();
        const userInputRows = await testDb
            .select()
            .from(chatMessagesUserInput)
            .where(eq(chatMessagesUserInput.collectionMessageId, seed.collectionMessageId));
        expect(userInputRows).toHaveLength(1);
        expect(chatAssistantTurnRunDetached).toHaveBeenCalledTimes(1);
    });

    it('lifts a Boolean answer into the discriminated payload shape', async () => {
        // Arrange — collection with a Boolean slot.
        const seed = await seedOpenCollection({ inputId: crypto.randomUUID(), kind: 'Boolean', prompt: 'Window seat?' });

        // Act
        const result = await chatInputCollectionRespond(
            seed.parent,
            {
                collectionMessageId: seed.collectionMessageId,
                answers: [{ inputId: seed.inputId, kind: 'Boolean', boolean: true }],
                assistantOptions: streamingAssistantOptions,
            },
            seed.requestingSession,
            seed.serverRuntime,
        );

        // Assert — the JSONB answer carries the lifted discriminated shape.
        expect(result).not.toBeNull();
        const userInputRows = await testDb
            .select()
            .from(chatMessagesUserInput)
            .where(eq(chatMessagesUserInput.chatMessageId, result!.chatMessageId));
        expect(userInputRows).toHaveLength(1);
        expect(userInputRows[0]!.answers).toEqual([{ inputId: seed.inputId, value: { kind: 'Boolean', value: true } }]);
    });
});
