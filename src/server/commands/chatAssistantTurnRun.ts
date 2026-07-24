import type { JSONValue, LanguageModelUsage, ModelMessage } from 'ai';
import { eq } from 'drizzle-orm';
import type { ChatAgentFactory } from '../agents/agentChatOptions';
import type { ChatStepArtifact } from '../agents/chatStepArtifact';
import {
    chatStepArtifactClaimFirstMessageId,
    chatStepArtifactCreate,
    chatStepArtifactReasoningOrNull,
    chatStepArtifactReset,
} from '../agents/chatStepArtifact';
import { chatAssistantInputCollectionInputSchema } from '../agents/toolPromptUserForInput';
import type { ChatAssistantInputCollectionInput } from '../agents/toolPromptUserForInput';
import type { ChatAssistantInputSlot } from '../db/chatPayloadTypes';
import {
    chatMessagesAssistantInputCollection,
    chatMessagesAssistantText,
    chatMessagesToolApprovalRequest,
    chatMessagesToolCall,
    chats,
} from '../db/schema';
import type {
    ChatMessageAssistantInputCollectionCreate,
    ChatMessageAssistantTextCreate,
    ChatMessageCreate as ChatMessageRowCreate,
    ChatMessageToolApprovalRequestCreate,
    ChatMessageToolCallCreate,
} from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSChatAssistantOptions, GqlSSession } from '../graphql/generated';
import { chatTitleGenerate } from '../jobs/handlers/chatTitleGenerate';
import { toModelMessages } from '../mappers/toModelMessages';
import { chatMessageFindMany } from '../queries/chatMessageFindMany';
import { chatMessageAppend } from './chatMessageAppend';

// Shared turn-runner: builds the agent, streams or generates, persists every
// tool call (with the `promptUserForInput` branch that becomes an input
// collection), and writes the assistant text row at end-of-stream.
//
// Each persisted message commits in its own short transaction; after commit
// the runner publishes a `ChatUpdateMessageAppended` so subscribers see the
// new message immediately. Streaming publishes `assistantTextChunk` /
// `assistantReasoningChunk` against the *current LLM step's* pre-allocated
// id (`ChatStepArtifact`), which the first tool / approval / collection /
// assistant-text row of that step reuses so the live preview swaps in place.
//
// Two entry points:
// - `chatAssistantTurnRun` — runs one turn synchronously and returns when the
//   agent has produced its final assistant text (or thrown). Takes the
//   pre-built `coreMessages` array; used by tests that want to drive the
//   runner directly without going through the row-load path.
// - `chatAssistantTurnRunDetached` — kicks the turn off on a void promise and
//   returns immediately. Loads `coreMessages` itself (`chatMessageFindMany`
//   then `toModelMessages`) so the three chat commands all share the same
//   one-line "user-side row is durable; now run the agent" call. Bumps
//   `chats.lastModifiedAt` and `chats.contextTokensUsed` after the turn
//   finishes and routes any thrown error to `serverRuntime.log`. Used by
//   `chatMessageCreate`, `chatInputCollectionRespond`, and
//   `chatToolApprovalRespond`.

const PROMPT_USER_FOR_INPUT_TOOL_NAME = 'promptUserForInput';

// Per-step generation metadata shared by every AI-produced variant table.
// `chatMessagesAssistantText`, `chatMessagesToolCall`,
// `chatMessagesAssistantInputCollection`, and `chatMessagesToolApprovalRequest`
// each carry the same six nullable columns; this helper produces the snapshot
// once per `onStepEnd` so a step that fans out into multiple rows records
// identical numbers on each. See "Generation metadata" in
// `docs/architecture/chat-persistence.md`.
type StepGenerationMeta = Pick<
    ChatMessageAssistantTextCreate,
    'modelId' | 'inputTokens' | 'outputTokens' | 'totalTokens' | 'reasoningTokens' | 'cachedInputTokens'
>;

