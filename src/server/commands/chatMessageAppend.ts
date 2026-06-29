import type { Database, DatabaseTransaction } from '../db';
import type { ChatMessageCreate as ChatMessageRowCreate } from '../db/schema';
import { chatMessages } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';

// Append one chat message in its own short transaction (spine + variant
// atomically), then publish a `messageAppended` wire event if a
// `generationId` is in scope. This is the single primitive the chat command
// path uses for every persisted message — user messages, tool calls,
// approval requests/responses, input collections, and the final assistant
// text. Centralizing it keeps the publish-after-commit rule and the
// "subscribers see exactly one shape per message" invariant in one place.
//
// The publish carries only the `chatMessageId` — pg_notify caps NOTIFY
// payloads at 8000 bytes, so a long user message body or fat tool-call args
// would blow the cap if we serialized the full `ChatMessage` shape. The
// subscription resolver re-loads the joined row via `chatMessageRowLoad`
// and maps it to `GqlSChatMessage`, so the shape that reaches the client
// is identical to what `chatFindOne` returns. See
// `docs/architecture/chat.md` and `src/server/graphql/chatUpdateWirePayload.ts`.
export async function chatMessageAppend(
    db: Database,
    serverRuntime: ServerRuntime,
    generationId: string | null | undefined,
    spine: ChatMessageRowCreate,
    insertVariant: (tx: DatabaseTransaction) => Promise<void>,
): Promise<void> {
    await db.transaction(async (transaction) => {
        await transaction.insert(chatMessages).values(spine);
        await insertVariant(transaction);
    });
    if (!generationId) return;
    await serverRuntime.publish.chatUpdates({
        generationId,
        payload: { kind: 'messageAppended', chatMessageId: spine.chatMessageId },
    });
}
