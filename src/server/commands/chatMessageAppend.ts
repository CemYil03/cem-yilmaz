import type { Database, DatabaseTransaction } from '../db';
import type { ChatMessageCreate as ChatMessageRowCreate } from '../db/schema';
import { chatMessages } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSChatMessage } from '../graphql/generated';
import { toGqlChatMessage } from '../mappers/toGqlChatMessage';
import { chatMessageRowLoad } from '../queries/chatMessageRowLoad';

// Append one chat message in its own short transaction (spine + variant
// atomically), then load the joined row and publish a
// `ChatUpdateMessageAppended` if a `generationId` is in scope. This is the
// single primitive the chat command path uses for every persisted message —
// user messages, tool calls, approval requests/responses, input collections,
// and the final assistant text. Centralizing it keeps the publish-after-commit
// rule and the "subscribers see exactly one shape per message" invariant in
// one place.
//
// The publish payload is built from the same `ChatMessageRowJoined` shape
// `chatFindOne` returns, so the subscription delivers messages identical to
// what the page query would have re-fetched — no parallel "build a payload
// from the create-side row" code path.
export async function chatMessageAppend(
    db: Database,
    serverRuntime: ServerRuntime,
    generationId: string | null | undefined,
    spine: ChatMessageRowCreate,
    insertVariant: (tx: DatabaseTransaction) => Promise<void>,
): Promise<void> {
    const message = await db.transaction(async (transaction): Promise<GqlSChatMessage | null> => {
        await transaction.insert(chatMessages).values(spine);
        await insertVariant(transaction);
        const joined = await chatMessageRowLoad(transaction, spine.chatMessageId);
        return joined ? toGqlChatMessage(joined) : null;
    });
    if (!generationId || !message) return;
    await serverRuntime.publish.chatUpdates({
        generationId,
        update: { gqlTypeName: 'ChatUpdateMessageAppended', message },
    });
}
