import { asc, eq, inArray } from 'drizzle-orm';
import type { Database, DatabaseTransaction } from '../db';
import { fileUploads, chatMessageUserAttachments } from '../db/schema';
import type { FileUpload } from '../db/schema';
import type { ChatMessageRowJoined } from '../mappers/toGqlChatMessage';

// Bulk-load attachments for every user message in `rows` and assign them to
// the matching `userAttachments` slot in send-order. Mutates `rows` in place
// — keeping the joined-row shape mutable here avoids reallocating the array
// and lets the caller stay agnostic to the attachment hop.
export async function chatMessageUserAttachmentAttach(dbOrTx: Database | DatabaseTransaction, rows: ChatMessageRowJoined[]): Promise<void> {
    const userMessageIds = rows.filter((r) => r.spine.kind === 'user').map((r) => r.spine.chatMessageId);
    if (userMessageIds.length === 0) return;

    const joinRows = await dbOrTx
        .select()
        .from(chatMessageUserAttachments)
        .innerJoin(fileUploads, eq(fileUploads.fileUploadId, chatMessageUserAttachments.fileUploadId))
        .where(inArray(chatMessageUserAttachments.chatMessageId, userMessageIds))
        .orderBy(asc(chatMessageUserAttachments.position));

    const byMessageId = new Map<string, FileUpload[]>();
    for (const row of joinRows) {
        const list = byMessageId.get(row.ChatMessageUserAttachments.chatMessageId) ?? [];
        list.push(row.FileUploads);
        byMessageId.set(row.ChatMessageUserAttachments.chatMessageId, list);
    }

    for (const row of rows) {
        if (row.spine.kind !== 'user') continue;
        row.userAttachments = byMessageId.get(row.spine.chatMessageId) ?? [];
    }
}
