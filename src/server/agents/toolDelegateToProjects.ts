import type { JSONValue } from 'ai';
import { tool } from 'ai';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { chatPersistStep } from '../commands/chatAssistantTurnRun';
import type { OnStepEndContext, OnStepEndStep } from '../commands/chatAssistantTurnRun';
import { chatMessagesToolCall } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import { agentPersonalAssistantProjects } from './agentPersonalAssistantProjects';
import { chatDelegateParentPreWrite } from './chatDelegateParentPreWrite';
import type { ChatStepArtifact } from './chatStepArtifact';

// Orchestrator-side tool that delegates a project/task brief to
// `agentPersonalAssistantProjects`. Runs the sub-agent in-process inside
// `execute`, returns its summary the orchestrator narrates back to the user.
// See `docs/architecture/agent-delegation.md` for the pattern, the
// trade-offs, and the `needsMoreInfo` sentinel contract.
//
// As of the "Nested tool calls" change, the sub-agent's intermediate tool
// calls DO land in the chat transcript: this tool pre-writes its own
// `chatMessagesToolCall` row up front (with `toolResult: null`), threads its
// `chatMessageId` into the sub-agent's `onStepEnd` as `parentChatMessageId`,
// and once the sub-agent finishes updates the row with the result. The
// orchestrator's outer `onStepEnd` is told to skip this same `toolCallId`
// via the shared `preWrittenToolCallIds` set so we don't insert a duplicate.

const delegateToProjectsInputSchema = z.object({
    brief: z
        .string()
        .min(1)
        .max(2000)
        .describe(
            [
                "Natural-language instruction for the projects sub-agent. Pass the user's request verbatim plus any context",
                'you have collected (project ids referenced in earlier turns, dates the user named). The sub-agent has the',
                "live project board in its system prompt — you don't need to summarize it here.",
            ].join(' '),
        ),
});

interface DelegateToProjectsContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    // Threaded through from `agentPersonalAssistant` so the delegate row
    // (and every nested sub-agent tool-call row) lands in the right
    // conversation. Both are required at construction — there is no
    // non-chat path that constructs this tool.
    chatId: string;
    generationId: string | null | undefined;
    // Shared with `chatAssistantTurnRun`. The delegate tool adds its own
    // `toolCallId` to this set so the orchestrator's `onStepEnd` skips
    // writing a second row for the call.
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

// Best-effort one-line summary for the orchestrator + transcript when the
// sub-agent throws. Strips stack noise so the rendered tool-result card
// stays readable; the full error already lands in `serverRuntime.log` via
// the catch below.
function summarizeError(error: unknown): string {
    if (error instanceof Error) {
        const message = error.message.trim();
        if (message) return message.split('\n')[0]?.slice(0, 500) ?? 'unknown error';
    }
    if (typeof error === 'string' && error.trim()) return error.trim().slice(0, 500);
    return 'unknown error';
}

export function toolDelegateToProjects({
    serverRuntime,
    session,
    chatId,
    generationId,
    preWrittenToolCallIds,
    stepArtifact,
}: DelegateToProjectsContext) {
    return tool({
        description: [
            'Hand a project or task instruction to the projects sub-agent. Use this for ANY ask that touches the',
            'workspace projects board or its tasks — listing, creating, updating, archiving, deleting, summarizing',
            'progress, moving tasks between projects. Pass the brief in natural language; the sub-agent has its own',
            'tools and a live snapshot of the board.',
            "The tool result is shaped `{ status: 'completed' | 'needsMoreInfo' | 'noOp' | 'failed', summary, missingFields? }`.",
            'On `needsMoreInfo`, call `promptUserForInput` to gather the slots named in `missingFields`, then call',
            'this tool again with the brief enriched by their answers.',
            'On `noOp`, the sub-agent decided the request is not in its domain — fall back to a plain conversational',
            'reply or another tool.',
            'On `completed`, narrate `summary` back to the user; it names the ids of any rows worth deep-linking.',
            'On `failed`, the sub-agent or one of its tools threw — `summary` carries the one-line error message.',
            'Tell Cem plainly what failed; do NOT retry the same brief automatically and do NOT confabulate softer',
            'phrasings like "the tool is unreachable" — the failure is real and the message in `summary` is the truth of it.',
        ].join(' '),
        inputSchema: delegateToProjectsInputSchema,
        execute: async (input, { toolCallId }) => {
            const { db } = serverRuntime;
            // Pre-write the delegate row so nested child tool calls have a
            // parent to FK against; result is stamped after the sub-agent runs.
            const parentChatMessageId = await chatDelegateParentPreWrite({
                serverRuntime,
                chatId,
                generationId,
                toolCallId,
                toolName: 'delegateToProjects',
                toolArgs: input as JSONValue,
                preWrittenToolCallIds,
                stepArtifact,
            });

            // Sub-agent persistence — every tool call it makes lands as a
            // child row pointing at `parentChatMessageId`. The shared
            // `chatPersistStep` helper does the work; we just bind the
            // context. The sub-agent doesn't include `promptUserForInput`,
            // so the `endedOnPromptForInput` slot is intentionally absent.
            //
            // Sub-agent tool calls are siblings within this delegation —
            // nothing in this nested scope is "pre-written" by anyone else.
            const childPreWrittenToolCallIds: Set<string> = new Set();
            const childOnStepContext: OnStepEndContext = {
                chatId,
                generationId,
                requestingSession: session,
                serverRuntime,
                parentChatMessageId,
                preWrittenToolCallIds: childPreWrittenToolCallIds,
            };
            const agent = await agentPersonalAssistantProjects({
                session,
                serverRuntime,
                onStepEnd: async (step: OnStepEndStep) => {
                    await chatPersistStep(step, childOnStepContext);
                },
            });

            // Wrap the full sub-agent run in a try/catch so a throw from any
            // step (provider call, schema validation, mutation command) is
            // logged at the delegate layer and surfaced to the orchestrator as
            // a structured `failed` result instead of vanishing into the AI
            // SDK's tool-error envelope. Without this catch the orchestrator
            // sees an opaque error from the SDK, narrates "the tool is
            // unreachable", and nothing reaches `serverRuntime.log.error` from
            // this layer — see `docs/architecture/agent-delegation.md`
            // ("Sub-agent failure isolates to its turn").
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

            // Stamp the result onto the pre-written row and republish a fresh
            // `messageAppended` so the UI re-renders the now-complete delegate
            // card (with its result available to the tool-args inspector). The
            // subscription resolver re-loads via `chatMessageRowLoad` so the
            // shape that reaches the client matches a re-fetch.
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

// The sub-agent is coached to emit JSON-only as its final text when it
// cannot complete the brief. Accept the bare object or a fenced ```json
// block defensively — Gemini occasionally wraps things even when told not to.
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