function stepGenerationMeta(step: { usage: LanguageModelUsage; model: { modelId: string } }): StepGenerationMeta {
    const { inputTokens, outputTokens, totalTokens, inputTokenDetails, outputTokenDetails } = step.usage;
    // The AI SDK moved provider-specific token counts into nested detail
    // objects in 5.x — the flat `usage.reasoningTokens` /
    // `usage.cachedInputTokens` aliases are now `@deprecated`. The detail
    // objects themselves are always present per the SDK types; their inner
    // fields stay `undefined` for providers that don't populate them.
    const reasoningTokens = outputTokenDetails.reasoningTokens;
    const cachedInputTokens = inputTokenDetails.cacheReadTokens;
    // Some providers report input/output but omit `totalTokens`; fall back to
    // their sum when both sides are present, otherwise leave it null rather
    // than reporting `0` for an unknown total.
    const totalFallback = totalTokens ?? (inputTokens != null && outputTokens != null ? inputTokens + outputTokens : null);
    return {
        modelId: step.model.modelId,
        inputTokens: inputTokens ?? null,
        outputTokens: outputTokens ?? null,
        totalTokens: totalFallback,
        reasoningTokens: reasoningTokens ?? null,
        cachedInputTokens: cachedInputTokens ?? null,
    };
}

// Step shape `onStepEnd` receives. We only consume three structurally-
// uniform bits (`content`, `toolCalls`, `toolResults`) plus `usage` and
// `model`; the SDK's true type carries a heterogeneous tool-set generic that
// would force every caller to thread it through. Wide structural typing here
// matches the `any` already carried by `AgentChatOptions.onStepEnd` and
// keeps the call sites simple.
export type OnStepEndStep = {
    content: ReadonlyArray<any>;
    toolCalls: ReadonlyArray<{ toolCallId: string; toolName: string; input: unknown }>;
    toolResults: ReadonlyArray<{ toolCallId: string; output: unknown }>;
    usage: LanguageModelUsage;
    model: { modelId: string };
    // AI SDK per-step thought summary (`reasoningText`). Preferred over the
    // stream buffer when stamping `reasoning` onto the first artifact.
    reasoningText?: string | undefined;
};

export interface OnStepEndContext {
    chatId: string;
    generationId: string | null | undefined;
    requestingSession: GqlSSession;
    serverRuntime: ServerRuntime;
    // When the sub-agent of a delegating tool runs, every tool call it makes
    // is persisted with `parentChatMessageId` pointing at the delegate row.
    // Null at the orchestrator level — top-level tool calls have no parent.
    parentChatMessageId: string | null;
    // Tool-call ids the caller has pre-written rows for (today: the delegate
    // tool's own `chatMessagesToolCall` row). The orchestrator's
    // `onStepEnd` must skip them so we don't insert a second row for the
    // same call. The set may be empty.
    preWrittenToolCallIds: ReadonlySet<string>;
    // Shared step anchor for id + reasoning. Orchestrator passes the live
    // stream/generate artifact; nested sub-agents omit it and mint fresh ids
    // (still attaching `step.reasoningText` to the first child row).
    stepArtifact?: ChatStepArtifact;
    // Mutated by the helper: flips to `true` if the step ended on a
    // `promptUserForInput` call. The runner uses this flag after the stream
    // ends to suppress the trailing assistant-text row that would otherwise
    // push the input-collection out of the transcript tail. Only the
    // orchestrator passes a slot for this; sub-agents don't include the tool.
    endedOnPromptForInput?: { value: boolean };
    // Mutated by the helper: caches the most recent step's generation
    // snapshot so the runner can stamp it onto the post-stream
    // `chatMessagesAssistantText` row outside of `onStepEnd`.
    lastStepGeneration?: { value: StepGenerationMeta | null };
}

