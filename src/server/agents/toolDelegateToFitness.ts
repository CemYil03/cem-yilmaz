import type { JSONValue } from 'ai';
import { tool } from 'ai';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { chatPersistStep } from '../commands/chatAssistantTurnRun';
import type { OnStepEndContext, OnStepEndStep } from '../commands/chatAssistantTurnRun';
import { chatMessagesToolCall } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import { agentPersonalAssistantFitness } from './agentPersonalAssistantFitness';
import { DELEGATE_BRIEF_DESCRIBE, summarizeDelegateError, tryParseSubAgentSentinel } from './agentScaffolding';
import { chatDelegateParentPreWrite } from './chatDelegateParentPreWrite';
import type { ChatStepArtifact } from './chatStepArtifact';

// Orchestrator-side tool that delegates a fitness brief to
// `agentPersonalAssistantFitness`. Structural copy of `toolDelegateToNutrition`
// — see the shared write-up in `docs/architecture/agent-delegation.md`.

const delegateToFitnessInputSchema = z.object({
    brief: z.string().min(1).max(2000).describe(DELEGATE_BRIEF_DESCRIBE),
});

interface DelegateToFitnessContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    chatId: string;
    generationId: string | null | undefined;
    preWrittenToolCallIds: Set<string>;
    // Optional — when present, the pre-written parent row reuses this
    // step's live Thinking id + thought summary.
    stepArtifact?: ChatStepArtifact;
}

export function toolDelegateToFitness({
    serverRuntime,
    session,
    chatId,
    generationId,
    preWrittenToolCallIds,
    stepArtifact,
}: DelegateToFitnessContext) {
    return tool({
        description: 'Hand fitness work to the fitness sub-agent — logging workouts, progression questions, exercise catalog, routines.',
        inputSchema: delegateToFitnessInputSchema,
        execute: async (input, { toolCallId }) => {
            const { db } = serverRuntime;
            // Pre-write the delegate row so nested child tool calls have a
            // parent to FK against; result is stamped after the sub-agent runs.
            const parentChatMessageId = await chatDelegateParentPreWrite({
                serverRuntime,
                chatId,
                generationId,
                toolCallId,
                toolName: 'delegateToFitness',
                toolArgs: input as JSONValue,
                preWrittenToolCallIds,
                stepArtifact,
            });

            const childPreWrittenToolCallIds: Set<string> = new Set();
            const childOnStepContext: OnStepEndContext = {
                chatId,
                generationId,
                requestingSession: session,
                serverRuntime,
                parentChatMessageId,
                preWrittenToolCallIds: childPreWrittenToolCallIds,
            };
            const agent = await agentPersonalAssistantFitness({
                session,
                serverRuntime,
                onStepEnd: async (step: OnStepEndStep) => {
                    await chatPersistStep(step, childOnStepContext);
                },
            });

            let toolResult:
                | { status: 'completed'; summary: string }
                | { status: 'needsMoreInfo' | 'noOp'; summary: string; missingFields: string[] }
                | { status: 'failed'; summary: string };
            try {
                const result = await agent.generate({ messages: [{ role: 'user', content: input.brief }] });
                const text = typeof result.text === 'string' ? result.text : '';
                const sentinel = tryParseSubAgentSentinel(text);
                toolResult = sentinel
                    ? { status: sentinel.status, summary: sentinel.summary, missingFields: sentinel.missingFields }
                    : { status: 'completed', summary: text };
            } catch (error) {
                serverRuntime.log.error(error, session);
                toolResult = { status: 'failed', summary: summarizeDelegateError(error) };
            }

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
