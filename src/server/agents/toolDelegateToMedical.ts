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
    brief: z
        .string()
        .min(1)
        .max(2000)
        .describe(
            [
                "Natural-language instruction for the medical sub-agent. Pass the user's request verbatim plus any",
                'context (record ids from earlier turns, prior conversation about symptoms, timestamps the user',
                'named). The sub-agent has the live medical snapshot in its system prompt — you do not need to',
                'summarize it here.',
            ].join(' '),
        ),
    fileUploadIds: z
        .array(z.uuid())
        .nullish()
        .describe(
            [
                'File-upload ids the user attached to their message this turn. Forward these when the conversation',
                'is health-related and the user included photos (rashes, wounds, lab result screenshots, etc.) —',
                "the sub-agent will attach them to the record it files. You've already seen the bytes on the user",
                "message; describing what's visible briefly in `brief` helps the sub-agent write a good summary.",
            ].join(' '),
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
        description: [
            "Hand a health / appointment instruction to the medical sub-agent. Use for ANY ask that touches Cem's",
            'health journal (symptoms, records, "log this rash", "what should I do about X") or his medical',
            'appointments (scheduling, marking a visit completed, "when is my next dentist visit"). The sub-agent is',
            'a documentarian with gentle triage — do NOT try to answer medical questions yourself even for small',
            'asks; routing every health-adjacent turn through this delegate keeps the disclaimer and the red-flag',
            'rules in one place. Pass the brief in natural language. If the user attached photos or documents to',
            'their message this turn AND the conversation is health-related, pass the `fileUploadIds` through — the',
            'sub-agent will attach them to the record it files. You MAY briefly describe what the photo shows in',
            '`brief` (the sub-agent does not see the bytes; you do).',
            "The tool result is shaped `{ status: 'completed' | 'needsMoreInfo' | 'noOp' | 'failed', summary, missingFields? }`.",
            'On `needsMoreInfo`, call `promptUserForInput` to gather the slots named in `missingFields`, then call',
            'this tool again with the brief enriched by their answers.',
            'On `noOp`, the sub-agent decided the request is not in its domain — fall back to a plain conversational',
            'reply or another tool.',
            'On `completed`, narrate `summary` back to Cem; it names the ids of any rows worth deep-linking. IMPORTANT:',
            'the sub-agent is a documentarian, not a doctor — do NOT enrich its response with your own medical opinion.',
            'On `failed`, the sub-agent or one of its tools threw — `summary` carries the one-line error message.',
            'Tell Cem plainly what failed; do NOT retry automatically.',
        ].join(' '),
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
