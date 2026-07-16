import { format, parseISO } from 'date-fns';
import { ChevronDownIcon, ChevronUpIcon, ExternalLinkIcon, PaperclipIcon, PencilIcon, TimerIcon, Trash2Icon } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../utils/cn';
import { DATE_FNS_LOCALE } from '../utils/dateFnsLocale';
import type { Locale } from '../utils/locale';
import { Button } from './base/button';
import { Bubble, MessageRow } from './chat-message/shared';
import {
    ACTIVITY_CHANNEL_LABELS,
    ACTIVITY_KIND_ICONS,
    ACTIVITY_KIND_LABELS,
    OFFER_STATUS_LABELS,
    formatDuration,
    formatEur,
} from './WorkspaceProjectActivityConstants';
import type { WorkspaceProjectActivityRow } from './WorkspaceProjectActivityConstants';

// A single activity rendered on the project's chat-style timeline, picked by
// direction:
//   - outgoing → right-aligned bubble, primary tint
//   - incoming → left-aligned bubble, neutral (opaque) tint
//   - internal → centered card. Work-timer rows collapse to a single line
//     ("Du hast 1 h 15 m gearbeitet · 14:30") with an expand-on-click chevron.
// Bubbles reuse the shared chat primitives (`MessageRow` / `Bubble` /
// `Timestamp` in `chat-message/shared.tsx`) so they share the app's message
// chrome. See `docs/features/workspace-projects.md`.

// Centered "Montag, 14. März" pill — anchors the chat in time without competing
// with the bubbles. Repeats per day, not per row.
export function WorkspaceProjectActivityDaySeparator({ iso, locale }: { iso: string; locale: Locale }) {
    const formatted = format(parseISO(iso), locale === 'de' ? 'EEEE, d. MMMM yyyy' : 'EEEE, d MMMM yyyy', {
        locale: DATE_FNS_LOCALE[locale],
    });
    return (
        <div aria-hidden className="flex items-center justify-center py-1">
            <span className="rounded-full bg-muted/60 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {formatted}
            </span>
        </div>
    );
}

export function WorkspaceProjectActivityMessage({
    activity,
    locale,
    onEdit,
    onDelete,
}: {
    activity: WorkspaceProjectActivityRow;
    locale: Locale;
    onEdit: () => void;
    onDelete: () => void;
}) {
    if (activity.direction === 'internal') {
        return <InternalActivityRow activity={activity} locale={locale} onEdit={onEdit} onDelete={onDelete} />;
    }
    return <BubbleActivityRow activity={activity} locale={locale} onEdit={onEdit} onDelete={onDelete} />;
}

