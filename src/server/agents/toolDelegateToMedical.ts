import type { JSONValue } from 'ai';
import { tool } from 'ai';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { chatPersistStep } from '../commands/chatAssistantTurnRun';
import type { OnStepEndContext, OnStepEndStep } from '../commands/chatAssistantTurnRun';
import { chatMessagesToolCall } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import { agentPersonalAssistantMedical } from './agentPersonalAssistantMedical';
import { DELEGATE_BRIEF_DESCRIBE } from './agentScaffolding';
import { chatDelegateParentPreWrite } from './chatDelegateParentPreWrite';
import type { ChatStepArtifact } from './chatStepArtifact';

// Orchestrator-side tool that delegates a health / appointment brief to
// `agentPersonalAssistantMedical`. Mirrors `toolDelegateToMedia` exactly —
// see the shared write-up in `docs/architecture/agent-delegation.md`.
//
// The one meaningful addition over `toolDelegateToMedia`: an optional
// `fileUploadIds` field. When Cem drops a photo into the chat composer,
// the orchestrator sees it as a `FilePart` on the user message (via
// `toModelMessages`), and forwards the corresponding upload ids here so
// the sub-agent can attach them atomically via
// `medicalRecordsUpsert.fileUploadIds`.

const delegateToMedicalInputSchema = z.object({
    brief: z.string().min(1).max(2000).describe(DELEGATE_BRIEF_DESCRIBE),
    fileUploadIds: z
        .array(z.uuid())
        .nullish()
        .describe(
            'Photo/document upload ids from this turn. Forward on health asks; briefly describe what is visible in `brief` (sub-agent does not see bytes).',
        ),
});

interface DelegateToMedicalContext {
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

export function toolDelegateToMedical({
    serverRuntime,
    session,
    chatId,
    generationId,
    preWrittenToolCallIds,
    stepArtifact,
}: DelegateToMedicalContext) {
    return tool({
        description:
            'Hand health/appointment work to the medical sub-agent — journal, symptoms, appointments. Route every health-adjacent ask here (disclaimer + red flags). Forward `fileUploadIds` when photos were attached; do not add your own medical opinion to the result.',
        inputSchema: delegateToMedicalInputSchema,
        execute: async (input, { toolCallId }) => {
            const { db } = serverRuntime;
            // Pre-write the delegate row so nested child tool calls have a
            // parent to FK against; result is stamped after the sub-agent runs.
            const parentChatMessageId = await chatDelegateParentPreWrite({
                serverRuntime,
                chatId,
                generationId,
                toolCallId,
                toolName: 'delegateToMedical',
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
            const agent = await agentPersonalAssistantMedical({
                session,
                serverRuntime,
                onStepEnd: async (step: OnStepEndStep) => {
                    await chatPersistStep(step, childOnStepContext);
                },
            });

            // The sub-agent sees the brief and, if any, an inline list of
            // file-upload ids the orchestrator forwarded. The bytes stay on
            // the orchestrator's user message; the sub-agent only needs the
            // ids to write the join row via `medicalRecordsUpsert.fileUploadIds`.
            const enrichedBrief =
                (input.fileUploadIds ?? []).length > 0
                    ? `${input.brief}\n\nAttached files (fileUploadIds): ${(input.fileUploadIds ?? []).join(', ')}`
                    : input.brief;

            let toolResult:
                | { status: 'completed'; summary: string }
                | { status: 'needsMoreInfo' | 'noOp'; summary: string; missingFields: string[] }
                | { status: 'failed'; summary: string };
            try {
                const result = await agent.generate({ messages: [{ role: 'user', content: enrichedBrief }] });
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
