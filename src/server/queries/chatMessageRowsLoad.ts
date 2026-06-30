import { and, asc, desc, eq, inArray, isNull } from 'drizzle-orm';
import type { Database, DatabaseTransaction } from '../db';
import { fileUploads, chatMessageUserAttachments, chatMessages, compassObservations } from '../db/schema';
import type { FileUpload, CompassObservation } from '../db/schema';
import type { ChatMessageRowJoined } from '../mappers/toGqlChatMessage';
import { chatMessageRowsBaseQuery, toChatMessageRowJoined } from './chatMessageRowsBaseQuery';

// Single round-trip that pulls every message in a chat together with whichever
// variant row it has and (if any) its author user. Each variant table is
// LEFT JOINed on the spine PK, so exactly one variant column is non-null per
// row.
//
// Attachments are loaded as a follow-up `IN` query keyed by the user-message
// ids in the result set and bucketed back onto the joined rows. Folding them
// into the main LEFT JOIN would multiply user rows by their attachment count
// and force a `GROUP BY` / array_agg shuffle for an N-row table that is
// already small per chat.
//
// Compass observations (admin chats only) follow the same bulk-load pattern:
// a single `IN (...)` query against `CompassObservations` keyed by user
// message id, then bucketed back onto the joined row. The analyzer never
// records observations against visitor messages, so for `scope = 'public'`
// chats the secondary query returns zero rows and the field renders empty.
//
// Shared between the GraphQL read path (`chatFindOne`) and the command path
// (`chatMessageCreate`, which loads prior turns to feed `toModelMessages`).
export async function chatMessageRowsLoad(dbOrTx: Database | DatabaseTransaction, chatId: string): Promise<ChatMessageRowJoined[]> {
    const joined = await chatMessageRowsBaseQuery(dbOrTx).where(eq(chatMessages.chatId, chatId)).orderBy(asc(chatMessages.createdAt));
    const rows = joined.map(toChatMessageRowJoined);
    await attachUserAttachments(dbOrTx, rows);
    await attachCompassObservations(dbOrTx, rows);
    return rows;
}

// Bulk-load attachments for every user message in `rows` and assign them to
// the matching `userAttachments` slot in send-order. Mutates `rows` in place
// — keeping the joined-row shape mutable here avoids reallocating the array
// and lets the caller stay agnostic to the attachment hop.
export async function attachUserAttachments(dbOrTx: Database | DatabaseTransaction, rows: ChatMessageRowJoined[]): Promise<void> {
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

// Bulk-load active compass observations for every user message in `rows`.
// Newest first per message. Visitor chats never have observations — the
// analyzer is admin-scope only — so the `IN` query is cheap regardless and
// the field renders as an empty array on visitor reads.
async function attachCompassObservations(dbOrTx: Database | DatabaseTransaction, rows: ChatMessageRowJoined[]): Promise<void> {
    const userMessageIds = rows.filter((r) => r.spine.kind === 'user').map((r) => r.spine.chatMessageId);
    if (userMessageIds.length === 0) return;

    const observations = await dbOrTx
        .select()
        .from(compassObservations)
        .where(and(inArray(compassObservations.sourceChatMessageId, userMessageIds), isNull(compassObservations.dismissedAt)))
        .orderBy(desc(compassObservations.createdAt));

    const byMessageId = new Map<string, CompassObservation[]>();
    for (const obs of observations) {
        if (!obs.sourceChatMessageId) continue;
        const list = byMessageId.get(obs.sourceChatMessageId) ?? [];
        list.push(obs);
        byMessageId.set(obs.sourceChatMessageId, list);
    }

    for (const row of rows) {
        if (row.spine.kind !== 'user') continue;
        row.compassObservations = byMessageId.get(row.spine.chatMessageId) ?? [];
    }
}
