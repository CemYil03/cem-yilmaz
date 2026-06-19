import type { Locale } from '../utils/locale';
import { GlassCard } from './GlassCard';

// Generic ordered timeline used on `/cv` for both experience and education
// entries. The component is presentational — it expects the route to pass
// already-localized strings, so the same shape works for both DB-backed
// types without leaking GraphQL field names into the renderer.
//
// `endDate === null` is the canonical "ongoing" marker; we render
// "heute" / "today" rather than the empty string so the badge always reads
// as a date range. Dates arrive as ISO `yyyy-mm-dd` strings (Drizzle's
// `date` columns), matching what `Date` GraphQL scalar serializes to on the
// client; `Intl.DateTimeFormat` parses them via `new Date(iso)` reliably
// because the string lacks a time component (UTC midnight on every platform).

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
        <ol className="flex flex-col gap-4">
            {entries.map((entry) => (
                <li key={entry.id}>
                    <GlassCard className="px-6 py-5">
                        <div className="flex flex-col gap-2 md:flex-row md:items-baseline md:justify-between md:gap-6">
                            <div className="text-sm font-medium text-muted-foreground md:min-w-44">
                                {formatDateRange(entry.startDate, entry.endDate, ongoingLabel, locale)}
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold tracking-tight">{entry.title}</h3>
                                <p className="text-sm text-muted-foreground">{entry.subtitle}</p>
                                {entry.description ? <p className="mt-3 text-sm leading-relaxed">{entry.description}</p> : null}
                                {entry.technologies && entry.technologies.length > 0 ? (
                                    <ul className="mt-3 flex flex-wrap gap-1.5">
                                        {entry.technologies.map((tech) => (
                                            <li
                                                key={tech}
                                                className="rounded-full border border-border/60 bg-foreground/5 px-2 py-0.5 text-xs text-muted-foreground"
                                            >
                                                {tech}
                                            </li>
                                        ))}
                                    </ul>
                                ) : null}
                                {entry.footnote ? (
                                    <p className="mt-3 whitespace-pre-line text-xs text-muted-foreground">{entry.footnote}</p>
                                ) : null}
                            </div>
                        </div>
                    </GlassCard>
                </li>
            ))}
        </ol>
    );
}

function formatDateRange(startIso: string | null, endIso: string | null, ongoingLabel: string, locale: Locale): string {
    const start = startIso ? formatMonthYear(startIso, locale) : null;
    const end = endIso ? formatMonthYear(endIso, locale) : ongoingLabel;
    if (start && start === end) return start;
    if (!start) return end;
    return `${start} – ${end}`;
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