/** Spine id + optional reasoning for the next row written in this step. */
function stepFirstArtifactFields(
    context: OnStepEndContext,
    step: OnStepEndStep,
    firstOfPersist: { value: boolean },
): { chatMessageId: string; reasoning: string | null } {
    const claimed = chatStepArtifactClaimFirstMessageId(context.stepArtifact);
    if (claimed != null) {
        return {
            chatMessageId: claimed,
            reasoning: chatStepArtifactReasoningOrNull(context.stepArtifact, step.reasoningText),
        };
    }
    if (context.stepArtifact) {
        // Sibling artifact in a step whose first id was already claimed
        // (earlier row or a pre-written delegate).
        return { chatMessageId: crypto.randomUUID(), reasoning: null };
    }
    // Nested sub-agent: no shared stream artifact — first row of this
    // `chatPersistStep` call gets `step.reasoningText`.
    if (firstOfPersist.value) {
        firstOfPersist.value = false;
        return {
            chatMessageId: crypto.randomUUID(),
            reasoning: chatStepArtifactReasoningOrNull(null, step.reasoningText),
        };
    }
    return { chatMessageId: crypto.randomUUID(), reasoning: null };
}

/**
 * Persist every persistable artifact of one `onStepEnd` step:
 *
 * 1. `tool-approval-request` content parts → `chatMessagesToolApprovalRequest`
 *    rows (suspended calls; matching tool-call rows are written later by
 *    `chatToolApprovalRespond`).
 * 2. `promptUserForInput` tool calls → `chatMessagesAssistantInputCollection`
 *    rows (the runner stops the loop after these — see the `hasToolCall`
 *    stop condition on each agent).
 * 3. Other tool calls → `chatMessagesToolCall` rows, stamped with
 *    `parentChatMessageId` from the context.
 *
 * Used by the orchestrator's outer `onStepEnd` (context: top-level,
 * `parentChatMessageId: null`) AND by sub-agents running inside a delegating
 * tool's `execute` (context: parent-pointer set to the delegate row id, and
 * `preWrittenToolCallIds` containing the delegate tool's own call id so the
 * orchestrator's later step doesn't double-insert). See
 * `docs/architecture/agent-delegation.md` ("Nested tool calls").
 */
