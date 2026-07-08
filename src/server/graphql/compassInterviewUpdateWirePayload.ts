// What `serverRuntime.publish.compassInterviewUpdates` puts on the wire,
// distinct from the `GqlSCompassInterviewUpdate` union that reaches
// subscribers.
//
// Parallel to `ChatUpdateWirePayload` but for the compass psychological
// interviewer, which writes to its own `CompassInterviewMessages` table (see
// `docs/features/workspace-compass.md`). Same three-variant discriminated
// shape: newly-persisted row, streaming delta on the pre-allocated assistant
// row id, and terminal `turnEnded`. `concluded` on `turnEnded` is true when
// the agent called `concludeInterview` this turn — lets the client transition
// its terminal UI without waiting for the next `userUpdates` push.
//
// pg_notify's 8000-byte cap is the reason `messageAppended` carries only the
// id (the resolver re-loads the row via `compassInterviewMessageRowLoad`).
// `assistantTextChunk` keeps its inline `delta` for the same reason
// `ChatUpdateWirePayload` does — chunks are already small.
export type CompassInterviewUpdateWirePayload =
    | { kind: 'messageAppended'; interviewMessageId: string }
    | { kind: 'assistantTextChunk'; interviewMessageId: string; delta: string }
    | { kind: 'turnEnded'; generationId: string; concluded: boolean };
