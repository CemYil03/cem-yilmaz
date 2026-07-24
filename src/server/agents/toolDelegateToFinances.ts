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
import { agentPersonalAssistantFinances } from './agentPersonalAssistantFinances';

// Orchestrator-side tool that delegates a recurring-cost / income brief to
// `agentPersonalAssistantFinances`. Mirrors `toolDelegateToTravel` exactly —
// see the shared write-up in `docs/architecture/agent-delegation.md`.

const delegateToFinancesInputSchema = z.object({
    brief: z
        .string()
        .min(1)
        .max(2000)
        .describe(
            [
                "Natural-language instruction for the finances sub-agent. Pass the user's request verbatim plus any",
                'context (cost ids from earlier turns, amounts and periods the user named). The sub-agent has the live',
                "finances snapshot in its system prompt — you don't need to summarize it here.",
            ].join(' '),
        ),
});

interface DelegateToFinancesContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    chatId: string;
    generationId: string | null | undefined;
    preWrittenToolCallIds: Set<string>;
}

interface NeedsMoreInfoSentinel {
    status: 'needsMoreInfo' | 'noOp';
    missingFields: string[];
    summary: string;
}

function summarizeError(error: unknown): string {
    if (error instanceof Error) {
        const message = error.message.trim();
        if (message) return message.split('\n')[0]?.slice(0, 500) ?? 'unknown error';
    }
    if (typeof error === 'string' && error.trim()) return error.trim().slice(0, 500);
    return 'unknown error';
}

export function toolDelegateToFinances({ serverRuntime, session, chatId, generationId, preWrittenToolCallIds }: DelegateToFinancesContext) {
    return tool({
        description: [
            'Hand a finances instruction to the finances sub-agent. Use for ANY ask that touches income streams,',
            'recurring costs, or wealth assets — adding, editing, pausing, repricing, or deleting salary / freelance',
            '/ other income, a recurring expense / subscription (rent, insurance, streaming, transport, utilities, …),',
            'or a Tagesgeld / ETF / stock / Bauspar position (with a location label like TradeRepublic or Chase).',
            'Pass the brief',
            'in natural language including the amount and period the user named. This is the durable path: the',
            'sub-agent writes to Postgres so the finances page and totals update. Do NOT try to "note" a cost or',
            'income in plain chat and expect it to persist — always delegate.',
            "The tool result is shaped `{ status: 'completed' | 'needsMoreInfo' | 'noOp' | 'failed', summary, missingFields? }`.",
            'On `needsMoreInfo`, call `promptUserForInput` to gather the slots named in `missingFields` (most often the',
            'amount), then call this tool again with the brief enriched by their answers.',
            'On `noOp`, the sub-agent decided the request is not in its domain — fall back to a plain conversational',
            'reply or another tool.',
            'On `completed`, narrate `summary` back to the user; it names the ids of any rows worth deep-linking.',
            'On `failed`, the sub-agent or one of its tools threw — `summary` carries the one-line error message.',
            'Tell Cem plainly what failed; do NOT retry automatically and do NOT confabulate softer phrasings.',
        ].join(' '),
        inputSchema: delegateToFinancesInputSchema,
        execute: async (input, { toolCallId }) => {
            const { db } = serverRuntime;
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
                toolName: 'delegateToFinances',
                toolArgs: input as JSONValue,
                toolResult: null,
                resultedAt: null,
            };
            await chatMessageAppend(db, serverRuntime, generationId, parentSpine, async (transaction) => {
                await transaction.insert(chatMessagesToolCall).values(parentVariant);
            });
            preWrittenToolCallIds.add(toolCallId);

            const childPreWrittenToolCallIds: Set<string> = new Set();
            const childOnStepContext: OnStepEndContext = {
                chatId,
                generationId,
                requestingSession: session,
                serverRuntime,
                parentChatMessageId,
                preWrittenToolCallIds: childPreWrittenToolCallIds,
            };
            const agent = await agentPersonalAssistantFinances({
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
                const sentinel = tryParseSentinel(text);
                toolResult = sentinel
                    ? {
                          status: sentinel.status,
                          summary: sentinel.summary,
                          missingFields: sentinel.missingFields,
                      }
                    : {
                          status: 'completed',
                          summary: text,
                      };
            } catch (error) {
                serverRuntime.log.error(error, session);
                toolResult = {
                    status: 'failed',
                    summary: summarizeError(error),
                };
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

function tryParseSentinel(text: string): NeedsMoreInfoSentinel | null {
    const trimmed = text.trim();
    if (!trimmed) return null;

    const candidates = [trimmed];
    const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch?.[1]) candidates.push(fenceMatch[1].trim());

    for (const candidate of candidates) {
        if (!candidate.startsWith('{')) continue;
        try {
            const parsed = JSON.parse(candidate);
            if (parsed && typeof parsed === 'object' && (parsed.status === 'needsMoreInfo' || parsed.status === 'noOp')) {
                const missingFields = Array.isArray(parsed.missingFields)
                    ? parsed.missingFields.filter((field: unknown): field is string => typeof field === 'string')
                    : [];
                const summary = typeof parsed.summary === 'string' ? parsed.summary : '';
                return { status: parsed.status, missingFields, summary };
            }
        } catch {
            // not JSON — keep looking
        }
    }
    return null;
}
