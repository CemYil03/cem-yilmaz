// Mutable per-LLM-step anchor shared by the turn runner's stream loop, the
// orchestrator's `chatPersistStep`, and any tool that pre-writes its own
// `chatMessagesToolCall` row (`delegateTo*`). One step → one `messageId` for
// live reasoning/text chunks and the first persisted artifact of that step,
// so the client can swap the live "Thinking…" slot onto the settled row.
// See `docs/architecture/chat.md` (per-step thought summaries).

export interface ChatStepArtifact {
    /** Pre-allocated spine id for this step's first persisted message. */
    messageId: string;
    /** Accumulated thought-summary text from `reasoning-delta` parts. */
    reasoning: string;
    /** Accumulated answer text from `text-delta` parts (final step only). */
    text: string;
    /** True once `claimFirstMessageId` has handed the id to a writer. */
    firstClaimed: boolean;
}

export function chatStepArtifactCreate(messageId = crypto.randomUUID()): ChatStepArtifact {
    return { messageId, reasoning: '', text: '', firstClaimed: false };
}

/** Rotate to a fresh step (AI SDK `start-step`, or after a tool-bearing generate step). */
export function chatStepArtifactReset(step: ChatStepArtifact): void {
    step.messageId = crypto.randomUUID();
    step.reasoning = '';
    step.text = '';
    step.firstClaimed = false;
}

/**
 * Claim the step's pre-allocated id for the first persisted artifact.
 * Returns `null` when a prior writer (pre-written delegate row, earlier
 * approval / tool / collection in this step) already took it — callers then
 * mint a fresh UUID and leave `reasoning` null on that sibling row.
 */
export function chatStepArtifactClaimFirstMessageId(step: ChatStepArtifact | null | undefined): string | null {
    if (!step || step.firstClaimed) return null;
    step.firstClaimed = true;
    return step.messageId;
}

export function chatStepArtifactReasoningOrNull(
    step: ChatStepArtifact | null | undefined,
    stepReasoningText?: string | undefined,
): string | null {
    const fromStep = stepReasoningText?.trim() ? stepReasoningText : null;
    const fromBuffer = step?.reasoning.trim() ? step.reasoning : null;
    return fromStep ?? fromBuffer;
}
