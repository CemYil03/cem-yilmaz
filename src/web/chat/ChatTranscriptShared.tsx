import { CalendarIcon } from 'lucide-react';
import { Fragment, useCallback } from 'react';
import { formatDate } from '../../shared';
import { AssistantMarkdown } from '../components/AssistantMarkdown';
import { ChatTranscriptShell } from '../components/base/chat-transcript-shell';
import { Marker, MarkerContent, MarkerIcon } from '../components/base/marker';
import { MessageScrollerItem } from '../components/base/message-scroller';
import { Spinner } from '../components/base/spinner';
import { ChatMessage } from '../components/chat-message';
import type { GqlCChatAssistantInputValue } from '../graphql/generated';
import type { Locale } from '../utils/locale';
import type { TranscriptMessage } from './chatTranscript';
import {
    activeToolCallId,
    findLatestCollectionId,
    findPendingApprovalIds,
    findUserInputByCollectionId,
    groupMessagesByDate,
    partitionByParent,
} from './chatTranscript';

// Shared transcript renderer for every chat surface — the workspace assistant
// (both the sidebar body and the deep-link `/workspace/assistant/$chatId`
// route) and the visitor "Ask me anything" sheet. Sits on top of
// `ChatTranscriptShell` (`src/web/components/base/chat-transcript-shell.tsx`),
// which pins the shadcn `MessageScroller` config in exactly one place —
// `defaultScrollPosition="last-anchor"`, `scrollEdgeThreshold={64}`, and the
// jump-to-latest pill at the tail. See `docs/styles/chat.md` for the desired
// chat experience and the shared transcript composition rules.
//
// Critical MessageScroller contract: every `MessageScrollerItem` must be a
// *direct* child of `MessageScrollerContent`. The primitive's MutationObserver
// and turn-anchor walk only look at `content.children` — wrapping items in a
// date `<section>` or an `aria-live` region silently breaks stick-to-bottom
// and `scrollAnchor` handling (new sends show "Jump to latest" instead of
// following). Date markers and streaming rows are therefore siblings of the
// message items, not parents of them.

export interface ChatTranscriptProps {
    /** Every message that should render as a row in the transcript, in
     *  wire order. Tool-call children with a `parentChatMessageId` are
     *  filtered out of the top level and re-attached inside their parent's
     *  `<ChatMessageToolCall>` — this is how nested tool-call delegation
     *  reads as a nested block instead of a flat run of siblings. */
    messages: ReadonlyArray<TranscriptMessage>;
    /** In-flight assistant streaming buffers, keyed by streaming id. Rendered
     *  after all persisted messages as sibling `MessageScrollerItem`s so the
     *  MessageScroller can follow growth while the reader is at the live edge. */
    streamingTexts: Readonly<Record<string, string>>;
    /** Submit handler for `ChatMessageAssistantInputCollection` prompts. The
     *  outermost provider owns the mutation (admin vs visitor) so this
     *  component is agnostic to the caller. */
    onCollectionSubmit: (
        collectionMessageId: string,
        answers: ReadonlyArray<{ inputId: string; value: GqlCChatAssistantInputValue }>,
    ) => void;
    /** Approval handler for `ChatMessageToolApprovalRequest`. Same rationale
     *  as `onCollectionSubmit`. */
    onApprovalRespond: (approvalId: string, approved: boolean, reason?: string) => void;
    /** Localized "Jump to latest" label so the SR-only text on the pill can
     *  read in the current locale. */
    jumpToLatestLabel: string;
    /** Site locale for day separators and any other display formatting. */
    locale: Locale;
    /** True while the transcript's first fetch is in-flight and there are no
     *  messages yet. Renders a centred spinner in place of the empty scroller
     *  so the visitor sheet's open transition doesn't flash empty. */
    initialFetching?: boolean;
    /** True while a turn is in flight. Used to shimmer the trailing tool-call
     *  row ("working on it") until the assistant streams text or the turn ends.
     *  Optional — surfaces that don't pass it get no shimmer, which is correct
     *  for a settled transcript. */
    isGenerating?: boolean;
    /** Message ids emitted by the current, still-running turn for this chat.
     *  The trailing tool-call shimmer is scoped to this set so a settled
     *  prior-turn tool call never re-shimmers when a new turn begins, and a
     *  tool call in an unrelated (non-generating) chat never shimmers. Empty
     *  or omitted → nothing shimmers. */
    liveTurnMessageIds?: ReadonlySet<string>;
    /** Extra className applied to the outer `MessageScroller`. Surfaces set
     *  this to control the outer scroll container's flex / min-height rails
     *  where their layout differs. */
    className?: string;
    /** Extra className for the inner viewport. Prefer leaving this unset —
     *  the shell already reserves the scrollbar gutter (`scrollbar-gutter:
     *  stable`) plus `pr-2` breathing room, so bubbles never sit under the
     *  scrollbar. Override only when a surface needs a different scroll-fade
     *  edge or a wider gutter. */
    viewportClassName?: string;
}

// Stable empty set so the `liveTurnMessageIds ?? …` fallback doesn't create a
// new Set each render (which would defeat memo comparisons downstream).
const EMPTY_LIVE_TURN_IDS: ReadonlySet<string> = new Set();

