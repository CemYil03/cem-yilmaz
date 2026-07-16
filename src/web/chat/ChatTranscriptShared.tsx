import { format, parseISO } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { useCallback } from 'react';
import { AssistantMarkdown } from '../components/AssistantMarkdown';
import { ChatStreamingRegion, ChatTranscriptShell } from '../components/base/chat-transcript-shell';
import { Marker, MarkerContent, MarkerIcon } from '../components/base/marker';
import { MessageScrollerItem } from '../components/base/message-scroller';
import { Spinner } from '../components/base/spinner';
import { ChatMessage } from '../components/chat-message';
import type { GqlCChatAssistantInputValue } from '../graphql/generated';
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
// jump-to-latest pill at the tail. See `docs/styles/chat.md` for the rules and
// `docs/architecture/chat-transcript.md` for the "great streaming chat"
// checklist we're honouring.

export interface ChatTranscriptProps {
    /** Every message that should render as a row in the transcript, in
     *  wire order. Tool-call children with a `parentChatMessageId` are
     *  filtered out of the top level and re-attached inside their parent's
     *  `<ChatMessageToolCall>` — this is how nested tool-call delegation
     *  reads as a nested block instead of a flat run of siblings. */
    messages: ReadonlyArray<TranscriptMessage>;
    /** In-flight assistant streaming buffers, keyed by streaming id. Rendered
     *  after all persisted messages in a separate section so the
     *  MessageScroller anchors on new turns without racing the persisted
     *  ChatMessage remounts. */
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

export function ChatTranscript({
    messages,
    streamingTexts,
    onCollectionSubmit,
    onApprovalRespond,
    jumpToLatestLabel,
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

    // Every persisted message and every in-flight streaming buffer becomes
    // its own scroll anchor — MessageScroller uses these to decide "start a
    // new turn near the top of the viewport" and to preserve position when
    // older history is prepended.
    const messageIdFor = useCallback((message: TranscriptMessage) => message.chatMessageId, []);

    return (
        <ChatTranscriptShell jumpToLatestLabel={jumpToLatestLabel} className={className} viewportClassName={viewportClassName}>
            {initialFetching && messages.length === 0 ? (
                <div className="grid place-items-center py-8">
                    <Spinner className="size-4 text-muted-foreground" />
                </div>
            ) : null}
            {groupedMessages.map((group) => (
                <section key={group.date} className="flex min-w-0 flex-col gap-4">
                    <Marker variant="separator" className="text-[11px] uppercase tracking-wide">
                        <MarkerIcon>
                            <CalendarIcon />
                        </MarkerIcon>
                        <MarkerContent>
                            <time dateTime={group.date}>{format(parseISO(group.date), 'PP')}</time>
                        </MarkerContent>
                    </Marker>
                    {group.messages.map((message) => {
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
                            <MessageScrollerItem key={message.chatMessageId} messageId={messageIdFor(message)} scrollAnchor>
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
                </section>
            ))}
            {streamingEntries.length > 0 ? (
                <ChatStreamingRegion className="flex min-w-0 flex-col gap-4">
                    {streamingEntries.map(([streamingId, text]) => (
                        <MessageScrollerItem key={streamingId} messageId={streamingId} scrollAnchor>
                            <AssistantMarkdown text={text} streaming />
                        </MessageScrollerItem>
                    ))}
                </ChatStreamingRegion>
            ) : null}
        </ChatTranscriptShell>
    );
}