export async function chatPersistStep(step: OnStepEndStep, context: OnStepEndContext): Promise<void> {
    const { chatId, generationId, requestingSession, serverRuntime, parentChatMessageId, preWrittenToolCallIds } = context;
    const generation = stepGenerationMeta(step);
    if (context.lastStepGeneration) context.lastStepGeneration.value = generation;
    const { db } = serverRuntime;
    const firstOfPersist = { value: true };

    // Phase A — approval requests. When a tool is gated by `needsApproval`,
    // the AI SDK emits a `tool-approval-request` content part instead of
    // executing. Persist a `chatMessagesToolApprovalRequest` row so the UI
    // can render the Approve/Decline card; record the suspended call's
    // `toolCallId` so `chatToolApprovalRespond` can later write a
    // `chatMessagesToolCall` row whose id matches what the agent originally
    // produced.
    //
    // Same pass also surfaces `tool-error` parts to the logger. The AI SDK
    // emits these when a tool's `execute` throws — and **silently** wraps
    // the error as an inert content part. Without this hop the orchestrator
    // sees the error result, narrates a confabulated "tool unreachable"
    // sentence, and nothing reaches `serverRuntime.log`. We do not write a
    // dedicated row for the error (the matching tool-call row from Phase B
    // already exists for the call; its `toolResult` carries the error
    // payload the LLM saw). We just refuse to let it disappear.
    const approvalRequestedToolCallIds = new Set<string>();
    for (const part of step.content) {
        if (part.type === 'tool-error') {
            const errorPart = part as unknown as { toolName?: string; toolCallId?: string; error: unknown };
            const wrapped =
                errorPart.error instanceof Error
                    ? errorPart.error
                    : new Error(
                          `tool-error from ${errorPart.toolName ?? 'unknown'} (toolCallId=${errorPart.toolCallId ?? '?'}): ${
                              typeof errorPart.error === 'string'
                                  ? errorPart.error
                                  : (() => {
                                        try {
                                            return JSON.stringify(errorPart.error);
                                        } catch {
                                            return String(errorPart.error);
                                        }
                                    })()
                          }`,
                      );
            serverRuntime.log.error(wrapped, requestingSession);
            continue;
        }
        if (part.type !== 'tool-approval-request') continue;
        const approvalPart = part as unknown as {
            approvalId: string;
            toolCall: { toolCallId: string; toolName: string; input: unknown };
        };
        const { approvalId, toolCall } = approvalPart;
        approvalRequestedToolCallIds.add(toolCall.toolCallId);
        const { chatMessageId, reasoning } = stepFirstArtifactFields(context, step, firstOfPersist);
        const requestSpine: ChatMessageRowCreate = {
            chatMessageId,
            chatId,
            kind: 'toolApprovalRequest',
            authorUserId: null,
            parentChatMessageId,
            createdAt: new Date(),
        };
        const requestVariant: ChatMessageToolApprovalRequestCreate = {
            chatMessageId: requestSpine.chatMessageId,
            approvalId,
            toolCallId: toolCall.toolCallId,
            toolName: toolCall.toolName,
            toolArgs: toolCall.input as JSONValue,
            reasoning,
            ...generation,
        };
        await chatMessageAppend(db, serverRuntime, generationId, requestSpine, async (transaction) => {
            await transaction.insert(chatMessagesToolApprovalRequest).values(requestVariant);
        });
    }

    // Phase B — regular tool-call persistence. Skip:
    // - calls with a pending approval request (no result yet; the respond
    //   command will write the row when the human decides);
    // - calls whose ids the caller already persisted (today: the delegate
    //   tool, which pre-writes its own row so child rows can FK to it).
    for (const call of step.toolCalls) {
        if (approvalRequestedToolCallIds.has(call.toolCallId)) continue;
        if (preWrittenToolCallIds.has(call.toolCallId)) continue;
        if (call.toolName === PROMPT_USER_FOR_INPUT_TOOL_NAME) {
            if (context.endedOnPromptForInput) context.endedOnPromptForInput.value = true;
            // Validate the LLM-supplied args before persisting. Even
            // with `structuredOutputs: true`, providers can ship
            // malformed args (renamed fields, missing discriminator,
            // ...). A bad call here would produce a row whose `inputs`
            // JSONB returns `undefined` slots from `toGqlChatMessage`,
            // tripping the non-nullable
            // `ChatMessageAssistantInputCollection.inputs` resolver —
            // fail loud instead.
            const parsed = chatAssistantInputCollectionInputSchema.safeParse(call.input);
            if (!parsed.success) {
                serverRuntime.log.error(
                    new Error(`promptUserForInput call rejected: ${parsed.error.message}; raw=${JSON.stringify(call.input)}`),
                    requestingSession,
                );
                continue;
            }
            const { chatMessageId, reasoning } = stepFirstArtifactFields(context, step, firstOfPersist);
            const collectionSpine: ChatMessageRowCreate = {
                chatMessageId,
                chatId,
                kind: 'assistantInputCollection',
                authorUserId: null,
                parentChatMessageId,
                createdAt: new Date(),
            };
            // Slots are persisted with a fresh `inputId` per slot so the
            // eventual `ChatMessageUserInput` answers can key back even
            // if the LLM reorders.
            const collectionVariant: ChatMessageAssistantInputCollectionCreate = {
                chatMessageId: collectionSpine.chatMessageId,
                prompt: parsed.data.prompt,
                inputs: parsed.data.inputs.map(chatAssistantInputSlotPromote),
                mode: parsed.data.mode,
                reasoning,
                ...generation,
            };
            await chatMessageAppend(db, serverRuntime, generationId, collectionSpine, async (transaction) => {
                await transaction.insert(chatMessagesAssistantInputCollection).values(collectionVariant);
            });
            continue;
        }

        const { chatMessageId, reasoning } = stepFirstArtifactFields(context, step, firstOfPersist);
        const toolCallSpine: ChatMessageRowCreate = {
            chatMessageId,
            chatId,
            kind: 'toolCall',
            authorUserId: null,
            parentChatMessageId,
            createdAt: new Date(),
        };
        const matchingResult = step.toolResults.find((r) => r.toolCallId === call.toolCallId);
        const toolCallVariant: ChatMessageToolCallCreate = {
            chatMessageId: toolCallSpine.chatMessageId,
            toolCallId: call.toolCallId,
            toolName: call.toolName,
            toolArgs: call.input as JSONValue,
            toolResult: matchingResult ? (matchingResult.output as JSONValue) : null,
            resultedAt: matchingResult ? new Date() : null,
            reasoning,
            ...generation,
        };
        await chatMessageAppend(db, serverRuntime, generationId, toolCallSpine, async (transaction) => {
            await transaction.insert(chatMessagesToolCall).values(toolCallVariant);
        });
    }
}

