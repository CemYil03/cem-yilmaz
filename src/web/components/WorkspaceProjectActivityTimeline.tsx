import { TimerIcon } from 'lucide-react';
import { Fragment, useMemo, useState } from 'react';
import { useMutation } from 'urql';
import { ChatTranscriptShell } from './base/chat-transcript-shell';
import { MessageScrollerItem } from './base/message-scroller';
import { WorkspaceProjectDetailDeleteActivitiesDocument } from '../graphql/generated';
import type { Locale } from '../utils/locale';
import { WorkspaceProjectActivityComposer } from './WorkspaceProjectActivityComposer';
import { isSameDay } from './WorkspaceProjectActivityConstants';
import type { WorkspaceProjectActivityRow, WorkspaceProjectTaskRow } from './WorkspaceProjectActivityConstants';
import { WorkspaceProjectActivityDaySeparator, WorkspaceProjectActivityMessage } from './WorkspaceProjectActivityMessage';

// Activity tab — a chat-style timeline in a fixed-height pane. The feed
// scrolls internally through the shared `ChatTranscriptShell` (anchor-at-
// bottom + jump-to-latest pill), and the composer parks as the non-scrolling
// bottom flex child — the same layout `/workspace/assistant` uses, so logging
// an entry never means scrolling back up. Outgoing rows (Cem) render right-
// aligned, incoming rows (client) left-aligned, internal rows (work / note /
// milestone) as centered system markers. Read bottom-to-top: newest at the
// bottom. A date-separator marks day changes. See
// `docs/features/workspace-projects.md`.
export function WorkspaceProjectActivityTimeline({
    activities,
    tasks,
    projectId,
    locale,
}: {
    activities: ReadonlyArray<WorkspaceProjectActivityRow>;
    tasks: ReadonlyArray<WorkspaceProjectTaskRow>;
    projectId: string;
    locale: Locale;
}) {
    const [editing, setEditing] = useState<WorkspaceProjectActivityRow | null>(null);
    const [, del] = useMutation(WorkspaceProjectDetailDeleteActivitiesDocument);

    // Server returns newest-first; chat UIs read newest-at-bottom. Reverse a copy
    // (the prop is readonly), then walk in chronological order so the day-separator
    // logic can compare each row to its predecessor without a second pass.
    const chronological = useMemo(() => activities.slice().reverse(), [activities]);

    return (
        // Fixed-height flex column: header (~5rem) + the tab strip live above,
        // so the pane takes the remaining viewport. The feed is the flex-1
        // scroll child; the composer is the fixed bottom child.
        <section data-tab="activity" className="flex h-[calc(100dvh-11rem)] min-h-0 flex-col gap-3">
            {activities.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
                    <TimerIcon className="size-8 text-muted-foreground/40" aria-hidden />
                    <p className="max-w-sm text-sm text-muted-foreground">
                        {
                            {
                                de: 'Festhalten, was du gemacht hast — auch kleine Schritte zählen.',
                                en: 'Capture what you did — small steps count too.',
                            }[locale]
                        }
                    </p>
                </div>
            ) : (
                <div className="min-h-0 flex-1">
                    <ChatTranscriptShell jumpToLatestLabel={{ de: 'Zum neuesten springen', en: 'Jump to latest' }[locale]}>
                        {chronological.map((a, index) => {
                            const previous = index > 0 ? chronological[index - 1] : null;
                            const showDaySeparator =
                                !previous || !isSameDay(a.occurredAt as unknown as string, previous.occurredAt as unknown as string);
                            const isEditingThis = editing?.activityId === a.activityId;
                            return (
                                <Fragment key={a.activityId}>
                                    {showDaySeparator ? (
                                        <WorkspaceProjectActivityDaySeparator iso={a.occurredAt as unknown as string} locale={locale} />
                                    ) : null}
                                    <MessageScrollerItem messageId={a.activityId} scrollAnchor data-row-id={a.activityId}>
                                        {isEditingThis ? (
                                            <WorkspaceProjectActivityComposer
                                                activity={a}
                                                projectId={projectId}
                                                tasks={tasks}
                                                locale={locale}
                                                onClose={() => setEditing(null)}
                                                onSaved={() => setEditing(null)}
                                            />
                                        ) : (
                                            <WorkspaceProjectActivityMessage
                                                activity={a}
                                                locale={locale}
                                                onEdit={() => setEditing(a)}
                                                onDelete={async () => {
                                                    await del({ activityId: a.activityId });
                                                }}
                                            />
                                        )}
                                    </MessageScrollerItem>
                                </Fragment>
                            );
                        })}
                    </ChatTranscriptShell>
                </div>
            )}

            {/* Composer parked at the bottom — the non-scrolling flex child, so
             * it can't drift on desktop or mobile. Editing an existing row
             * happens inline above; this composer is add-only. */}
            <div data-activity-composer className="shrink-0 border-t border-border/40 pt-3">
                <WorkspaceProjectActivityComposer
                    activity={null}
                    projectId={projectId}
                    tasks={tasks}
                    locale={locale}
                    onClose={() => {}}
                    onSaved={() => {}}
                />
            </div>
        </section>
    );
}
