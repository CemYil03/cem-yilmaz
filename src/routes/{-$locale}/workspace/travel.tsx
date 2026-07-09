import { createFileRoute, Link } from '@tanstack/react-router';
import { format, parseISO } from 'date-fns';
import { CalendarDaysIcon, LuggageIcon, MapPinIcon, PencilIcon, PlaneIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { createRequest, useClient, useMutation } from 'urql';
import { pipe, subscribe } from 'wonka';
import { z } from 'zod';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '../../../web/components/base/alert-dialog';
import { Button } from '../../../web/components/base/button';
import { DatePicker } from '../../../web/components/base/date-picker';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../web/components/base/dialog';
import { Input } from '../../../web/components/base/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../web/components/base/select';
import { Textarea } from '../../../web/components/base/textarea';
import { GlassCard } from '../../../web/components/GlassCard';
import { WorkspaceUnauthorized } from '../../../web/components/WorkspaceUnauthorized';
import type {
    GqlCTransportMode,
    GqlCTripStatus,
    GqlCWorkspaceTravelPageUpdatesSubscription,
    GqlCWorkspaceTravelPageUserFragment,
} from '../../../web/graphql/generated';
import {
    WorkspaceTravelPageDocument,
    WorkspaceTravelPageUpdatesDocument,
    WorkspaceTripsDeleteDocument,
    WorkspaceTripsUpsertDocument,
} from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import { useLocale } from '../../../web/hooks/useLocale';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { cn } from '../../../web/utils/cn';
import { DATE_FNS_LOCALE } from '../../../web/utils/dateFnsLocale';
import type { Locale } from '../../../web/utils/locale';
import { localeFromParam } from '../../../web/utils/locale';

// Admin editor for Cem's trips — main list surface. Admin-only, `noindex`.
// The three-tier (trip → days → activities) itinerary and per-trip packing
// list live on the detail page (`travel_.$tripId.tsx`). The list surface
// shows one card per trip with quick facts, day count, and packing
// progress. See `docs/features/workspace-travel.md`.
//
// The AI use case is the whole point: `agentPersonalAssistantTravel` writes
// the trip + days + activities + packing items via the same GraphQL
// mutations this page mutates, so a plan drafted in chat surfaces here
// immediately and edits here surface in the next chat's snapshot.

const title = { de: 'Reisen', en: 'Travel' };
const description = { de: 'Reisen mit Tagesplan und Packliste.', en: 'Trips with day-by-day plans and packing lists.' };

const STATUS_ORDER: ReadonlyArray<GqlCTripStatus> = ['active', 'planned', 'draft', 'completed', 'cancelled'];
const STATUS_LABELS: Record<GqlCTripStatus, { de: string; en: string }> = {
    draft: { de: 'Entwurf', en: 'Draft' },
    planned: { de: 'Geplant', en: 'Planned' },
    active: { de: 'Unterwegs', en: 'Active' },
    completed: { de: 'Abgeschlossen', en: 'Completed' },
    cancelled: { de: 'Abgesagt', en: 'Cancelled' },
};

const TRANSPORT_LABELS: Record<GqlCTransportMode, { de: string; en: string }> = {
    flight: { de: 'Flug', en: 'Flight' },
    train: { de: 'Zug', en: 'Train' },
    car: { de: 'Auto', en: 'Car' },
    ferry: { de: 'Fähre', en: 'Ferry' },
    mixed: { de: 'Mehrere', en: 'Mixed' },
};

type TripTab = 'upcoming' | 'past';
const TAB_ORDER: ReadonlyArray<TripTab> = ['upcoming', 'past'];
const TAB_LABELS: Record<TripTab, { de: string; en: string }> = {
    upcoming: { de: 'Anstehend', en: 'Upcoming' },
    past: { de: 'Vergangen', en: 'Past' },
};

const travelSearchSchema = z.object({
    tab: z.enum(TAB_ORDER).optional(),
});

type WorkspaceTravelAdmin = NonNullable<GqlCWorkspaceTravelPageUserFragment['admin']>;
type TripRow = WorkspaceTravelAdmin['travel']['trips'][number];

export const Route = createFileRoute('/{-$locale}/workspace/travel')({
    validateSearch: travelSearchSchema,
    loader: () => routeLoaderGraphqlClient(WorkspaceTravelPageDocument)(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: title[locale],
            description: description[locale],
            path: '/workspace/travel',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component: TravelArea,
});

function TravelArea() {
    const locale = useLocale();
    const data = Route.useLoaderData();
    const search = Route.useSearch();
    const user = useWorkspaceTravelLiveUser(data.currentSession.user);
    const admin = user?.admin;
    const travel = admin?.travel;

    const tab: TripTab = search.tab ?? 'upcoming';
    const [editing, setEditing] = useState<TripRow | 'new' | null>(null);
    const [deleting, setDeleting] = useState<TripRow | null>(null);

    if (!admin) return <WorkspaceUnauthorized locale={locale} />;
    if (!travel) return null;

    const filtered = travel.trips.filter((row) => tripBelongsInTab(row, tab));

    return (
        <main className="px-6 md:px-10 lg:px-16 max-w-8xl mx-auto w-full py-12 leading-relaxed">
            <p className="text-sm text-muted-foreground">{description[locale]}</p>

            <div className="mt-10 flex flex-wrap items-end justify-between gap-4 border-b border-border/60">
                <TabChips tab={tab} locale={locale} counts={countTabs(travel.trips)} />
                <Button size="sm" onClick={() => setEditing('new')} className="mb-1">
                    <PlusIcon className="size-4" />
                    {{ de: 'Neue Reise', en: 'New trip' }[locale]}
                </Button>
            </div>

            <div className="mt-6">
                {filtered.length === 0 ? (
                    <EmptyState locale={locale} tab={tab} onNew={() => setEditing('new')} />
                ) : (
                    <TripGrid trips={filtered} locale={locale} onEdit={setEditing} onDelete={setDeleting} />
                )}
            </div>

            {editing !== null ? (
                <EditTripDialog initial={editing === 'new' ? null : editing} locale={locale} onClose={() => setEditing(null)} />
            ) : null}
            {deleting !== null ? <DeleteTripAlert trip={deleting} locale={locale} onClose={() => setDeleting(null)} /> : null}
        </main>
    );
}

// --- Tab switcher -----------------------------------------------------------

function TabChips({ tab, locale, counts }: { tab: TripTab; locale: Locale; counts: Record<TripTab, number> }) {
    return (
        <nav className="flex gap-1 overflow-x-auto scrollbar-none" aria-label={{ de: 'Filter', en: 'Filters' }[locale]}>
            {TAB_ORDER.map((key) => {
                const isActive = tab === key;
                return (
                    <Link
                        key={key}
                        to="/{-$locale}/workspace/travel"
                        from="/{-$locale}/workspace/travel"
                        // Default tab (`upcoming`) drops the key so the
                        // canonical URL has no `?tab=`.
                        search={(prev) => ({ ...prev, tab: key === 'upcoming' ? undefined : key })}
                        replace
                        className={cn(
                            '-mb-px flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors',
                            isActive ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
                        )}
                        aria-current={isActive ? 'page' : undefined}
                    >
                        {TAB_LABELS[key][locale]}
                        <span className="text-xs text-muted-foreground/80 tabular-nums">{counts[key]}</span>
                    </Link>
                );
            })}
        </nav>
    );
}

// --- Trip grid --------------------------------------------------------------

function TripGrid({
    trips,
    locale,
    onEdit,
    onDelete,
}: {
    trips: ReadonlyArray<TripRow>;
    locale: Locale;
    onEdit: (trip: TripRow) => void;
    onDelete: (trip: TripRow) => void;
}) {
    // Group by status so the eye lands on active/planned first, drafts and
    // done trips below. Same idiom as the projects board's status buckets.
    const groups = useMemo(() => {
        const byStatus = new Map<GqlCTripStatus, TripRow[]>();
        for (const row of trips) {
            const list = byStatus.get(row.status) ?? [];
            list.push(row);
            byStatus.set(row.status, list);
        }
        return STATUS_ORDER.flatMap((key) => {
            const list = byStatus.get(key);
            if (!list || list.length === 0) return [];
            return [{ key, trips: list }];
        });
    }, [trips]);

    return (
        <div className="space-y-8">
            {groups.map((group) => (
                <section key={group.key} aria-labelledby={`travel-status-${group.key}`}>
                    <div className="mb-3 flex items-baseline justify-between gap-3">
                        <h2
                            id={`travel-status-${group.key}`}
                            className="text-sm font-medium text-muted-foreground uppercase tracking-wider"
                        >
                            {STATUS_LABELS[group.key][locale]}
                            <span className="ml-2 text-xs normal-case tracking-normal">
                                {{ de: `${group.trips.length} Reisen`, en: `${group.trips.length} trips` }[locale]}
                            </span>
                        </h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        {group.trips.map((trip) => (
                            <TripCard key={trip.tripId} trip={trip} locale={locale} onEdit={onEdit} onDelete={onDelete} />
                        ))}
                    </div>
                </section>
            ))}
        </div>
    );
}

function TripCard({
    trip,
    locale,
    onEdit,
    onDelete,
}: {
    trip: TripRow;
    locale: Locale;
    onEdit: (trip: TripRow) => void;
    onDelete: (trip: TripRow) => void;
}) {
    const dayCount = trip.days.length;
    const packedCount = trip.packingItems.filter((p) => p.packed).length;
    const packingTotal = trip.packingItems.length;

    return (
        <GlassCard className="group px-4 py-4">
            <div className="flex items-start justify-between gap-3">
                <Link
                    to="/{-$locale}/workspace/travel/$tripId"
                    params={{ locale: locale === 'de' ? undefined : locale, tripId: trip.tripId }}
                    className="min-w-0 flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                >
                    <div className="flex items-center gap-1.5 text-base font-semibold truncate">
                        <span className="truncate">{trip.title}</span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground truncate">
                        <MapPinIcon className="size-3 shrink-0" aria-hidden />
                        <span className="truncate">{trip.destination}</span>
                    </div>
                </Link>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={() => onEdit(trip)}
                        aria-label={{ de: 'Bearbeiten', en: 'Edit' }[locale]}
                    >
                        <PencilIcon className="size-3.5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-destructive/70 hover:text-destructive"
                        onClick={() => onDelete(trip)}
                        aria-label={{ de: 'Löschen', en: 'Delete' }[locale]}
                    >
                        <Trash2Icon className="size-3.5" />
                    </Button>
                </div>
            </div>
            <div className="mt-3 flex items-end justify-between gap-3">
                <div className="min-w-0 space-y-1 text-xs text-muted-foreground">
                    {trip.startsOn || trip.endsOn ? (
                        <div className="flex items-center gap-1">
                            <CalendarDaysIcon className="size-3 shrink-0" aria-hidden />
                            <span>{formatDateRange(trip.startsOn, trip.endsOn, locale)}</span>
                        </div>
                    ) : null}
                    {trip.transportMode ? (
                        <div className="flex items-center gap-1">
                            <PlaneIcon className="size-3 shrink-0" aria-hidden />
                            <span>{TRANSPORT_LABELS[trip.transportMode][locale]}</span>
                        </div>
                    ) : null}
                </div>
                <div className="text-right shrink-0 space-y-1">
                    <div className="text-xs text-muted-foreground tabular-nums">
                        {{ de: `${dayCount} Tage`, en: `${dayCount} days` }[locale]}
                    </div>
                    {packingTotal > 0 ? (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground tabular-nums justify-end">
                            <LuggageIcon className="size-3 shrink-0" aria-hidden />
                            <span>
                                {packedCount}/{packingTotal}
                            </span>
                        </div>
                    ) : null}
                </div>
            </div>
        </GlassCard>
    );
}

// --- Edit dialog ------------------------------------------------------------

type FormState = {
    tripId: string | null;
    title: string;
    destination: string;
    startsOn: Date | undefined;
    endsOn: Date | undefined;
    status: GqlCTripStatus;
    transportMode: GqlCTransportMode | 'none';
    accommodation: string;
    notes: string;
};

function EditTripDialog({ initial, locale, onClose }: { initial: TripRow | null; locale: Locale; onClose: () => void }) {
    const isNew = initial === null;
    const [state, setState] = useState<FormState>(() => ({
        tripId: initial?.tripId ?? null,
        title: initial?.title ?? '',
        destination: initial?.destination ?? '',
        startsOn: initial?.startsOn ? parseISO(initial.startsOn) : undefined,
        endsOn: initial?.endsOn ? parseISO(initial.endsOn) : undefined,
        status: initial?.status ?? 'draft',
        transportMode: initial?.transportMode ?? 'none',
        accommodation: initial?.accommodation ?? '',
        notes: initial?.notes ?? '',
    }));
    const [, upsert] = useMutation(WorkspaceTripsUpsertDocument);
    const [submitting, setSubmitting] = useState(false);

    const submit = async () => {
        setSubmitting(true);
        try {
            const result = await upsert({
                trips: [
                    {
                        tripId: state.tripId,
                        title: state.title.trim(),
                        destination: state.destination.trim(),
                        startsOn: state.startsOn ? dateToIso(state.startsOn) : null,
                        endsOn: state.endsOn ? dateToIso(state.endsOn) : null,
                        status: state.status,
                        transportMode: state.transportMode === 'none' ? null : state.transportMode,
                        accommodation: state.accommodation.trim() || null,
                        notes: state.notes.trim() || null,
                    },
                ],
            });
            if (result.error) return;
            onClose();
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>
                        {isNew ? { de: 'Neue Reise', en: 'New trip' }[locale] : { de: 'Reise bearbeiten', en: 'Edit trip' }[locale]}
                    </DialogTitle>
                    <DialogDescription>
                        {
                            {
                                de: 'Basisdaten. Tagesplan und Packliste werden auf der Detailseite gepflegt — oder der Assistent trägt sie via Chat ein.',
                                en: 'Base facts. Itinerary and packing live on the detail page — or the assistant can fill them in via chat.',
                            }[locale]
                        }
                    </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label={{ de: 'Titel', en: 'Title' }[locale]} required>
                        <Input value={state.title} onChange={(e) => setState((s) => ({ ...s, title: e.target.value }))} autoFocus />
                    </Field>
                    <Field label={{ de: 'Ziel', en: 'Destination' }[locale]} required>
                        <Input value={state.destination} onChange={(e) => setState((s) => ({ ...s, destination: e.target.value }))} />
                    </Field>
                    <Field label={{ de: 'Abreise', en: 'Departs' }[locale]}>
                        <DatePicker
                            value={state.startsOn}
                            onValueChange={(d) => setState((s) => ({ ...s, startsOn: d }))}
                            locale={DATE_FNS_LOCALE[locale]}
                            captionLayout="dropdown"
                        />
                    </Field>
                    <Field label={{ de: 'Rückkehr', en: 'Returns' }[locale]}>
                        <DatePicker
                            value={state.endsOn}
                            onValueChange={(d) => setState((s) => ({ ...s, endsOn: d }))}
                            locale={DATE_FNS_LOCALE[locale]}
                            captionLayout="dropdown"
                        />
                    </Field>
                    <Field label={{ de: 'Status', en: 'Status' }[locale]}>
                        <Select value={state.status} onValueChange={(v) => setState((s) => ({ ...s, status: v as GqlCTripStatus }))}>
                            <SelectTrigger className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {STATUS_ORDER.map((key) => (
                                    <SelectItem key={key} value={key}>
                                        {STATUS_LABELS[key][locale]}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>
                    <Field label={{ de: 'Transportmittel', en: 'Transport' }[locale]}>
                        <Select
                            value={state.transportMode}
                            onValueChange={(v) => setState((s) => ({ ...s, transportMode: v as GqlCTransportMode | 'none' }))}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">{{ de: '– keines –', en: '– none –' }[locale]}</SelectItem>
                                {(Object.keys(TRANSPORT_LABELS) as GqlCTransportMode[]).map((key) => (
                                    <SelectItem key={key} value={key}>
                                        {TRANSPORT_LABELS[key][locale]}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>
                    <Field label={{ de: 'Unterkunft', en: 'Accommodation' }[locale]} className="sm:col-span-2">
                        <Textarea
                            rows={2}
                            value={state.accommodation}
                            onChange={(e) => setState((s) => ({ ...s, accommodation: e.target.value }))}
                        />
                    </Field>
                    <Field label={{ de: 'Notizen', en: 'Notes' }[locale]} className="sm:col-span-2">
                        <Textarea rows={3} value={state.notes} onChange={(e) => setState((s) => ({ ...s, notes: e.target.value }))} />
                    </Field>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={onClose} disabled={submitting}>
                        {{ de: 'Abbrechen', en: 'Cancel' }[locale]}
                    </Button>
                    <Button
                        onClick={submit}
                        disabled={submitting || state.title.trim().length === 0 || state.destination.trim().length === 0}
                    >
                        {{ de: 'Speichern', en: 'Save' }[locale]}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function Field({
    label,
    required,
    children,
    className,
}: {
    label: string;
    required?: boolean;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <label className={cn('flex flex-col gap-1.5 text-sm', className)}>
            <span className="text-xs font-medium text-muted-foreground">
                {label}
                {required ? <span className="text-destructive"> *</span> : null}
            </span>
            {children}
        </label>
    );
}

// --- Delete confirmation ----------------------------------------------------

function DeleteTripAlert({ trip, locale, onClose }: { trip: TripRow; locale: Locale; onClose: () => void }) {
    const [, del] = useMutation(WorkspaceTripsDeleteDocument);
    const [submitting, setSubmitting] = useState(false);
    const doDelete = async () => {
        setSubmitting(true);
        try {
            await del({ tripIds: [trip.tripId] });
            onClose();
        } finally {
            setSubmitting(false);
        }
    };
    return (
        <AlertDialog open onOpenChange={(open) => (open ? undefined : onClose())}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{{ de: 'Reise löschen?', en: 'Delete this trip?' }[locale]}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {
                            {
                                de: `„${trip.title}“ wird endgültig entfernt, inklusive Tagesplan, Aktivitäten und Packliste.`,
                                en: `"${trip.title}" will be removed permanently, along with its itinerary and packing list.`,
                            }[locale]
                        }
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={submitting}>{{ de: 'Abbrechen', en: 'Cancel' }[locale]}</AlertDialogCancel>
                    <AlertDialogAction onClick={doDelete} disabled={submitting}>
                        {{ de: 'Löschen', en: 'Delete' }[locale]}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

// --- Empty state ------------------------------------------------------------

function EmptyState({ locale, tab, onNew }: { locale: Locale; tab: TripTab; onNew: () => void }) {
    if (tab === 'past') {
        return (
            <GlassCard className="px-6 py-10 text-center text-sm text-muted-foreground">
                {{ de: 'Noch keine abgeschlossenen Reisen.', en: 'No completed trips yet.' }[locale]}
            </GlassCard>
        );
    }
    return (
        <GlassCard className="px-6 py-10 text-center">
            <PlaneIcon className="mx-auto size-8 text-muted-foreground/60" aria-hidden />
            <h2 className="mt-3 text-base font-semibold">{{ de: 'Noch keine Reisen', en: 'No trips yet' }[locale]}</h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                {
                    {
                        de: 'Lege deine erste Reise an — oder frag deinen Assistenten, einen Tagesplan zu skizzieren. Er speichert Trip, Tage und Aktivitäten direkt in der Datenbank.',
                        en: 'Add your first trip — or ask the assistant to sketch a day-by-day plan. It writes the trip, days, and activities straight into the DB.',
                    }[locale]
                }
            </p>
            <Button className="mt-4" onClick={onNew}>
                <PlusIcon className="size-4" />
                {{ de: 'Erste Reise anlegen', en: 'Add the first trip' }[locale]}
            </Button>
        </GlassCard>
    );
}

// --- Helpers ----------------------------------------------------------------

function tripBelongsInTab(trip: TripRow, tab: TripTab): boolean {
    if (tab === 'past') return trip.status === 'completed' || trip.status === 'cancelled';
    return !(trip.status === 'completed' || trip.status === 'cancelled');
}

function countTabs(trips: ReadonlyArray<TripRow>): Record<TripTab, number> {
    return {
        upcoming: trips.filter((t) => tripBelongsInTab(t, 'upcoming')).length,
        past: trips.filter((t) => tripBelongsInTab(t, 'past')).length,
    };
}

function formatDateRange(startsOn: string | null | undefined, endsOn: string | null | undefined, locale: Locale): string {
    if (!startsOn && !endsOn) return '—';
    if (startsOn && endsOn) return `${formatDate(startsOn, locale)} – ${formatDate(endsOn, locale)}`;
    return formatDate(startsOn ?? endsOn, locale);
}

function formatDate(iso: string | null | undefined, locale: Locale): string {
    if (!iso) return '—';
    try {
        return format(parseISO(iso), 'PP', { locale: DATE_FNS_LOCALE[locale] });
    } catch {
        return iso;
    }
}

function dateToIso(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

// --- Live user hook ---------------------------------------------------------

// Seed-and-subscribe. Mirrors `useWorkspaceInventoryLiveUser` — imperative
// URQL because the declarative hook can deliver each event more than once
// under concurrent React.
function useWorkspaceTravelLiveUser(
    seed: GqlCWorkspaceTravelPageUserFragment | null | undefined,
): GqlCWorkspaceTravelPageUserFragment | null | undefined {
    const [user, setUser] = useState(seed);

    const client = useClient();
    useEffect(() => {
        const request = createRequest(WorkspaceTravelPageUpdatesDocument, {});
        const operation = client.executeSubscription<GqlCWorkspaceTravelPageUpdatesSubscription>(request);
        const { unsubscribe } = pipe(
            operation,
            subscribe((result) => {
                if (result.data) setUser(result.data.userUpdates);
            }),
        );
        return unsubscribe;
    }, [client]);

    return user;
}