interface ChatAssistantTurnRunOptions {
    chatId: string;
    coreMessages: ModelMessage[];
    requestingSession: GqlSSession;
    assistantOptions: GqlSChatAssistantOptions;
    serverRuntime: ServerRuntime;
    // Agent to drive this turn. Picked by the dispatching mutation
    // resolver based on the access path — visitor mutations pass
    // `agentVisitor`, admin mutations pass `agentPersonalAssistant`.
    // See `docs/architecture/chat.md`.
    agentFactory: ChatAgentFactory;
    // Pathname the client was on when the user sent the message
    // (`/projects`, `/en/cv`, `/workspace/projects/abc`, …). Threaded into
    // the agent's system prompt for this turn only — not persisted. Null
    // when the caller can't supply it (server-side tests, response
    // commands that fire from a form submission rather than the composer).
    currentPagePath: string | null;
}

async function chatAssistantTurnRun({
    chatId,
    coreMessages,
    requestingSession,
    assistantOptions,
    serverRuntime,
    agentFactory,
    currentPagePath,
}: ChatAssistantTurnRunOptions): Promise<number | null> {
    const { generationId } = assistantOptions;

    // Per-step artifact: live chunks and the first persisted row of each LLM
    // step share this id. Rotated on AI SDK `start-step` (stream) or after a
    // tool-bearing generate step.
    const stepArtifact = chatStepArtifactCreate();

    let contextTokensUsed: number | null = null;
    try {
        contextTokensUsed = await runAgentTurn({
            chatId,
            coreMessages,
            requestingSession,
            assistantOptions,
            serverRuntime,
            agentFactory,
            stepArtifact,
            currentPagePath,
        });
    } finally {
        // Persist activity timestamp + latest prompt size even when the turn
        // threw after producing steps — the denormalized `contextTokensUsed`
        // is what the workspace composer reads without scanning message
        // variants. Only overwrite when this turn observed a usage snapshot.
        try {
            await serverRuntime.db
                .update(chats)
                .set({
                    lastModifiedAt: new Date(),
                    ...(contextTokensUsed != null ? { contextTokensUsed } : {}),
                })
                .where(eq(chats.chatId, chatId));
        } catch (bumpError) {
            serverRuntime.log.error(bumpError, requestingSession);
        }

        // `TurnEnded` runs on every path out — success, agent throw, downstream
        // publish failure — so the client always tears down its per-turn
        // composer lock + streaming row, even when the turn produced no
        // assistant text. The caller is the failure log of last resort.
        if (generationId) {
            try {
                await serverRuntime.publish.chatUpdates({
                    generationId,
                    payload: { kind: 'turnEnded', generationId },
                });
            } catch (publishError) {
                // A publish failure here is best-effort: the worst case is the
                // client never sees `TurnEnded` and stays locked until the
                // next mount, which is annoying but not data-corrupting.
                serverRuntime.log.error(publishError, requestingSession);
            }
        }
    }
    return contextTokensUsed;
}

