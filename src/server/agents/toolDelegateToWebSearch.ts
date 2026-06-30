import type { JSONValue } from 'ai';
import { tool } from 'ai';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { chatPersistStep } from '../commands/chatAssistantTurnRun';
import type { OnStepEndContext, OnStepEndStep } from '../commands/chatAssistantTurnRun';
import { chatMessageAppend } from '../commands/chatMessageAppend';
import type { ChatMessageCreate as ChatMessageRowCreate, ChatMessageToolCallCreate } from '../db/schema';
import { chatMessagesToolCall } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import { agentPersonalAssistantWebSearch } from './agentPersonalAssistantWebSearch';

// Orchestrator-side tool that delegates a web-search brief to
// `agentPersonalAssistantWebSearch`. Runs the sub-agent in-process inside
// `execute` and returns its written answer to the orchestrator. See
// `docs/architecture/agent-delegation.md` for the pattern and
// `docs/features/chat-web-search.md` for the why-wrap reasoning.
//
// Same nested-tool-call persistence shape as `toolDelegateToProjects`:
// pre-write a `chatMessagesToolCall` row up front with `toolResult: null`,
// thread its `chatMessageId` into the sub-agent's `onStepEnd` as
// `parentChatMessageId`, then once the sub-agent finishes update the row
// with the result. The orchestrator's outer `onStepEnd` skips the row via
// the shared `preWrittenToolCallIds` set.
//
// Failure surfacing also mirrors `toolDelegateToProjects`: `agent.generate`
// is wrapped in a try/catch that logs and returns `{ status: 'failed',
// summary }`. Without it, an SDK or provider exception would land in the
// AI SDK's inert `tool-error` envelope, the orchestrator would invent an
// apology, and nothing would reach `serverRuntime.log` from this layer.

const delegateToWebSearchInputSchema = z.object({
    brief: z
        .string()
        .min(1)
        .max(2000)
        .describe(
            [
                'Natural-language search brief for the web-search sub-agent. State what to look up plainly — the sub-agent',
                'will pick a query, run a Google search via grounding, and reply with a focused answer plus inline',
                "`[title](url)` citations. Pass relevant context (a person's name, a library version, a timeframe) so the",
                'sub-agent can refine the query without a second round.',
            ].join(' '),
        ),
});

interface DelegateToWebSearchContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    // Threaded through from `agentPersonalAssistant` so the delegate row
    // (and every nested sub-agent tool-call row) lands in the right
    // conversation.
    chatId: string;
    generationId: string | null | undefined;
    // Shared with `chatAssistantTurnRun`. The delegate tool adds its own
    // `toolCallId` to this set so the orchestrator's `onStepEnd` skips
    // writing a second row for the call.
    preWrittenToolCallIds: Set<string>;
}

// Same one-line summary shape used by `toolDelegateToProjects` for its
// `failed` status. Keeping the helper local (rather than reaching across
// to the other delegate file) keeps each delegate file self-contained.
function summarizeError(error: unknown): string {
    if (error instanceof Error) {
        const message = error.message.trim();
        if (message) return message.split('\n')[0]?.slice(0, 500) ?? 'unknown error';
    }
    if (typeof error === 'string' && error.trim()) return error.trim().slice(0, 500);
    return 'unknown error';
}

