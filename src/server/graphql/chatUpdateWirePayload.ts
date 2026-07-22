// What `serverRuntime.publish.chatUpdates` puts on the wire, distinct from the
// `GqlSChatUpdate` union that reaches subscribers.
//
// pg_notify caps NOTIFY payloads at 8000 bytes — a long user message body or
// a fat tool-call args blob will blow that limit if we serialize the full
// `ChatMessage` shape into the notification. So the wire payload carries only
// the `chatMessageId`; the subscription resolver in `resolversCreate.ts`
// re-loads the row via `chatMessageRowLoad` and maps it to `GqlSChatMessage`
// before handing it to graphql-js. Same shape reaches the client; the wire
// payload becomes tiny and fixed-size.
//
// `assistantTextChunk` / `assistantReasoningChunk` keep their inline `delta`
// because chunks are already small (one stream tick), and persisting them
// just to broadcast an id would invert the design. Reasoning deltas are
// Gemini thought summaries (`includeThoughts`) — ephemeral on the client,
// never written to the message tables.
export type ChatUpdateWirePayload =
    | { kind: 'messageAppended'; chatMessageId: string }
    | { kind: 'assistantTextChunk'; chatMessageId: string; delta: string }
    | { kind: 'assistantReasoningChunk'; chatMessageId: string; delta: string }
    | { kind: 'turnEnded'; generationId: string };