interface ChatAssistantTurnRunDetachedOptions {
    chatId: string;
    requestingSession: GqlSSession;
    assistantOptions: GqlSChatAssistantOptions;
    serverRuntime: ServerRuntime;
    // See `ChatAssistantTurnRunOptions.agentFactory`.
    agentFactory: ChatAgentFactory;
    // See `ChatAssistantTurnRunOptions.currentPagePath`.
    currentPagePath: string | null;
}

/**
 * Kick the assistant turn off on a void promise. Returns synchronously so the
 * mutation can resolve as soon as the user-side row is durable; the agent
 * runs detached and emits `TurnEnded` when done.
 *
 * Loads the prior conversation rows itself via `chatMessageFindMany +
 * toModelMessages` — the three chat commands all need the same load + replay
 * step, and re-reading after their own writes is what picks up command-side
 * side-effects (e.g. the synthetic skipped-userInput row `chatMessageCreate`
 * inserts when the user pivots away from a form). After the turn finishes
 * (either path), bumps `chats.lastModifiedAt` (and `contextTokensUsed` when
 * the turn reported usage) so chat lists/sorts and the composer headroom chip
 * reflect the new activity. Any thrown error from the load, the turn, or the
 * timestamp bump is routed to `serverRuntime.log`.
 */
export function chatAssistantTurnRunDetached({
    chatId,
    requestingSession,
    assistantOptions,
    serverRuntime,
    agentFactory,
    currentPagePath,
}: ChatAssistantTurnRunDetachedOptions): void {
    void (async () => {
        try {
            const coreMessages = toModelMessages(await chatMessageFindMany(serverRuntime.db, chatId));
            await chatAssistantTurnRun({
                chatId,
                coreMessages,
                requestingSession,
                assistantOptions,
                serverRuntime,
                agentFactory,
                currentPagePath,
            });
        } catch (turnError) {
            serverRuntime.log.error(turnError, requestingSession);
        }
    })();
}

