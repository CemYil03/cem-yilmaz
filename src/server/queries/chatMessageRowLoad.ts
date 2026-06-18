import { eq } from 'drizzle-orm';
import type { Database, DatabaseTransaction } from '../db';
import { chatMessages } from '../db/schema';
import type { ChatMessageRowJoined } from '../mappers/toGqlChatMessage';
import { chatMessageRowsBaseQuery, toChatMessageRowJoined } from './chatMessageRowsBaseQuery';
import { attachUserAttachments } from './chatMessageRowsLoad';

// Single-row analogue of `chatMessageRowsLoad`: pulls one message together with
// its variant row and (if present) author. Used by the per-message commit
// points in the chat command path so the publish payload comes from the same
// joined shape `toGqlChatMessage` already consumes — no parallel "build a
// payload from the create-side row" code path.
//
// Returns `null` when the spine row isn't found; the caller decides whether
// that's an error or a benign race.
export async function chatMessageRowLoad(
    dbOrTx: Database | DatabaseTransaction,
    chatMessageId: string,
): Promise<ChatMessageRowJoined | null> {
    const joined = await chatMessageRowsBaseQuery(dbOrTx).where(eq(chatMessages.chatMessageId, chatMessageId)).limit(1);
    if (!joined[0]) return null;
    const row = toChatMessageRowJoined(joined[0]);
    // For user rows, fold the message's attachments back on so the published
    // `MessageAppended` payload carries the same `attachments` shape the
    // initial `chatFindOne` query would have returned.
    if (row.spine.kind === 'user') {
        await attachUserAttachments(dbOrTx, [row]);
    }
    return row;
}
