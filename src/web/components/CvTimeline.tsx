import type { Locale } from '../utils/locale';
import { AssistantMarkdown } from './AssistantMarkdown';
import { GlassCard } from './GlassCard';
import { Reveal } from './Reveal';

// Generic ordered timeline used on `/cv` for both experience and education
// entries. The component is presentational — it expects the route to pass
// already-localized strings, so the same shape works for both DB-backed
// types without leaking GraphQL field names into the renderer.
//
// Layout on md+ is a real vertical timeline: a left "date" column, a 1px
// rail with a brand-tinted dot per entry, and the GlassCard on the right.
// On mobile the rail collapses and dates render as a small inline badge
// above the card title — the rail metaphor doesn't survive at narrow widths.
//
// `endDate === null` is the canonical "ongoing" marker; we render
// "heute" / "today" rather than the empty string so the badge always reads
// as a date range. Ongoing entries also get a fully-saturated brand dot;
// past entries fade to a muted dot so the eye can find the current role.
// Dates arrive as ISO `yyyy-mm-dd` strings (Drizzle's `date` columns),
// matching what `Date` GraphQL scalar serializes to on the client;
// `Intl.DateTimeFormat` parses them via `new Date(iso)` reliably because
// the string lacks a time component (UTC midnight on every platform).

export interface CvTimelineEntry {
    id: string;
    title: string;
    subtitle: string;
    startDate: string | null;
    endDate: string | null;
    description?: string;
    technologies?: ReadonlyArray<string>;
    footnote?: string | null;
}

export function CvTimeline({ entries, locale }: { entries: ReadonlyArray<CvTimelineEntry>; locale: Locale }) {
    if (entries.length === 0) return null;
    const ongoingLabel = { de: 'heute', en: 'today' }[locale];

    return (
        <ol className="flex flex-col">
            {entries.map((entry, index) => {
                const { start, end } = formatDateParts(entry.startDate, entry.endDate, ongoingLabel, locale);
                const isOngoing = entry.endDate === null;
                return (
                    <Reveal
                        key={entry.id}
                        as="li"
                        index={index}
                        className="group/entry md:grid md:grid-cols-[7rem_1fr] md:gap-6 pb-6 md:pb-8 last:pb-0"
                    >
                        <div className="hidden md:flex md:flex-col md:items-end pt-5 text-xs font-medium text-muted-foreground tabular-nums">
                            <span>{start}</span>
                            {end && end !== start ? <span>– {end}</span> : null}
                        </div>
                        <div
                            className={
                                // The rail is a `before:` pseudo-element on this column rather than `border-l`
                                // on the column itself: a border ends where the column ends (the bottom of the
                                // GlassCard), leaving a gap between entries equal to the row's `pb-8`. The
                                // pseudo extends 2rem (matching `md:pb-8`) past the column's bottom so it
                                // bridges into the next entry's top. `group-last/entry` collapses that
                                // extension on the final row so the rail terminates flush with the last card.
                                'relative md:pl-8 ' +
                                'md:before:absolute md:before:left-0 md:before:top-0 md:before:w-px md:before:bg-brand/40 dark:md:before:bg-brand/45 ' +
                                'md:before:h-[calc(100%+2rem)] md:group-last/entry:before:h-full'
                            }
                        >
                            <span
                                aria-hidden
                                className={
                                    'hidden md:block absolute -left-[5px] top-6 size-2.5 rounded-full ring-4 ring-background transition-colors ' +
                                    (isOngoing
                                        ? 'bg-brand shadow-[0_0_0_3px_color-mix(in_oklab,var(--brand)_25%,transparent)]'
                                        : 'bg-muted-foreground/50')
                                }
                            />
                            {/* CV cards override the default GlassCard tint: the standard 40% white surface
                                vanishes against the near-white page background, so we bump opacity and lean on
                                the border to give entries a clear silhouette. */}
                            <GlassCard className="px-6 py-5 border-border/80 bg-card/80 dark:bg-white/[0.06]">
                                <p className="md:hidden mb-2 text-xs font-medium text-muted-foreground tabular-nums">
                                    {end && end !== start ? `${start} – ${end}` : start}
                                </p>
                                <h3 className="text-lg font-semibold tracking-tight">{entry.title}</h3>
                                <p className="text-sm text-muted-foreground">{entry.subtitle}</p>
                                {entry.description ? <AssistantMarkdown text={entry.description} className="mt-3" /> : null}
                                {entry.technologies && entry.technologies.length > 0 ? (
                                    <ul className="mt-3 flex flex-wrap gap-1.5">
                                        {entry.technologies.map((tech) => (
                                            <li
                                                key={tech}
                                                className="rounded-full border border-border/60 bg-foreground/5 px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:border-brand/50 hover:bg-brand/10 hover:text-brand motion-reduce:transition-none"
                                            >
                                                {tech}
                                            </li>
                                        ))}
                                    </ul>
                                ) : null}
                                {entry.footnote ? (
                                    <p className="mt-3 whitespace-pre-line text-xs text-muted-foreground">{entry.footnote}</p>
                                ) : null}
                            </GlassCard>
                        </div>
                    </Reveal>
                );
            })}
        </ol>
    );
}

function formatDateParts(
    startIso: string | null,
    endIso: string | null,
    ongoingLabel: string,
    locale: Locale,
): { start: string; end: string | null } {
    const start = startIso ? formatMonthYear(startIso, locale) : null;
    const end = endIso ? formatMonthYear(endIso, locale) : ongoingLabel;
    if (!start) return { start: end, end: null };
    return { start, end };
}

const MONTH_FORMATTERS: Record<Locale, Intl.DateTimeFormat> = {
    de: new Intl.DateTimeFormat('de-DE', { month: 'short', year: 'numeric' }),
    en: new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }),
};

function formatMonthYear(iso: string, locale: Locale): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    return MONTH_FORMATTERS[locale].format(date);
}