// Body of the agent turn — extracted so the surrounding `chatAssistantTurnRun`
// can wrap it in the `TurnEnded` publish without nesting indentation.
async function runAgentTurn({
    chatId,
    coreMessages,
    requestingSession,
    assistantOptions,
    serverRuntime,
    agentFactory,
    stepArtifact,
    currentPagePath,
}: ChatAssistantTurnRunOptions & { stepArtifact: ChatStepArtifact }): Promise<number | null> {
    const { generationId } = assistantOptions;
    const { db } = serverRuntime;
    // Every `onStepEnd` step caches its generation snapshot in this slot
    // so the post-stream `assistantText` insert (which runs outside
    // `onStepEnd` for the streaming path) can record the last step's
    // usage. Wrapping the mutable slot in an object dodges the lint check's
    // closure-blind narrowing of a plain `let`-bound `null`. Empty when the
    // turn produced no steps at all (e.g. an immediate agent throw).
    const lastStepGeneration: { value: StepGenerationMeta | null } = { value: null };
    // Tracks whether the turn ended on a `promptUserForInput` tool call. When
    // it did, any text the model produced alongside the call is preamble to a
    // form the user is now expected to fill — persisting it as a trailing
    // `chatMessagesAssistantText` row would push the input-collection out of
    // the tail position and lock the form (see `findLatestCollectionId` in
    // `web/chat/chatTranscript.ts`: only the last message of the transcript is
    // interactive). The streaming preview still surfaces the preamble during
    // the turn; `TurnEnded` clears it client-side.
    const endedOnPromptForInput = { value: false };
    // Mutable set of `toolCallId`s the orchestrator's `onStepEnd` must skip
    // because some tool's `execute` already persisted its own
    // `chatMessagesToolCall` row up front. Every `delegateTo*` tool does
    // this — it pre-writes the row so the sub-agent's child rows have an
    // existing parent to FK against, then mutates this set before returning
    // from `execute`. The orchestrator's later step (which surfaces the
    // delegate call) reads from here. See
    // `docs/architecture/agent-delegation.md` ("Nested tool calls").
    const preWrittenToolCallIds = new Set<string>();
    const agent = await agentFactory({
        session: requestingSession,
        serverRuntime,
        assistantOptions,
        chatId,
        currentPagePath,
        preWrittenToolCallIds,
        stepArtifact,
        // The orchestrator-level `onStepEnd`. All tool-call/approval/input-
        // collection persistence is the shared `chatPersistStep` helper, which
        // also serves sub-agents running inside a delegating tool's `execute`.
        // At this level there is no parent row (top-level tool calls aren't
        // nested) and no pre-written ids unless a `delegateTo*` tool's
        // `execute` pushed onto `preWrittenToolCallIds` before returning.
        onStepEnd: async (step: OnStepEndStep) => {
            await chatPersistStep(step, {
                chatId,
                generationId,
                requestingSession,
                serverRuntime,
                parentChatMessageId: null,
                preWrittenToolCallIds,
                stepArtifact,
                endedOnPromptForInput,
                lastStepGeneration,
            });
            // Generate path has no `start-step` stream parts — rotate after a
            // tool-bearing step so the eventual answer text gets a fresh id.
            // Stream path rotates on `start-step` instead (below).
            if (!generationId && step.toolCalls.length > 0) {
                chatStepArtifactReset(stepArtifact);
            }
        },
    });

    if (generationId) {
        const result = await agent.stream({ messages: coreMessages });
        for await (const part of result.stream) {
            if (part.type === 'start-step') {
                // Fresh id + buffers for this LLM step. The first
                // `start-step` replaces the turn-start mint; later ones
                // follow tool-bearing steps.
                chatStepArtifactReset(stepArtifact);
                continue;
            }
            if (part.type === 'text-delta') {
                stepArtifact.text += part.text;
                await serverRuntime.publish.chatUpdates({
                    generationId,
                    payload: {
                        kind: 'assistantTextChunk',
                        chatMessageId: stepArtifact.messageId,
                        delta: part.text,
                    },
                });
            } else if (part.type === 'reasoning-delta') {
                // Gemini thought summaries (Pro + `includeThoughts`). Keyed
                // on this step's pre-allocated id so the client attaches
                // "Thinking…" to the tool / answer row that reuses it.
                stepArtifact.reasoning += part.text;
                await serverRuntime.publish.chatUpdates({
                    generationId,
                    payload: {
                        kind: 'assistantReasoningChunk',
                        chatMessageId: stepArtifact.messageId,
                        delta: part.text,
                    },
                });
            }
        }
    } else {
        const result = await agent.generate({ messages: coreMessages });
        // Non-stream path: tool rows already carry per-step reasoning from
        // `onStepEnd`. Populate the trailing text-only step's buffers from
        // the generate result when the final step did not emit tools.
        const finalStep = Array.isArray(result.steps) ? result.steps.at(-1) : undefined;
        const finalHadTools = Array.isArray(finalStep?.toolCalls) && finalStep.toolCalls.length > 0;
        if (!finalHadTools) {
            stepArtifact.text = typeof result.text === 'string' ? result.text : '';
            const reasoningText =
                (typeof finalStep?.reasoningText === 'string' && finalStep.reasoningText) ||
                (typeof result.reasoningText === 'string' && result.reasoningText) ||
                '';
            stepArtifact.reasoning = reasoningText;
        }
    }

    // After stream/generate, the answer body and its thoughts are whatever
    // the *current* (last) step buffered. Tool-only final steps leave text
    // empty; `promptUserForInput` turns suppress the insert entirely.
    const assistantText = stepArtifact.text;
    const assistantReasoning = stepArtifact.reasoning;
    const assistantTextMessageId = stepArtifact.messageId;

    // Suppress the trailing assistant-text row when the turn ended on a
    // `promptUserForInput` tool call. The model is coached (in
    // `agentVisitor.buildSystemPrompt`) to narrate briefly before
    // calling the tool, and Gemini emits a few words of preamble in practice.
    // Persisting that preamble would push the freshly-inserted
    // `chatMessagesAssistantInputCollection` row out of the transcript tail,
    // and `findLatestCollectionId` locks any collection that isn't the tail —
    // the user would never see the Submit button. The form's own `prompt` is
    // the framing; the preamble's loss is acceptable.
    //
    // Same skip when this step's id was already claimed by a tool / approval /
    // collection — leftover `text-delta` preamble must not reuse that PK.
    if (assistantText.length > 0 && !endedOnPromptForInput.value && !stepArtifact.firstClaimed) {
        // Claim so a racing persist wouldn't reuse the id (normally unused
        // on a text-only final step).
        chatStepArtifactClaimFirstMessageId(stepArtifact);
        const assistantSpine: ChatMessageRowCreate = {
            chatMessageId: assistantTextMessageId,
            chatId,
            kind: 'assistantText',
            authorUserId: null,
            parentChatMessageId: null,
            createdAt: new Date(),
        };
        // `onStepEnd` for the final step has already run by the time we
        // reach end-of-stream, so `lastStepGeneration.value` reflects the step
        // that produced this text. Falls back to `null` if no step ran (the
        // outer `assistantText.length > 0` guard usually rules that out).
        const generation = lastStepGeneration.value;
        const assistantVariant: ChatMessageAssistantTextCreate = {
            chatMessageId: assistantSpine.chatMessageId,
            body: assistantText,
            reasoning: assistantReasoning.length > 0 ? assistantReasoning : null,
            ...(generation ?? {}),
        };
        await chatMessageAppend(db, serverRuntime, generationId, assistantSpine, async (transaction) => {
            await transaction.insert(chatMessagesAssistantText).values(assistantVariant);
        });

        // Fire-and-forget titler. The handler short-circuits on any
        // non-empty title, so once a real title lands the per-turn
        // enqueue costs one cheap DB read. When the title is still empty
        // and the exchange has no discernible topic yet, the handler
        // leaves it empty and the next turn re-enqueues — see
        // `docs/features/chat-titles.md`.
        serverRuntime.jobs.enqueue(chatTitleGenerate, { chatId }).catch((enqueueError) => {
            serverRuntime.log.error(enqueueError, requestingSession);
        });
    }

    return lastStepGeneration.value?.inputTokens ?? null;
}

// The tool's wire schema is intentionally flat (a `kind` enum + optional
// `options`) so Gemini renders it reliably. Persistence stores the
// discriminated `ChatAssistantInputSlot` shape the rest of the codebase uses;
// this lifts the wire shape into that shape after Zod validation.
function chatAssistantInputSlotPromote(slot: ChatAssistantInputCollectionInput['inputs'][number]): ChatAssistantInputSlot {
    const inputId = crypto.randomUUID();
    const shared = { inputId, prompt: slot.prompt };
    switch (slot.kind) {
        case 'Date':
        case 'DateRange':
        case 'DateTime':
        case 'Time':
        case 'Boolean':
        case 'Text':
        case 'Otp':
            return { ...shared, kind: slot.kind };
        case 'SingleSelect':
        case 'MultiSelect':
            // The wire schema makes `options` optional; require it here so a
            // malformed select fails loud instead of rendering empty chips.
            if (!slot.options || slot.options.length === 0) {
                throw new Error(`promptUserForInput: ${slot.kind} slot is missing required 'options'`);
            }
            return { ...shared, kind: slot.kind, options: slot.options };
    }
}