export function toolDelegateToWebSearch({
    serverRuntime,
    session,
    chatId,
    generationId,
    preWrittenToolCallIds,
}: DelegateToWebSearchContext) {
    return tool({
        description: [
            'Hand a web-search brief to the web-search sub-agent. Use this for anything time-sensitive or external —',
            'current prices, recent releases, news, library/API docs, library version status, sports results — that',
            'you cannot answer from this prompt or from the workspace data. Pass the brief in natural language; the',
            'sub-agent owns the query, runs Google Search grounding, and replies with an answer plus inline',
            '`[title](url)` citations.',
            "The tool result is shaped `{ status: 'completed' | 'failed', summary }`.",
            'On `completed`, narrate or quote `summary` back to the user — the inline citations in `summary` are the',
            'sources; do not append a separate "Sources:" block.',
            'On `failed`, the sub-agent or the provider call threw — `summary` carries the one-line error message.',
            'Tell Cem plainly what failed; do NOT retry automatically and do NOT invent a softer phrasing like',
            '"search is unavailable".',
            'Do NOT use this for things already in this prompt, workspace data (use `delegateToProjects` for the',
            'project board), or pure reasoning / arithmetic / code questions. One delegation per turn is usually',
            'enough.',
        ].join(' '),
        inputSchema: delegateToWebSearchInputSchema,
        execute: async (input, { toolCallId }) => {
            const { db } = serverRuntime;
            // Pre-write the delegate row so the sub-agent's child rows have an
            // existing parent to FK against. `toolResult` and `resultedAt`
            // are filled in below after `agent.generate` resolves.
            const parentChatMessageId = crypto.randomUUID();
            const parentSpine: ChatMessageRowCreate = {
                chatMessageId: parentChatMessageId,
                chatId,
                kind: 'toolCall',
                authorUserId: null,
                parentChatMessageId: null,
                createdAt: new Date(),
            };
            const parentVariant: ChatMessageToolCallCreate = {
                chatMessageId: parentChatMessageId,
                toolCallId,
                toolName: 'delegateToWebSearch',
                toolArgs: input as JSONValue,
                toolResult: null,
                resultedAt: null,
            };
            await chatMessageAppend(db, serverRuntime, generationId, parentSpine, async (transaction) => {
                await transaction.insert(chatMessagesToolCall).values(parentVariant);
            });
            preWrittenToolCallIds.add(toolCallId);

            // Sub-agent persistence — every tool call it makes lands as a
            // child row pointing at `parentChatMessageId`. The shared
            // `chatPersistStep` helper does the work; we just bind the
            // context. The sub-agent has no `promptUserForInput`, so the
            // `endedOnPromptForInput` slot is intentionally absent.
            const childPreWrittenToolCallIds: Set<string> = new Set();
            const childOnStepContext: OnStepEndContext = {
                chatId,
                generationId,
                requestingSession: session,
                serverRuntime,
                parentChatMessageId,
                preWrittenToolCallIds: childPreWrittenToolCallIds,
            };
            const agent = await agentPersonalAssistantWebSearch({
                session,
                serverRuntime,
                onStepEnd: async (step: OnStepEndStep) => {
                    await chatPersistStep(step, childOnStepContext);
                },
            });

            // Same try/catch shape as `toolDelegateToProjects` — see that
            // file's comment block. Any throw from the sub-agent run lands
            // in `serverRuntime.log.error` here and is surfaced to the
            // orchestrator as a structured `failed` result.
            let toolResult: { status: 'completed' | 'failed'; summary: string };
            try {
                const result = await agent.generate({ messages: [{ role: 'user', content: input.brief }] });
                const text = typeof result.text === 'string' ? result.text : '';
                toolResult = { status: 'completed', summary: text };
            } catch (error) {
                serverRuntime.log.error(error, session);
                toolResult = { status: 'failed', summary: summarizeError(error) };
            }

            // Stamp the result onto the pre-written row and republish a fresh
            // `messageAppended` so the UI re-renders the now-complete delegate
            // card (with its result available to the tool-args inspector).
            await db
                .update(chatMessagesToolCall)
                .set({ toolResult: toolResult as unknown as JSONValue, resultedAt: new Date() })
                .where(eq(chatMessagesToolCall.chatMessageId, parentChatMessageId));
            if (generationId) {
                await serverRuntime.publish.chatUpdates({
                    generationId,
                    payload: { kind: 'messageAppended', chatMessageId: parentChatMessageId },
                });
            }

            return toolResult;
        },
    });
}
