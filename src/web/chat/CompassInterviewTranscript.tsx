import { useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { LinkIcon } from 'lucide-react';
import { AssistantMarkdown } from '../components/AssistantMarkdown';
import {
    MessageScroller,
    MessageScrollerButton,
    MessageScrollerContent,
    MessageScrollerItem,
    MessageScrollerProvider,
    MessageScrollerViewport,
} from '../components/base/message-scroller';
import { Bubble, CopyButton, MessageRow, SpeakButton, Timestamp } from '../components/chat-message/shared';
import type { GqlCWorkspaceCompassInterviewMessageFragment, GqlCWorkspaceCompassObservationFragment } from '../graphql/generated';
import type { Locale } from '../utils/locale';
import { cn } from '../utils/cn';

// Transcript for the compass psychological-interview view. Uses the same
// `MessageScroller` primitives and shared chat-message atoms
// (`Bubble` / `Timestamp` / `CopyButton` / `SpeakButton` / `AssistantMarkdown`)
// that `ChatTranscript` (`src/web/chat/ChatTranscriptShared.tsx`) uses, but
// dispatches to interview-shaped rows because `CompassInterviewMessage`
// isn't part of the `ChatMessage` union. See
// `docs/architecture/chat-transcript.md`.

type InterviewMessage = GqlCWorkspaceCompassInterviewMessageFragment;
type Observation = GqlCWorkspaceCompassObservationFragment;

export interface CompassInterviewTranscriptProps {
    /** Every persisted turn, in wire order. */
    messages: ReadonlyArray<InterviewMessage>;
    /** In-flight assistant streaming buffers, keyed by the pre-allocated
     *  assistant `interviewMessageId`. Same shape as `ChatTranscript`'s
     *  `streamingTexts` prop. */
    streamingTexts: Readonly<Record<string, string>>;
    /** All observations on the compass — the transcript filters down to
     *  the ones sourced from this interview and hangs a tiny "N observations"
     *  link under the matching user row. Cheap because the observations
     *  are already loaded on the compass page. */
    observations: ReadonlyArray<Observation>;
    /** Localized "Jump to latest" label so the SR-only pill text reads in
     *  the current locale. */
    jumpToLatestLabel: string;
    /** Locale for row-level copy (the "N observation(s)" pluralization). */
    locale: Locale;
    /** Extra className applied to the outer `MessageScroller`. */
    className?: string;
    /** Extra className for the inner viewport. */
    viewportClassName?: string;
}

export function CompassInterviewTranscript({
    messages,
    streamingTexts,
    observations,
    jumpToLatestLabel,
    locale,
    className,
    viewportClassName,
}: CompassInterviewTranscriptProps) {
    // Bucket observations by the interview message they came from so each
    // user row can render its own inline count without an N² scan.
    const observationsByInterviewMessageId = useMemo(() => {
        const map = new Map<string, Observation[]>();
        for (const observation of observations) {
            const sourceId = observation.sourceInterviewMessageId;
            if (!sourceId) continue;
            const bucket = map.get(sourceId);
            if (bucket) {
                bucket.push(observation);
            } else {
                map.set(sourceId, [observation]);
            }
        }
        return map;
    }, [observations]);

    const streamingEntries = Object.entries(streamingTexts);

    return (
        <MessageScrollerProvider defaultScrollPosition="last-anchor" scrollEdgeThreshold={64}>
            <MessageScroller className={className}>
                <MessageScrollerViewport className={viewportClassName}>
                    <MessageScrollerContent>
                        {messages.map((message) => (
                            <MessageScrollerItem key={message.interviewMessageId} messageId={message.interviewMessageId} scrollAnchor>
                                {message.role === 'user' ? (
                                    <InterviewUserRow
                                        message={message}
                                        observations={observationsByInterviewMessageId.get(message.interviewMessageId) ?? []}
                                        locale={locale}
                                    />
                                ) : (
                                    <InterviewAssistantRow message={message} />
                                )}
                            </MessageScrollerItem>
                        ))}
                        {streamingEntries.length > 0 ? (
                            <section className="flex min-w-0 flex-col gap-4">
                                {streamingEntries.map(([interviewMessageId, text]) => (
                                    <MessageScrollerItem key={interviewMessageId} messageId={interviewMessageId} scrollAnchor>
                                        <MessageRow side="assistant">
                                            <div className="flex min-w-0 flex-1 flex-col gap-1">
                                                <AssistantMarkdown text={text} streaming />
                                            </div>
                                        </MessageRow>
                                    </MessageScrollerItem>
                                ))}
                            </section>
                        ) : null}
                    </MessageScrollerContent>
                </MessageScrollerViewport>
                <MessageScrollerButton direction="end" variant="secondary" size="sm" className="gap-1.5 rounded-full px-3 text-xs">
                    {jumpToLatestLabel}
                </MessageScrollerButton>
            </MessageScroller>
        </MessageScrollerProvider>
    );
}

// User rows are bubbled — the interview transcript reads noticeably better
// with the shared right-aligned `Bubble tone="user"` treatment than with
// unbubbled markdown, and the doc's "don't bubble assistant markdown" rule
// (`docs/architecture/chat-transcript.md`) applies only to the assistant
// side.
function InterviewUserRow({
    message,
    observations,
    locale,
}: {
    message: InterviewMessage;
    observations: ReadonlyArray<Observation>;
    locale: Locale;
}) {
    const iso = message.createdAt as unknown as string;
    const activeObservations = observations.filter((o) => !o.dismissedAt);
    const observationsLabel = observationsLabelFor(activeObservations.length, locale);
    return (
        <MessageRow side="user">
            <div className="flex flex-col items-end gap-1">
                <Bubble tone="user">
                    <span className="whitespace-pre-wrap">{message.content}</span>
                </Bubble>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    {observationsLabel ? (
                        <Link
                            to="/{-$locale}/workspace/compass"
                            from="/{-$locale}/workspace/compass"
                            search={(prev: Record<string, unknown>) => ({ ...prev, tab: undefined, interviewId: undefined })}
                            className={cn(
                                'inline-flex items-center gap-1 rounded-full border border-border/40 bg-background px-2 py-0.5',
                                'transition-colors hover:border-border hover:text-foreground',
                            )}
                        >
                            <LinkIcon className="size-3" />
                            {observationsLabel}
                        </Link>
                    ) : null}
                    <Timestamp iso={iso} className="mt-0" />
                </div>
            </div>
        </MessageRow>
    );
}

// Assistant rows are unbubbled markdown flush in the row — the same
// treatment `ChatMessageAssistantText` uses. Long code / table blocks that
// the interviewer might emit stay unclipped.
function InterviewAssistantRow({ message }: { message: InterviewMessage }) {
    const iso = message.createdAt as unknown as string;
    return (
        <MessageRow side="assistant">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
                <AssistantMarkdown text={message.content} />
                <div className="flex items-center gap-1">
                    <Timestamp iso={iso} className="mt-0 mr-1" />
                    <SpeakButton text={message.content} />
                    <CopyButton text={message.content} />
                </div>
            </div>
        </MessageRow>
    );
}

function observationsLabelFor(count: number, locale: Locale): string | null {
    if (count === 0) return null;
    if (count === 1) return { de: '1 Beobachtung extrahiert', en: '1 observation extracted' }[locale];
    return { de: `${count} Beobachtungen extrahiert`, en: `${count} observations extracted` }[locale];
}
