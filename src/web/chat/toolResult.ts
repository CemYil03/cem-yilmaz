// Interpret a tool call's `toolResult` for the transcript UI. The result is
// opaque JSON (`unknown` client-side) — it may follow the `delegateTo*`
// convention (`{ status: 'completed' | 'partial' | 'needsMoreInfo' | 'noOp' |
// 'failed', summary: string, … }`, see
// `docs/architecture/agent-delegation.md`), or it may be an arbitrary shape from
// a visitor / raw child tool. This reader is deliberately defensive so the UI
// never crashes on an unexpected payload — the worst case is a neutral "done"
// with the raw JSON available in the args inspector.

/** Three visual states a tool row can be in. `inProgress` is derived by the
 *  transcript when the trailing live-turn tool still has `toolResult: null`
 *  (not a stored column). */
export type ToolStatus = 'inProgress' | 'done' | 'failed';

export interface ToolResultView {
    status: ToolStatus;
    /** One-line-able human summary when the tool provides one; null when the
     *  result has no `summary` string (only the raw JSON is then available). */
    summary: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

/**
 * @param result the tool's `toolResult` JSON (may be null / undefined / any shape)
 * @param active true when this is the trailing open tool row of an in-flight
 *        turn (`toolResult` still null) — forces `inProgress`.
 */
export function interpretToolResult(result: unknown, active: boolean): ToolResultView {
    if (active) return { status: 'inProgress', summary: null };

    const summary = isRecord(result) && typeof result.summary === 'string' ? result.summary : null;

    // Failure signals, conservative: the `delegateTo*` convention's explicit
    // `status: 'failed'`, or a truthy top-level `error` key. Everything else —
    // including `partial` / `needsMoreInfo` / `noOp` — reads as "done" for the
    // indicator; their `summary` still surfaces inline.
    const failed = isRecord(result) && (result.status === 'failed' || Boolean(result.error));

    return { status: failed ? 'failed' : 'done', summary };
}
