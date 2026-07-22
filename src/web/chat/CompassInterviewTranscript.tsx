import { useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { LinkIcon } from 'lucide-react';
import { AssistantMarkdown } from '../components/AssistantMarkdown';
import { ChatTranscriptShell } from '../components/base/chat-transcript-shell';
import { MessageScrollerItem } from '../components/base/message-scroller';
import { Bubble, CopyButton, MessageRow, SpeakButton, Timestamp } from '../components/chat-message/shared';
import type { GqlCWorkspaceCompassInterviewMessageFragment, GqlCWorkspaceCompassObservationFragment } from '../graphql/generated';
import type { Locale } from '../utils/locale';
import { cn } from '../utils/cn';

// Transcript for the compass psychological-interview view. Sits on top of the
// shared `ChatTranscriptShell` (`src/web/components/base/chat-transcript-shell.tsx`)
// so it inherits the same scroll config (`last-anchor`, 64 px edge threshold,
// zero previous-item peek, jump-to-latest pill) as every other chat transcript
// on the site — see `docs/styles/chat.md`. Dispatches to interview-shaped rows
// because `CompassInterviewMessage` isn't part of the `ChatMessage` union; the
// row-level atoms (`Bubble`, `Timestamp`, `CopyButton`, `SpeakButton`,
// `AssistantMarkdown`) are the same ones `ChatTranscriptShared` uses.
//
// MessageScrollerItems are direct children of Content (no wrapping region) —
// required for stick-to-bottom and turn anchoring. `scrollAnchor` is set only
// on user rows, matching the shadcn contract.

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
        <ChatTranscriptShell
            jumpToLatestLabel={jumpToLatestLabel}
            className={className}
            viewportClassName={viewportClassName}
            contentClassName="gap-4"
        >
            {messages.map((message) => (
                <MessageScrollerItem
                    key={message.interviewMessageId}
                    messageId={message.interviewMessageId}
                    scrollAnchor={message.role === 'user'}
                >
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
            {streamingEntries.map(([interviewMessageId, text]) => (
                <MessageScrollerItem key={interviewMessageId} messageId={interviewMessageId} aria-live="polite" aria-atomic="false">
                    <MessageRow side="assistant">
                        <div className="flex min-w-0 flex-1 flex-col gap-1">
                            <AssistantMarkdown text={text} streaming />
                        </div>
                    </MessageRow>
                </MessageScrollerItem>
            ))}
        </ChatTranscriptShell>
    );
}

// User rows are bubbled — the interview transcript reads noticeably better
// with the shared right-aligned `Bubble tone="user"` treatment than with
// unbubbled markdown, and the doc's "don't bubble assistant markdown" rule
// (`docs/styles/chat.md`) applies only to the assistant
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