/** Turn anchors are user messages only — matching shadcn's MessageScroller
 *  contract. A new `scrollAnchor` row settles near the top of the viewport so
 *  the reply can grow into the room below; `autoScroll` then follows that
 *  growth while the reader stays at the live edge. */
function isTurnScrollAnchor(message: TranscriptMessage): boolean {
    return message.__typename === 'ChatMessageUser';
}

export function ChatTranscript({
    messages,
    streamingTexts,
    onCollectionSubmit,
    onApprovalRespond,
    jumpToLatestLabel,
    locale,
    initialFetching = false,
    isGenerating = false,
    liveTurnMessageIds,
    className,
    viewportClassName,
}: ChatTranscriptProps) {
    const latestCollectionId = findLatestCollectionId(messages);
    const pendingApprovalIds = findPendingApprovalIds(messages);
    const userInputByCollection = findUserInputByCollectionId(messages);
    // Children rendered under their parent's `<ChatMessageToolCall>` — filter
    // them out of the day-grouped top level. See
    // `docs/architecture/agent-delegation.md` ("Nested tool calls").
    const { topLevel, childrenByParentId } = partitionByParent(messages);
    const groupedMessages = groupMessagesByDate(topLevel);
    const streamingEntries = Object.entries(streamingTexts);

    // The trailing tool call shimmers "working on it" only while the turn is in
    // flight, no streaming text has started yet, AND the row belongs to the
    // current turn (its id is in `liveTurnMessageIds`) — so a completed
    // prior-turn tool call or another chat's tool call never re-shimmers.
    const activeId = activeToolCallId(topLevel, liveTurnMessageIds ?? EMPTY_LIVE_TURN_IDS, isGenerating, streamingEntries.length > 0);

    const messageIdFor = useCallback((message: TranscriptMessage) => message.chatMessageId, []);

    return (
        <ChatTranscriptShell
            jumpToLatestLabel={jumpToLatestLabel}
            className={className}
            viewportClassName={viewportClassName}
            // Row gap (`--chat-row-gap`); date markers add `mt-4` so the gap
            // between the last row of one day and the next day's marker reads
            // as `--chat-group-gap` (gap-4 + mt-4 ≈ 2rem).
            contentClassName="gap-4"
        >
            {initialFetching && messages.length === 0 ? (
                <div className="grid place-items-center py-8">
                    <Spinner className="size-4 text-muted-foreground" />
                </div>
            ) : null}
            {groupedMessages.map((group, groupIndex) => (
                <Fragment key={group.date}>
                    <MessageScrollerItem messageId={`date:${group.date}`} className={groupIndex > 0 ? 'mt-4' : undefined}>
                        <Marker variant="separator" className="text-[11px] uppercase tracking-wide">
                            <MarkerIcon>
                                <CalendarIcon />
                            </MarkerIcon>
                            <MarkerContent>
                                <time dateTime={group.date}>{formatDate(group.date, { locale })}</time>
                            </MarkerContent>
                        </Marker>
                    </MessageScrollerItem>
                    {group.messages.map((message) => {
                        // Folded into the collection card — no visual row, so no
                        // scroller item (an empty item would still shift
                        // itemCount and confuse turn anchoring).
                        if (message.__typename === 'ChatMessageUserInput') return null;
                        const approvalRespondHandler =
                            message.__typename === 'ChatMessageToolApprovalRequest' && pendingApprovalIds.has(message.approvalId)
                                ? onApprovalRespond
                                : undefined;
                        const collectionUserInput =
                            message.__typename === 'ChatMessageAssistantInputCollection'
                                ? userInputByCollection.get(message.chatMessageId)
                                : undefined;
                        const children =
                            message.__typename === 'ChatMessageToolCall' ? childrenByParentId.get(message.chatMessageId) : undefined;
                        return (
                            <MessageScrollerItem
                                key={message.chatMessageId}
                                messageId={messageIdFor(message)}
                                scrollAnchor={isTurnScrollAnchor(message)}
                            >
                                <ChatMessage
                                    message={message}
                                    isInteractiveCollection={
                                        message.__typename === 'ChatMessageAssistantInputCollection' &&
                                        message.chatMessageId === latestCollectionId
                                    }
                                    collectionUserInput={collectionUserInput}
                                    onCollectionSubmit={onCollectionSubmit}
                                    onApprovalRespond={approvalRespondHandler}
                                    children={children}
                                    activeToolCall={message.chatMessageId === activeId}
                                />
                            </MessageScrollerItem>
                        );
                    })}
                </Fragment>
            ))}
            {streamingEntries.map(([streamingId, text]) => (
                // No `scrollAnchor` — the user message that started the turn
                // already holds the reading line; streaming growth is followed
                // by `autoScroll` while the reader is at the live edge.
                // `aria-live` lives on the item itself so we don't wrap items
                // in a DOM parent (which would break the direct-child contract).
                <MessageScrollerItem key={streamingId} messageId={streamingId} aria-live="polite" aria-atomic="false">
                    <AssistantMarkdown text={text} streaming />
                </MessageScrollerItem>
            ))}
        </ChatTranscriptShell>
    );
}
