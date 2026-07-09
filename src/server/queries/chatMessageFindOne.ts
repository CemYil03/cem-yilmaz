import { eq } from 'drizzle-orm';
import type { Database, DatabaseTransaction } from '../db';
import { chatMessages } from '../db/schema';
import type { ChatMessageRowJoined } from '../mappers/toGqlChatMessage';
import { toChatMessageRow } from '../mappers/toChatMessageRow';
import { chatMessageBaseQuery } from './chatMessageBaseQuery';
import { chatMessageUserAttachmentAttach } from '../commands/chatMessageUserAttachmentAttach';

// Single-row analogue of `chatMessageFindMany`: pulls one message together with
// its variant row and (if present) author. Used by the per-message commit
// points in the chat command path so the publish payload comes from the same
// joined shape `toGqlChatMessage` already consumes — no parallel "build a
// payload from the create-side row" code path.
//
// Returns `null` when the spine row isn't found; the caller decides whether
// that's an error or a benign race.
export async function chatMessageFindOne(
    dbOrTx: Database | DatabaseTransaction,
    chatMessageId: string,
): Promise<ChatMessageRowJoined | null> {
    const joined = await chatMessageBaseQuery(dbOrTx).where(eq(chatMessages.chatMessageId, chatMessageId)).limit(1);
    if (!joined[0]) return null;
    const row = toChatMessageRow(joined[0]);
    // For user rows, fold the message's attachments back on so the published
    // `MessageAppended` payload carries the same `attachments` shape the
    // initial `chatFindOne` query would have returned.
    if (row.spine.kind === 'user') {
        await chatMessageUserAttachmentAttach(dbOrTx, [row]);
    }
    return row;
}
