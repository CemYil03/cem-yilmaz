import type { GqlCChatPageQuery } from '../graphql/generated';

// Helpers for assembling the transcript out of the page query's initial rows
// plus the live `chatUpdates` subscription buffer. Kept out of the route file
// so the route reads as "load + render + compose" without inline data
// reshaping.

export type TranscriptMessage = GqlCChatPageQuery['currentSession']['chat']['messages'][number];

/** Combine the initial-query rows with the subscription's appended buffer,
 *  deduped by `chatMessageId` and sorted by `createdAt`. Initial rows win —
 *  the subscription buffer only contributes ids the query didn't already
 *  return.
 *
 *  Sorting matters because subscription arrival order is not the same as
 *  `createdAt` order: `chatMessageCreate` writes a synthetic skipped
 *  `userInput` at `now - 1ms` BEFORE the user message at `now`, but both
 *  rows are published together and may arrive in either order. Downstream
 *  consumers (`groupMessagesByDate`, `findLatestCollectionId`,
 *  `findUserInputByCollectionId`, `findPendingApprovalIds`) all assume
 *  `createdAt`-monotonic input — without the sort, an out-of-order pair
 *  spanning midnight splits the day-group, and the latest-collection /
 *  approval-pairing logic mis-pairs rows. */
export function mergeTranscriptMessages(
    initial: ReadonlyArray<TranscriptMessage>,
    appended: ReadonlyArray<TranscriptMessage>,
): ReadonlyArray<TranscriptMessage> {
    const seen = new Set(initial.map((m) => m.chatMessageId));
    const fresh = appended.filter((m) => !seen.has(m.chatMessageId));
    if (fresh.length === 0) return initial;
    return [...initial, ...fresh].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** Re-group a flat insertion-ordered list by ISO calendar day (YYYY-MM-DD).
 *  The client is the only place messages get grouped — the server returns a
 *  flat `chat.messages: [ChatMessage!]!` so subscription-delivered messages
 *  land in the right group without a refetch. */
export function groupMessagesByDate<TMessage extends { createdAt: string }>(
    messages: ReadonlyArray<TMessage>,
): Array<{ date: string; messages: ReadonlyArray<TMessage> }> {
    const groups: Array<{ date: string; messages: TMessage[] }> = [];
    let lastDate: string | null = null;
    for (const message of messages) {
        const date = message.createdAt.slice(0, 10);
        if (date !== lastDate) {
            groups.push({ date, messages: [] });
            lastDate = date;
        }
        groups[groups.length - 1]!.messages.push(message);
    }
    return groups;
}

/** Find the chatMessageId of the most recent assistant input collection IF it
 *  is also the last message in the chat. The interactivity rule is now
 *  strictly tighter than "latest collection": once any later message lands —
 *  a userInput row, a free-text user message, an assistant follow-up — the
 *  collection's form locks. See "Latest-collection-only is a UI rule" in
 *  docs/architecture/chat.md. Returns null when the chat is empty or the
 *  tail is not a collection. */
export function findLatestCollectionId(messages: ReadonlyArray<TranscriptMessage>): string | null {
    if (messages.length === 0) return null;
    const tail = messages[messages.length - 1]!;
    return tail.__typename === 'ChatMessageAssistantInputCollection' ? tail.chatMessageId : null;
}

/** Index every `ChatMessageUserInput` row by the collection it answers. The
 *  card for an input collection consumes this to switch between its
 *  pending / answered / skipped renderings, and the route consults it to
 *  decide whether the most-recent collection is still interactive (an answered
 *  or skipped collection is no longer interactive even when it's still the
 *  most recent in the transcript). The transcript guarantees at most one
 *  userInput per collection — server-side, `chatInputCollectionRespond`
 *  refuses to write a second — so a plain Map is the right shape. */
export function findUserInputByCollectionId(
    messages: ReadonlyArray<TranscriptMessage>,
): ReadonlyMap<string, Extract<TranscriptMessage, { __typename: 'ChatMessageUserInput' }>> {
    const byCollection = new Map<string, Extract<TranscriptMessage, { __typename: 'ChatMessageUserInput' }>>();
    for (const message of messages) {
        if (message.__typename === 'ChatMessageUserInput') byCollection.set(message.collectionMessageId, message);
    }
    return byCollection;
}

/** Approval requests whose response hasn't landed yet. Single forward pass:
 *  a request adds, its later response removes — relies on the natural
 *  insertion order between request and response rows. */
export function findPendingApprovalIds(messages: ReadonlyArray<TranscriptMessage>): ReadonlySet<string> {
    const pending = new Set<string>();
    for (const m of messages) {
        if (m.__typename === 'ChatMessageToolApprovalRequest') pending.add(m.approvalId);
        else if (m.__typename === 'ChatMessageToolApprovalResponse') pending.delete(m.approvalId);
    }
    return pending;
}
