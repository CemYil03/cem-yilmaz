import type { JSONValue } from 'ai';
import { tool } from 'ai';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { chatPersistStep } from '../commands/chatAssistantTurnRun';
import type { OnStepFinishContext, OnStepFinishStep } from '../commands/chatAssistantTurnRun';
import { chatMessageAppend } from '../commands/chatMessageAppend';
import type { ChatMessageCreate as ChatMessageRowCreate, ChatMessageToolCallCreate } from '../db/schema';
import { chatMessagesToolCall } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import { toGqlChatMessage } from '../mappers/toGqlChatMessage';
import { chatMessageRowLoad } from '../queries/chatMessageRowLoad';
import type { ProjectsAgentMutation, ProjectsAgentMutationLog } from './agentPersonalAssistantProjects';
import { agentPersonalAssistantProjects } from './agentPersonalAssistantProjects';

// Orchestrator-side tool that delegates a project/task brief to
// `agentPersonalAssistantProjects`. Runs the sub-agent in-process inside
// `execute`, returns its summary plus a structured mutation log the
// orchestrator narrates back to the user. See
// `docs/architecture/agent-delegation.md` for the pattern, the trade-offs,
// and the `needsMoreInfo` sentinel contract.
//
// As of the "Nested tool calls" change, the sub-agent's intermediate tool
// calls DO land in the chat transcript: this tool pre-writes its own
// `chatMessagesToolCall` row up front (with `toolResult: null`), threads its
// `chatMessageId` into the sub-agent's `onStepFinish` as `parentChatMessageId`,
// and once the sub-agent finishes updates the row with the result. The
// orchestrator's outer `onStepFinish` is told to skip this same `toolCallId`
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
    // `toolCallId` to this set so the orchestrator's `onStepFinish` skips
    // writing a second row for the call.
    preWrittenToolCallIds: Set<string>;
}

interface NeedsMoreInfoSentinel {
    status: 'needsMoreInfo' | 'noOp';
    missingFields: string[];
    summary: string;
}

export function toolDelegateToProjects({ serverRuntime, session, chatId, generationId, preWrittenToolCallIds }: DelegateToProjectsContext) {
    return tool({
        description: [
            'Hand a project or task instruction to the projects sub-agent. Use this for ANY ask that touches the',
            'workspace projects board or its tasks — listing, creating, updating, archiving, deleting, summarizing',
            'progress, moving tasks between projects. Pass the brief in natural language; the sub-agent has its own',
            'tools and a live snapshot of the board.',
            "The tool result is shaped `{ status: 'completed' | 'needsMoreInfo' | 'noOp', summary, mutations? }`.",
            'On `needsMoreInfo`, call `promptUserForInput` to gather the slots named in `missingFields`, then call',
            'this tool again with the brief enriched by their answers.',
            'On `noOp`, the sub-agent decided the request is not in its domain — fall back to a plain conversational',
            'reply or another tool.',
            'On `completed`, narrate `summary` and (optionally) the `mutations` list back to the user.',
        ].join(' '),
        inputSchema: delegateToProjectsInputSchema,
        execute: async (input, { toolCallId }) => {
            const { db } = serverRuntime;
            // Pre-write the delegate row so the sub-agent's child rows have an
            // existing parent to FK against. `toolResult` and `resultedAt`
            // are filled in below after `agent.generate` resolves; the
            // initial publish goes out from `chatMessageAppend` so the UI
            // can render the parent immediately and stream children into it.
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
                toolName: 'delegateToProjects',
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
            // context. The sub-agent doesn't include `promptUserForInput`,
            // so the `endedOnPromptForInput` slot is intentionally absent.
            const mutations: ProjectsAgentMutationLog = [];
            // Sub-agent tool calls are siblings within this delegation —
            // nothing in this nested scope is "pre-written" by anyone else.
            const childPreWrittenToolCallIds: Set<string> = new Set();
            const childOnStepContext: OnStepFinishContext = {
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
                mutations,
                onStepFinish: async (step: OnStepFinishStep) => {
                    await chatPersistStep(step, childOnStepContext);
                },
            });
            const result = await agent.generate({ messages: [{ role: 'user', content: input.brief }] });
            const text = typeof result.text === 'string' ? result.text : '';

            const sentinel = tryParseSentinel(text);
            const toolResult = sentinel
                ? ({
                      status: sentinel.status,
                      summary: sentinel.summary,
                      missingFields: sentinel.missingFields,
                      mutations,
                  } as const)
                : ({
                      status: 'completed' as const,
                      summary: text,
                      mutations: mutations satisfies ProjectsAgentMutation[],
                  } as const);

            // Stamp the result onto the pre-written row and republish a fresh
            // `ChatUpdateMessageAppended` so the UI re-renders the now-
            // complete delegate card (with its result available to the
            // tool-args inspector). The subscription delivers the same shape
            // a re-fetch would have, so the client's id-keyed merge swaps the
            // partial row for the complete one.
            await db
                .update(chatMessagesToolCall)
                .set({ toolResult: toolResult as unknown as JSONValue, resultedAt: new Date() })
                .where(eq(chatMessagesToolCall.chatMessageId, parentChatMessageId));
            if (generationId) {
                const updatedRow = await chatMessageRowLoad(db, parentChatMessageId);
                if (updatedRow) {
                    await serverRuntime.publish.chatUpdates({
                        generationId,
                        update: { gqlTypeName: 'ChatUpdateMessageAppended', message: toGqlChatMessage(updatedRow) },
                    });
                }
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
