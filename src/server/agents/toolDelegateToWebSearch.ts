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

// Orchestrator-side tool that delegates a batch of web-search briefs to
// `agentPersonalAssistantWebSearch`. Runs one sub-agent per brief
// concurrently inside `execute` and returns their written answers back to
// the orchestrator. See `docs/architecture/agent-delegation.md` for the
// delegation pattern and `docs/features/chat-web-search.md` for the
// why-wrap reasoning + the batched-briefs contract.
//
// Same nested-tool-call persistence shape as `toolDelegateToProjects`:
// pre-write a single `chatMessagesToolCall` row up front with
// `toolResult: null`, thread its `chatMessageId` into every sub-agent's
// `onStepEnd` as `parentChatMessageId`, then once the batch settles
// update the row with the aggregated result. The orchestrator's outer
// `onStepEnd` skips the row via the shared `preWrittenToolCallIds` set.
//
// Fan-out is web-search-only. Projects/media stay 1:1 because they carry
// mutation logs and DB-writing state that parallel runs would race on;
// web search is stateless (provider-executed) so N concurrent sub-agents
// are safe. See `docs/architecture/agent-delegation.md`.
//
// Failure surfacing mirrors `toolDelegateToProjects` per-brief: each
// `agent.generate` is wrapped in a try/catch that logs and produces a
// `{ status: 'failed', summary }` entry. `Promise.allSettled` ensures one
// throw does not swallow the surviving briefs. Without the per-brief
// catch an SDK or provider exception would land in the AI SDK's inert
// `tool-error` envelope, the orchestrator would invent an apology, and
// nothing would reach `serverRuntime.log` from this layer.

const delegateToWebSearchInputSchema = z.object({
    briefs: z
        .array(z.string().min(1).max(2000))
        .min(1)
        .max(5)
        .describe(
            [
                'Array of independent, natural-language search briefs. Each brief is handed to its own web-search',
                'sub-agent and they all run in parallel — so batch naturally-parallel questions ("compare X, Y, Z",',
                '"latest on A and B") into one call instead of chaining delegations. Pass a single-item array for a',
                'lone question. Each brief should stand on its own: state what to look up plainly, include the context',
                "(a person's name, a library version, a timeframe) the sub-agent needs to pick a good query. Each",
                'sub-agent runs Google Search grounding and replies with a focused answer plus inline `[title](url)`',
                'citations.',
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

interface WebSearchBriefResult {
    brief: string;
    status: 'completed' | 'failed';
    summary: string;
}

interface WebSearchBatchResult {
    status: 'completed' | 'partial' | 'failed';
    results: WebSearchBriefResult[];
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
            'Hand a batch of independent web-search briefs to web-search sub-agents. Use this for anything',
            'time-sensitive or external — current prices, recent releases, news, library/API docs, library version',
            'status, sports results — that you cannot answer from this prompt or from the workspace data. Pass an',
            'array of natural-language briefs (cap: 5 per call; use a single-item array for a lone question); the',
            'tool spins up one sub-agent per brief, they run Google Search grounding in parallel, and each replies',
            'with an answer plus inline `[title](url)` citations. Prefer one batched call over multiple sequential',
            'ones — batching is why this tool takes an array. Each sub-agent does up to one refinement internally',
            'before giving up, so do NOT chain delegations across turns when one batched call would cover the ground.',
            "The tool result is shaped `{ status: 'completed' | 'partial' | 'failed', results: [{ brief, status,",
            'summary }, ...] }`. `status` is `completed` when every brief succeeded, `failed` when every brief threw,',
            '`partial` when some of each. On per-entry `completed`, narrate or quote `summary` back to the user — its',
            'inline citations are the sources; do not append a separate "Sources:" block. On per-entry `failed`, the',
            'sub-agent or the provider call threw — `summary` carries the one-line error message; tell Cem plainly',
            'which brief failed. Do NOT retry automatically and do NOT invent a softer phrasing like "search is',
            'unavailable".',
            'Do NOT use this for things already in this prompt, workspace data (use `delegateToProjects` for the',
            'project board), or pure reasoning / arithmetic / code questions.',
        ].join(' '),
        inputSchema: delegateToWebSearchInputSchema,
        execute: async (input, { toolCallId }) => {
            const { db } = serverRuntime;
            // Pre-write the delegate row so every sub-agent's child rows have
            // an existing parent to FK against. `toolResult` and `resultedAt`
            // are filled in below after the batch settles.
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

            // Sub-agent persistence — every tool call any sub-agent makes
            // lands as a child row pointing at `parentChatMessageId`. The
            // shared `chatPersistStep` helper does the work; we just bind
            // the context once and share it across all sub-agents in the
            // batch. `childPreWrittenToolCallIds` is a plain `Set`, and
            // concurrent sub-agents mint distinct `toolCallId`s, so
            // parallel `.add()` is safe. The sub-agents have no
            // `promptUserForInput`, so the `endedOnPromptForInput` slot
            // is intentionally absent.
            const childPreWrittenToolCallIds: Set<string> = new Set();
            const childOnStepContext: OnStepEndContext = {
                chatId,
                generationId,
                requestingSession: session,
                serverRuntime,
                parentChatMessageId,
                preWrittenToolCallIds: childPreWrittenToolCallIds,
            };

            // Fan out one sub-agent per brief. `agentPersonalAssistantWebSearch`
            // returns a fresh `ToolLoopAgent` per call, so nothing is shared
            // between concurrent runs. `Promise.allSettled` guarantees one
            // thrown promise cannot swallow the others; per-brief try/catch
            // still runs `serverRuntime.log.error` so nothing goes silent.
            const runOne = async (brief: string): Promise<WebSearchBriefResult> => {
                try {
                    const agent = await agentPersonalAssistantWebSearch({
                        session,
                        serverRuntime,
                        onStepEnd: async (step: OnStepEndStep) => {
                            await chatPersistStep(step, childOnStepContext);
                        },
                    });
                    const result = await agent.generate({ messages: [{ role: 'user', content: brief }] });
                    const text = typeof result.text === 'string' ? result.text : '';
                    return { brief, status: 'completed', summary: text };
                } catch (error) {
                    serverRuntime.log.error(error, session);
                    return { brief, status: 'failed', summary: summarizeError(error) };
                }
            };
            const settled = await Promise.allSettled(input.briefs.map((brief) => runOne(brief)));
            // Every `runOne` catches its own errors and resolves to a
            // `WebSearchBriefResult`, so `settled` is effectively all
            // `fulfilled`. The `rejected` branch is defensive — an error
            // in the try/catch scaffolding itself (impossible in practice)
            // would land here rather than being swallowed.
            const results: WebSearchBriefResult[] = settled.map((entry, index) => {
                if (entry.status === 'fulfilled') return entry.value;
                const brief = input.briefs[index] ?? '';
                serverRuntime.log.error(entry.reason, session);
                return { brief, status: 'failed', summary: summarizeError(entry.reason) };
            });
            const successCount = results.filter((r) => r.status === 'completed').length;
            const batchStatus: WebSearchBatchResult['status'] =
                successCount === results.length ? 'completed' : successCount === 0 ? 'failed' : 'partial';
            const toolResult: WebSearchBatchResult = { status: batchStatus, results };

            // Stamp the aggregated result onto the pre-written row and
            // republish a fresh `messageAppended` so the UI re-renders the
            // now-complete delegate card (with its result available to the
            // tool-args inspector).
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
