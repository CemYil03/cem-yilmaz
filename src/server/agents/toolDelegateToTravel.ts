import type { JSONValue } from 'ai';
import { tool } from 'ai';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { chatPersistStep } from '../commands/chatAssistantTurnRun';
import type { OnStepEndContext, OnStepEndStep } from '../commands/chatAssistantTurnRun';
import { chatMessagesToolCall } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import { agentPersonalAssistantTravel } from './agentPersonalAssistantTravel';
import type { ChatStepArtifact } from './chatStepArtifact';
import { chatDelegateParentPreWrite } from './chatDelegateParentPreWrite';

// Orchestrator-side tool that delegates a trip / itinerary / packing brief
// to `agentPersonalAssistantTravel`. Mirrors `toolDelegateToMedia` exactly —
// see the shared write-up in `docs/architecture/agent-delegation.md`.

const delegateToTravelInputSchema = z.object({
    brief: z
        .string()
        .min(1)
        .max(2000)
        .describe(
            [
                "Natural-language instruction for the travel sub-agent. Pass the user's request verbatim plus any",
                'context (trip ids from earlier turns, dates the user named). The sub-agent has the live travel',
                "snapshot in its system prompt — you don't need to summarize it here.",
            ].join(' '),
        ),
});

interface DelegateToTravelContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    chatId: string;
    generationId: string | null | undefined;
    preWrittenToolCallIds: Set<string>;
    // Optional — when present, the pre-written parent row reuses this
    // step's live Thinking id + thought summary.
    stepArtifact?: ChatStepArtifact;
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

export function toolDelegateToTravel({
    serverRuntime,
    session,
    chatId,
    generationId,
    preWrittenToolCallIds,
    stepArtifact,
}: DelegateToTravelContext) {
    return tool({
        description: [
            'Hand a travel instruction to the travel sub-agent. Use for ANY ask that touches trip planning — creating',
            'trips, drafting day-by-day itineraries, adding or editing activities, managing the per-trip packing',
            'checklist, marking items packed. Pass the brief in natural language. This is the durable-plan path: the',
            'sub-agent writes the itinerary to Postgres so a future chat can read it back without replaying this',
            'conversation. Do NOT try to draft an itinerary in plain chat and expect it to persist — always delegate.',
            "The tool result is shaped `{ status: 'completed' | 'needsMoreInfo' | 'noOp' | 'failed', summary, missingFields? }`.",
            'On `needsMoreInfo`, call `promptUserForInput` to gather the slots named in `missingFields`, then call',
            'this tool again with the brief enriched by their answers.',
            'On `noOp`, the sub-agent decided the request is not in its domain — fall back to a plain conversational',
            'reply or another tool.',
            'On `completed`, narrate `summary` back to the user; it names the ids of any rows worth deep-linking.',
            'On `failed`, the sub-agent or one of its tools threw — `summary` carries the one-line error message.',
            'Tell Cem plainly what failed; do NOT retry automatically and do NOT confabulate softer phrasings.',
        ].join(' '),
        inputSchema: delegateToTravelInputSchema,
        execute: async (input, { toolCallId }) => {
            const { db } = serverRuntime;
            // Pre-write the delegate row so nested child tool calls have a
            // parent to FK against; result is stamped after the sub-agent runs.
            const parentChatMessageId = await chatDelegateParentPreWrite({
                serverRuntime,
                chatId,
                generationId,
                toolCallId,
                toolName: 'delegateToTravel',
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
            const agent = await agentPersonalAssistantTravel({
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
