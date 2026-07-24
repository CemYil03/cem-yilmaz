import { generateText, Output } from 'ai';
import { and, asc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { chatMessages, chatMessagesAssistantText, chatMessagesUser, chats } from '../../db/schema';
import type { ServerRuntime } from '../../domain/ServerRuntime';
import type { QueuedJobDefinition } from '../types';

// One enqueue per assistant turn while the chat's title is still empty. The
// handler asks a cheap LLM to summarize the first user+assistant exchange
// into a ≤ 6-word title in the conversation's own language. If the exchange
// has no discernible topic (pure greeting) the LLM returns `NONE` and the
// row stays untitled — the next assistant turn re-enqueues and eventually
// converges on a real title as soon as a real topic lands.
//
// The handler is idempotent: it short-circuits on any non-empty title, so
// pg-boss redeliveries and racing enqueues are safe. The final UPDATE also
// carries a `title = ''` guard so a manual rename racing the job wins.
//
// Errors are logged and swallowed. A failed titler must NEVER block the
// chat path.
//
// See `docs/features/chat-titles.md`.

interface ChatTitleGenerateData {
    chatId: string;
}

// The prompt reserves the sentinel `NONE` for "no topic yet". Any other
// response is trimmed and stored.
const NO_TOPIC_SENTINEL = 'NONE';
const MAX_TITLE_LENGTH = 60;
// A pathologically-long "title" is a signal the model ignored the length
// cap and probably narrated a paragraph. Treat those as no-topic too rather
// than persisting a wall of text.
const REJECT_LONGER_THAN = 200;

const TITLE_SCHEMA = z.object({
    title: z
        .string()
        .describe(
            [
                'A ≤ 6-word, ≤ 50-character noun-phrase title in the same language the conversation is being held in.',
                'No quotes, no trailing punctuation, no "Chat about …" framing.',
                'Return exactly the string NONE (no quotes) if the exchange is a pure greeting or has no discernible topic yet.',
            ].join(' '),
        ),
});

const SYSTEM_PROMPT = [
    'You title chat threads. You are given the first user message and the first assistant reply.',
    '',
    'Output exactly one short title that names the topic — a noun phrase, ≤ 6 words, ≤ 50 characters.',
    'Write it in the same language the conversation is being held in (German or English).',
    'No quotes. No trailing punctuation. No "Chat about …" framing. No emoji.',
    '',
    'If the exchange is a pure greeting, a one-liner with no discernible topic, or otherwise reveals nothing to title on,',
    `respond with the single word ${NO_TOPIC_SENTINEL} (uppercase, no quotes).`,
].join('\n');

export const chatTitleGenerate: QueuedJobDefinition<ChatTitleGenerateData> = {
    kind: 'queued',
    name: 'chat-title-generate',
    handler: async ({ data, serverRuntime }) => {
        try {
            await generateChatTitle(data.chatId, serverRuntime);
        } catch (error) {
            // Titler failures must not poison the chat path. Log and move on;
            // the next assistant turn re-enqueues and gets another shot.
            serverRuntime.log.error(error, null);
        }
    },
    options: {
        retryLimit: 2,
        retryDelay: 30,
        expireInSeconds: 60,
    },
};

async function generateChatTitle(chatId: string, serverRuntime: ServerRuntime): Promise<void> {
    // Idempotency + rename-safety. Any non-empty title short-circuits the
    // job: pg-boss redeliveries, racing enqueues from concurrent turns, and
    // future manual renames all skip the LLM call.
    const [chat] = await serverRuntime.db.select({ title: chats.title }).from(chats).where(eq(chats.chatId, chatId)).limit(1);
    if (!chat) {
        serverRuntime.log.warn(`chatTitleGenerate: chat ${chatId} not found (deleted?)`);
        return;
    }
    if (chat.title.trim().length > 0) return;

    // Load the earliest user body + earliest assistant text body. The list
    // is ordered by the spine's createdAt; the first of each kind is the
    // first exchange. Kept minimal on purpose — the titler doesn't need
    // tool calls, approvals, or input collections.
    const firstUser = await serverRuntime.db
        .select({ body: chatMessagesUser.body })
        .from(chatMessages)
        .innerJoin(chatMessagesUser, eq(chatMessagesUser.chatMessageId, chatMessages.chatMessageId))
        .where(and(eq(chatMessages.chatId, chatId), eq(chatMessages.kind, 'user')))
        .orderBy(asc(chatMessages.createdAt))
        .limit(1);
    const firstAssistant = await serverRuntime.db
        .select({ body: chatMessagesAssistantText.body })
        .from(chatMessages)
        .innerJoin(chatMessagesAssistantText, eq(chatMessagesAssistantText.chatMessageId, chatMessages.chatMessageId))
        .where(and(eq(chatMessages.chatId, chatId), eq(chatMessages.kind, 'assistantText')))
        .orderBy(asc(chatMessages.createdAt))
        .limit(1);

    // Both sides required: the assistant reply is what gives us enough
    // signal to title, and if the user message is somehow missing there's
    // nothing to title on. Either shortfall means "try again next turn".
    const userBody = firstUser[0]?.body;
    const assistantBody = firstAssistant[0]?.body;
    if (!userBody || !assistantBody) return;

    const userPrompt = [
        'First user message:',
        userBody,
        '',
        'First assistant reply:',
        assistantBody,
        '',
        `Return the title, or ${NO_TOPIC_SENTINEL}.`,
    ].join('\n');

    const result = await generateText({
        model: serverRuntime.ai.chatTitlerModel(),
        output: Output.object({ schema: TITLE_SCHEMA }),
        system: SYSTEM_PROMPT,
        prompt: userPrompt,
    });

    const rawTitle = result.output.title.trim();

    // `NONE` sentinel, empty output, or a runaway paragraph — leave the
    // row untitled so the next turn's enqueue can retry. The empty-title
    // guard on the UPDATE below already covers the "another turn just
    // wrote a real title" race.
    if (rawTitle.length === 0 || rawTitle.toUpperCase() === NO_TOPIC_SENTINEL || rawTitle.length > REJECT_LONGER_THAN) {
        return;
    }

    // Defensive trim: strip surrounding quotes and trailing punctuation the
    // model may sneak past the prompt constraints, then hard-cap length so
    // a mildly over-budget response still fits the UI's truncate rule.
    const cleaned = rawTitle
        .replace(/^["'`«»„"]+|["'`«»„"]+$/g, '')
        .replace(/[.!?…]+$/g, '')
        .trim()
        .slice(0, MAX_TITLE_LENGTH);
    if (cleaned.length === 0) return;

    // Empty-title guard makes concurrent writes race-safe: a manual rename
    // (once that mutation lands) or an earlier redelivery that already
    // populated the row will make this UPDATE match zero rows, and the
    // job returns without clobbering.
    await serverRuntime.db
        .update(chats)
        .set({ title: cleaned })
        .where(and(eq(chats.chatId, chatId), eq(chats.title, '')));
}