function BubbleActivityRow({
    activity,
    locale,
    onEdit,
    onDelete,
}: {
    activity: WorkspaceProjectActivityRow;
    locale: Locale;
    onEdit: () => void;
    onDelete: () => void;
}) {
    const isOutgoing = activity.direction === 'outgoing';
    const Icon = ACTIVITY_KIND_ICONS[activity.kind];
    const time = format(parseISO(activity.occurredAt as unknown as string), 'HH:mm');

    return (
        <MessageRow side={isOutgoing ? 'user' : 'system'}>
            <div className={cn('group flex max-w-[min(36rem,90%)] flex-col gap-1', isOutgoing ? 'items-end' : 'items-start')}>
                <div
                    className={cn(
                        'flex items-center gap-1.5 text-[11px] text-muted-foreground',
                        isOutgoing ? 'flex-row-reverse' : 'flex-row',
                    )}
                >
                    <Icon className="size-3" />
                    <span>{ACTIVITY_KIND_LABELS[activity.kind][locale]}</span>
                    {activity.channel ? <span>· {ACTIVITY_CHANNEL_LABELS[activity.channel][locale]}</span> : null}
                    <span>· {time}</span>
                </div>
                <Bubble tone={isOutgoing ? 'outgoing' : 'neutral'} className="max-w-full">
                    {activity.title ? <div className="font-medium">{activity.title}</div> : null}
                    {activity.notes ? (
                        <div
                            className={cn(
                                'whitespace-pre-line text-[13px]',
                                activity.title ? 'mt-1 text-muted-foreground' : 'text-foreground',
                            )}
                        >
                            {activity.notes}
                        </div>
                    ) : null}
                    {!activity.title && !activity.notes ? (
                        <div className="text-[13px] italic text-muted-foreground">{ACTIVITY_KIND_LABELS[activity.kind][locale]}</div>
                    ) : null}
                    {activity.kind === 'offer' && activity.amountCents != null ? (
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                                {formatEur(activity.amountCents)}
                            </span>
                            {activity.offerStatus ? (
                                <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[11px] text-secondary-foreground">
                                    {OFFER_STATUS_LABELS[activity.offerStatus][locale]}
                                </span>
                            ) : null}
                        </div>
                    ) : null}
                    {activity.durationSec ? (
                        <div className="mt-1 text-[11px] text-muted-foreground">
                            {{ de: 'Dauer', en: 'Duration' }[locale]}: {formatDuration(activity.durationSec)}
                        </div>
                    ) : null}
                    {activity.links.length > 0 || activity.files.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-1">
                            {activity.links.map((link) => (
                                <a
                                    key={link.projectLinkId}
                                    href={link.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 rounded border border-border/60 bg-background/40 px-1.5 py-0.5 text-[11px] hover:bg-muted"
                                >
                                    <ExternalLinkIcon className="size-2.5" />
                                    {link.label || link.url.replace(/^https?:\/\//, '').slice(0, 40)}
                                </a>
                            ))}
                            {activity.files.map((file) => (
                                <a
                                    key={file.projectFileId}
                                    href={file.fileUpload.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 rounded border border-border/60 bg-background/40 px-1.5 py-0.5 text-[11px] hover:bg-muted"
                                >
                                    <PaperclipIcon className="size-2.5" />
                                    {file.label || file.fileUpload.filename}
                                </a>
                            ))}
                        </div>
                    ) : null}
                </Bubble>
                <div className="flex items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                    <Button size="icon-sm" variant="ghost" aria-label={{ de: 'Bearbeiten', en: 'Edit' }[locale]} onClick={onEdit}>
                        <PencilIcon />
                    </Button>
                    <Button size="icon-sm" variant="ghost" aria-label={{ de: 'Löschen', en: 'Delete' }[locale]} onClick={onDelete}>
                        <Trash2Icon />
                    </Button>
                </div>
            </div>
        </MessageRow>
    );
}

function InternalActivityRow({
    activity,
    locale,
    onEdit,
    onDelete,
}: {
    activity: WorkspaceProjectActivityRow;
    locale: Locale;
    onEdit: () => void;
    onDelete: () => void;
}) {
    // Work-timer rows are collapsed by default — they're measurements, not
    // turns, and the timeline reads better when they don't shout. Note and
    // milestone rows are short by nature; they render expanded.
    const isWork = activity.kind === 'work';
    const [expanded, setExpanded] = useState(!isWork);
    const Icon = ACTIVITY_KIND_ICONS[activity.kind];
    const isRunning = isWork && activity.endedAt === null;
    const time = format(parseISO(activity.occurredAt as unknown as string), 'HH:mm');

    if (isWork && !expanded) {
        const summary = activity.durationSec
            ? `${{ de: 'Du hast', en: 'You worked' }[locale]} ${formatDuration(activity.durationSec)} ${{ de: 'am Projekt gearbeitet', en: 'on the project' }[locale]}`
            : isRunning
              ? { de: 'Arbeit läuft …', en: 'Working …' }[locale]
              : { de: 'Arbeitseintrag', en: 'Work entry' }[locale];
        return (
            <MessageRow side="center">
                <button
                    type="button"
                    onClick={() => setExpanded(true)}
                    className="inline-flex items-center gap-2 rounded-full border border-border/40 bg-card/40 px-3 py-1 text-[12px] text-muted-foreground transition-colors hover:bg-card/70 hover:text-foreground"
                >
                    <TimerIcon className="size-3" />
                    <span>{summary}</span>
                    <span className="opacity-60">· {time}</span>
                    {isRunning ? (
                        <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                            {{ de: 'läuft', en: 'running' }[locale]}
                        </span>
                    ) : null}
                    <ChevronDownIcon className="size-3 opacity-60" />
                </button>
            </MessageRow>
        );
    }

    return (
        <MessageRow side="center">
            <div className="group flex w-full max-w-[min(40rem,95%)] items-start gap-2 rounded-lg border border-border/60 bg-muted px-3 py-2 text-sm shadow-sm">
                <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        {activity.title ? <span className="font-medium">{activity.title}</span> : null}
                        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                            {activity.channel
                                ? ACTIVITY_CHANNEL_LABELS[activity.channel][locale]
                                : ACTIVITY_KIND_LABELS[activity.kind][locale]}
                        </span>
                        <span className="text-[11px] text-muted-foreground">· {time}</span>
                        {activity.durationSec ? (
                            <span className="text-[11px] text-muted-foreground">· {formatDuration(activity.durationSec)}</span>
                        ) : null}
                        {isRunning ? (
                            <span className="rounded-md bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                                {{ de: 'läuft', en: 'running' }[locale]}
                            </span>
                        ) : null}
                    </div>
                    {activity.notes ? (
                        <div className="mt-1 whitespace-pre-line text-[13px] text-muted-foreground">{activity.notes}</div>
                    ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                    {isWork ? (
                        <Button
                            size="icon-sm"
                            variant="ghost"
                            aria-label={{ de: 'Einklappen', en: 'Collapse' }[locale]}
                            onClick={() => setExpanded(false)}
                        >
                            <ChevronUpIcon />
                        </Button>
                    ) : (
                        <Button size="icon-sm" variant="ghost" aria-label={{ de: 'Bearbeiten', en: 'Edit' }[locale]} onClick={onEdit}>
                            <PencilIcon />
                        </Button>
                    )}
                    <Button size="icon-sm" variant="ghost" aria-label={{ de: 'Löschen', en: 'Delete' }[locale]} onClick={onDelete}>
                        <Trash2Icon />
                    </Button>
                </div>
            </div>
        </MessageRow>
    );
}
