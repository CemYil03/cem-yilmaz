import { createFileRoute } from '@tanstack/react-router';
import { format, parseISO } from 'date-fns';
import {
    CalendarArrowDownIcon,
    CalendarDaysIcon,
    CheckIcon,
    ClockIcon,
    ExternalLinkIcon,
    LuggageIcon,
    MapPinIcon,
    PencilIcon,
    PlaneIcon,
    PlusIcon,
    Trash2Icon,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { createRequest, useClient, useMutation } from 'urql';
import { pipe, subscribe } from 'wonka';
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
import { Popover, PopoverAnchor, PopoverContent } from '../../../web/components/base/popover';
import { Textarea } from '../../../web/components/base/textarea';
import { GlassCard } from '../../../web/components/GlassCard';
import { WorkspaceUnauthorized } from '../../../web/components/WorkspaceUnauthorized';
import type {
    GqlCAdminTravelTransportMode as GqlCTransportMode,
    GqlCAdminTravelTripStatus as GqlCTripStatus,
    GqlCWorkspaceTravelDetailUpdatesSubscription,
    GqlCWorkspaceTravelDetailUserFragment,
} from '../../../web/graphql/generated';
import {
    WorkspaceTravelDetailDocument,
    WorkspaceTravelDetailUpdatesDocument,
    WorkspaceTripActivitiesDeleteDocument,
    WorkspaceTripActivitiesUpsertDocument,
    WorkspaceTripDaysDeleteDocument,
    WorkspaceTripDaysUpsertDocument,
    WorkspaceTripPackingItemsDeleteDocument,
    WorkspaceTripPackingItemsUpsertDocument,
} from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import { useLocale } from '../../../web/hooks/useLocale';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { cn } from '../../../web/utils/cn';
import { DATE_FNS_LOCALE } from '../../../web/utils/dateFnsLocale';
import type { Locale } from '../../../web/utils/locale';
import { localeFromParam } from '../../../web/utils/locale';

// Per-trip detail. Reachable from a card on `/workspace/travel`. Loads the
// singular `admin.travel.trip(id)` — days pre-joined with activities, packing
// items pre-joined too. Same seed-and-subscribe posture as the list. This is
// also the page the travel sub-agent's writes surface on: adding an activity
// via chat lands here immediately through the `userUpdates` subscription.

type Admin = NonNullable<GqlCWorkspaceTravelDetailUserFragment['admin']>;
type TripDetail = NonNullable<Admin['adminTravelFindOne']['adminTravelTripFindOne']>;
type DayRow = TripDetail['days'][number];
type ActivityRow = DayRow['activities'][number];
type PackingRow = TripDetail['packingItems'][number];

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

// Suggested packing categories for the create/edit dialog. Stored as free-text
// on `TripPackingItems.category` — the list is a UI hint only; any string is
// valid. Labels follow the active locale so picking a suggestion writes the
// DE or EN string into the column.
const PACKING_CATEGORY_DEFAULTS: readonly { de: string; en: string }[] = [
    { de: 'Dokumente', en: 'Documents' },
    { de: 'Elektronik', en: 'Electronics' },
    { de: 'Kleidung', en: 'Clothing' },
    { de: 'Hygiene', en: 'Toiletries' },
    { de: 'Gesundheit', en: 'Health' },
    { de: 'Geld', en: 'Money' },
    { de: 'Sonstiges', en: 'Misc' },
    { de: 'Andere', en: 'Other' },
];

export const Route = createFileRoute('/{-$locale}/workspace/travel_/$tripId')({
    loader: ({ params }) => routeLoaderGraphqlClient(WorkspaceTravelDetailDocument, { tripId: params.tripId })(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: { de: 'Reise', en: 'Trip' }[locale],
            description: { de: 'Reisedetail mit Tagesplan und Packliste.', en: 'Trip detail with itinerary and packing list.' }[locale],
            path: `/workspace/travel/${params.tripId}`,
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component: WorkspaceTravelDetail,
});

function WorkspaceTravelDetail() {
    const locale = useLocale();
    const params = Route.useParams();
    const data = Route.useLoaderData();
    const user = useWorkspaceTravelDetailLiveUser(data.sessionFindOne.user, params.tripId);
    const admin = user?.admin;
    const trip = admin?.adminTravelFindOne.adminTravelTripFindOne;

    if (!admin) return <WorkspaceUnauthorized locale={locale} />;
    if (!trip) return <TripNotFound locale={locale} />;

    return (
        <main className="px-6 md:px-10 lg:px-16 max-w-6xl mx-auto w-full py-8 leading-relaxed">
            <TripHeader trip={trip} locale={locale} />
            <div className="mt-8 grid grid-cols-1 xl:grid-cols-5 gap-8">
                <section className="xl:col-span-3 space-y-6">
                    <ItineraryPanel trip={trip} locale={locale} />
                </section>
                <section className="xl:col-span-2 space-y-6">
                    <PackingPanel trip={trip} locale={locale} />
                </section>
            </div>
        </main>
    );
}

function TripNotFound({ locale }: { locale: Locale }) {
    return (
        <main className="px-6 md:px-10 lg:px-16 max-w-3xl mx-auto w-full py-12">
            <GlassCard className="mt-6 px-6 py-10 text-center text-sm text-muted-foreground">
                {{ de: 'Diese Reise existiert nicht (mehr).', en: 'This trip does not exist (any more).' }[locale]}
            </GlassCard>
        </main>
    );
}

// --- Header -----------------------------------------------------------------

function TripHeader({ trip, locale }: { trip: TripDetail; locale: Locale }) {
    return (
        <header>
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <h1 className="text-3xl font-semibold truncate">{trip.title}</h1>
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                            <MapPinIcon className="size-3.5" aria-hidden />
                            {trip.destination}
                        </span>
                        {trip.startsOn || trip.endsOn ? (
                            <span className="inline-flex items-center gap-1">
                                <CalendarDaysIcon className="size-3.5" aria-hidden />
                                {formatDateRange(trip.startsOn, trip.endsOn, locale)}
                            </span>
                        ) : null}
                        {trip.transportMode ? (
                            <span className="inline-flex items-center gap-1">
                                <PlaneIcon className="size-3.5" aria-hidden />
                                {TRANSPORT_LABELS[trip.transportMode][locale]}
                            </span>
                        ) : null}
                        <span className="inline-flex items-center gap-1">
                            <StatusDot status={trip.status} />
                            {STATUS_LABELS[trip.status][locale]}
                        </span>
                    </div>
                </div>
            </div>
            {trip.accommodation || trip.notes ? (
                <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                    {trip.accommodation ? (
                        <p>
                            <span className="font-medium text-foreground">{{ de: 'Unterkunft:', en: 'Accommodation:' }[locale]}</span>{' '}
                            {trip.accommodation}
                        </p>
                    ) : null}
                    {trip.notes ? <p>{trip.notes}</p> : null}
                </div>
            ) : null}
        </header>
    );
}

function StatusDot({ status }: { status: GqlCTripStatus }) {
    const color =
        status === 'active'
            ? 'bg-emerald-500'
            : status === 'planned'
              ? 'bg-sky-500'
              : status === 'draft'
                ? 'bg-muted-foreground'
                : status === 'completed'
                  ? 'bg-muted-foreground/60'
                  : 'bg-rose-500';
    return <span className={cn('inline-block size-2 rounded-full', color)} aria-hidden />;
}

// --- Itinerary panel --------------------------------------------------------

function ItineraryPanel({ trip, locale }: { trip: TripDetail; locale: Locale }) {
    const [editingDay, setEditingDay] = useState<DayRow | 'new' | null>(null);
    const [deletingDay, setDeletingDay] = useState<DayRow | null>(null);
    const [editingActivity, setEditingActivity] = useState<{ day: DayRow; activity: ActivityRow | 'new' } | null>(null);
    const [deletingActivity, setDeletingActivity] = useState<ActivityRow | null>(null);

    const nextDayNumber = useMemo(() => {
        const max = trip.days.reduce((m, d) => Math.max(m, d.dayNumber), 0);
        return max + 1;
    }, [trip.days]);

    return (
        <div>
            <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-2">
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    {{ de: 'Tagesplan', en: 'Itinerary' }[locale]}
                </h2>
                <Button size="sm" variant="ghost" onClick={() => setEditingDay('new')}>
                    <PlusIcon className="size-4" />
                    {{ de: 'Tag hinzufügen', en: 'Add day' }[locale]}
                </Button>
            </div>
            {trip.days.length === 0 ? (
                <GlassCard className="mt-4 px-6 py-8 text-center text-sm text-muted-foreground">
                    {
                        {
                            de: 'Noch kein Tagesplan. Frag den Assistenten „Plane meine Reise Tag für Tag“ — er trägt Tage und Aktivitäten direkt ein.',
                            en: 'No itinerary yet. Ask the assistant "plan my trip day by day" — it will file days and activities straight into the DB.',
                        }[locale]
                    }
                </GlassCard>
            ) : (
                <div className="mt-4 space-y-4">
                    {trip.days.map((day, index) => (
                        <DayBlock
                            key={day.tripDayId}
                            day={day}
                            nextDay={trip.days[index + 1] ?? null}
                            locale={locale}
                            onEditDay={() => setEditingDay(day)}
                            onDeleteDay={() => setDeletingDay(day)}
                            onAddActivity={() => setEditingActivity({ day, activity: 'new' })}
                            onEditActivity={(activity) => setEditingActivity({ day, activity })}
                            onDeleteActivity={setDeletingActivity}
                        />
                    ))}
                </div>
            )}

            {editingDay !== null ? (
                <EditDayDialog
                    tripId={trip.tripId}
                    initial={editingDay === 'new' ? null : editingDay}
                    nextDayNumber={nextDayNumber}
                    locale={locale}
                    onClose={() => setEditingDay(null)}
                />
            ) : null}
            {deletingDay !== null ? <DeleteDayAlert day={deletingDay} locale={locale} onClose={() => setDeletingDay(null)} /> : null}
            {editingActivity !== null ? (
                <EditActivityDialog
                    day={editingActivity.day}
                    initial={editingActivity.activity === 'new' ? null : editingActivity.activity}
                    locale={locale}
                    onClose={() => setEditingActivity(null)}
                />
            ) : null}
            {deletingActivity !== null ? (
                <DeleteActivityAlert activity={deletingActivity} locale={locale} onClose={() => setDeletingActivity(null)} />
            ) : null}
        </div>
    );
}

function DayBlock({
    day,
    nextDay,
    locale,
    onEditDay,
    onDeleteDay,
    onAddActivity,
    onEditActivity,
    onDeleteActivity,
}: {
    day: DayRow;
    nextDay: DayRow | null;
    locale: Locale;
    onEditDay: () => void;
    onDeleteDay: () => void;
    onAddActivity: () => void;
    onEditActivity: (activity: ActivityRow) => void;
    onDeleteActivity: (activity: ActivityRow) => void;
}) {
    return (
        <GlassCard className="px-5 py-4">
            <div className="flex items-start justify-between gap-3 group">
                <div className="min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-sm font-semibold">{{ de: `Tag ${day.dayNumber}`, en: `Day ${day.dayNumber}` }[locale]}</span>
                        {day.date ? (
                            <span className="text-xs text-muted-foreground tabular-nums">{formatDate(day.date, locale)}</span>
                        ) : null}
                        {day.title ? <span className="text-sm text-muted-foreground">· {day.title}</span> : null}
                    </div>
                    {day.summary ? <p className="mt-1 text-xs text-muted-foreground">{day.summary}</p> : null}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity shrink-0">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={onEditDay}
                        aria-label={{ de: 'Bearbeiten', en: 'Edit' }[locale]}
                    >
                        <PencilIcon className="size-3.5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-destructive/70 hover:text-destructive"
                        onClick={onDeleteDay}
                        aria-label={{ de: 'Tag löschen', en: 'Delete day' }[locale]}
                    >
                        <Trash2Icon className="size-3.5" />
                    </Button>
                </div>
            </div>
            <ul className="mt-3 space-y-1.5">
                {day.activities.length === 0 ? (
                    <li className="text-xs text-muted-foreground">{{ de: '(keine Aktivitäten)', en: '(no activities)' }[locale]}</li>
                ) : (
                    day.activities.map((activity) => (
                        <ActivityRowView
                            key={activity.tripActivityId}
                            activity={activity}
                            nextDay={nextDay}
                            locale={locale}
                            onEdit={() => onEditActivity(activity)}
                            onDelete={() => onDeleteActivity(activity)}
                        />
                    ))
                )}
            </ul>
            <Button size="sm" variant="ghost" className="mt-2 -ml-2 h-7 text-xs text-muted-foreground" onClick={onAddActivity}>
                <PlusIcon className="size-3.5" />
                {{ de: 'Aktivität hinzufügen', en: 'Add activity' }[locale]}
            </Button>
        </GlassCard>
    );
}

function ActivityRowView({
    activity,
    nextDay,
    locale,
    onEdit,
    onDelete,
}: {
    activity: ActivityRow;
    nextDay: DayRow | null;
    locale: Locale;
    onEdit: () => void;
    onDelete: () => void;
}) {
    const [moveState, moveToNextDay] = useMutation(WorkspaceTripActivitiesUpsertDocument);

    const onMoveToNextDay = () => {
        if (!nextDay) return;
        // A move is an update (same id), so the server keeps whatever `position`
        // we pass rather than recomputing a tail default. Append to the next
        // day by reading its already-loaded activities' tail.
        const tail = nextDay.activities.reduce((max, a) => Math.max(max, a.position), -1);
        void moveToNextDay({
            tripActivities: [
                {
                    tripActivityId: activity.tripActivityId,
                    tripDayId: nextDay.tripDayId,
                    position: tail + 1,
                    startsAt: activity.startsAt,
                    endsAt: activity.endsAt,
                    title: activity.title,
                    location: activity.location,
                    url: activity.url,
                    notes: activity.notes,
                },
            ],
        });
    };

    return (
        <li className="group flex items-start gap-3 rounded-md px-2 py-1.5 hover:bg-muted/40 transition-colors">
            <div className="mt-0.5 min-w-[3.5rem] text-xs tabular-nums text-muted-foreground">
                {activity.startsAt ? (
                    <span className="inline-flex items-center gap-1">
                        <ClockIcon className="size-3" aria-hidden />
                        {formatTime(activity.startsAt)}
                    </span>
                ) : (
                    '—'
                )}
            </div>
            <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{activity.title}</div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    {activity.location ? (
                        <span className="inline-flex items-center gap-1">
                            <MapPinIcon className="size-3" aria-hidden />
                            {activity.location}
                        </span>
                    ) : null}
                    {activity.url ? (
                        <a
                            href={activity.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 hover:text-foreground hover:underline"
                        >
                            <ExternalLinkIcon className="size-3" aria-hidden />
                            {{ de: 'Link', en: 'Link' }[locale]}
                        </a>
                    ) : null}
                </div>
                {activity.notes ? <div className="mt-0.5 text-xs text-muted-foreground">{activity.notes}</div> : null}
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                {nextDay ? (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-6"
                        onClick={onMoveToNextDay}
                        disabled={moveState.fetching}
                        aria-label={{ de: 'Auf nächsten Tag verschieben', en: 'Move to next day' }[locale]}
                        title={
                            {
                                de: `Auf Tag ${nextDay.dayNumber} verschieben`,
                                en: `Move to day ${nextDay.dayNumber}`,
                            }[locale]
                        }
                    >
                        <CalendarArrowDownIcon className="size-3" />
                    </Button>
                ) : null}
                <Button
                    variant="ghost"
                    size="icon"
                    className="size-6"
                    onClick={onEdit}
                    aria-label={{ de: 'Bearbeiten', en: 'Edit' }[locale]}
                >
                    <PencilIcon className="size-3" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="size-6 text-destructive/70 hover:text-destructive"
                    onClick={onDelete}
                    aria-label={{ de: 'Löschen', en: 'Delete' }[locale]}
                >
                    <Trash2Icon className="size-3" />
                </Button>
            </div>
        </li>
    );
}

// --- Packing panel ----------------------------------------------------------

function PackingPanel({ trip, locale }: { trip: TripDetail; locale: Locale }) {
    const [editing, setEditing] = useState<PackingRow | 'new' | null>(null);
    const [deleting, setDeleting] = useState<PackingRow | null>(null);

    const grouped = useMemo(() => {
        const map = new Map<string, PackingRow[]>();
        for (const item of trip.packingItems) {
            const list = map.get(item.category) ?? [];
            list.push(item);
            map.set(item.category, list);
        }
        return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
    }, [trip.packingItems]);

    const packed = trip.packingItems.filter((p) => p.packed).length;
    const total = trip.packingItems.length;

    return (
        <div>
            <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-2">
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider inline-flex items-center gap-2">
                    <LuggageIcon className="size-4" aria-hidden />
                    {{ de: 'Packliste', en: 'Packing list' }[locale]}
                    {total > 0 ? (
                        <span className="text-xs normal-case tracking-normal text-muted-foreground tabular-nums">
                            {packed}/{total}
                        </span>
                    ) : null}
                </h2>
                <Button size="sm" variant="ghost" onClick={() => setEditing('new')}>
                    <PlusIcon className="size-4" />
                    {{ de: 'Item', en: 'Item' }[locale]}
                </Button>
            </div>
            {total === 0 ? (
                <GlassCard className="mt-4 px-6 py-8 text-center text-sm text-muted-foreground">
                    {
                        {
                            de: 'Noch nichts zu packen. Frag den Assistenten oder trag manuell ein.',
                            en: 'Nothing to pack yet. Ask the assistant or add manually.',
                        }[locale]
                    }
                </GlassCard>
            ) : (
                <div className="mt-4 space-y-4">
                    {grouped.map(([category, items]) => (
                        <section key={category}>
                            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{category}</h3>
                            <ul className="mt-1 space-y-0.5">
                                {items.map((item) => (
                                    <PackingItemView
                                        key={item.tripPackingItemId}
                                        item={item}
                                        locale={locale}
                                        onEdit={() => setEditing(item)}
                                        onDelete={() => setDeleting(item)}
                                    />
                                ))}
                            </ul>
                        </section>
                    ))}
                </div>
            )}

            {editing !== null ? (
                <EditPackingItemDialog
                    tripId={trip.tripId}
                    initial={editing === 'new' ? null : editing}
                    existingCategories={grouped.map(([category]) => category)}
                    locale={locale}
                    onClose={() => setEditing(null)}
                />
            ) : null}
            {deleting !== null ? <DeletePackingItemAlert item={deleting} locale={locale} onClose={() => setDeleting(null)} /> : null}
        </div>
    );
}

function PackingItemView({
    item,
    locale,
    onEdit,
    onDelete,
}: {
    item: PackingRow;
    locale: Locale;
    onEdit: () => void;
    onDelete: () => void;
}) {
    const [, upsert] = useMutation(WorkspaceTripPackingItemsUpsertDocument);
    const onToggle = () => {
        // Same shape the edit dialog sends — flipping just `packed`. Server
        // resolves position by id-present ⇒ update, leaves the rest alone.
        void upsert({
            tripPackingItems: [
                {
                    tripPackingItemId: item.tripPackingItemId,
                    tripId: item.tripId,
                    category: item.category,
                    label: item.label,
                    quantity: item.quantity,
                    packed: !item.packed,
                    position: item.position,
                    notes: item.notes,
                },
            ],
        });
    };

    return (
        <li className="group flex items-center gap-2 rounded-md px-2 py-1 hover:bg-muted/40 transition-colors">
            <input
                type="checkbox"
                checked={item.packed}
                onChange={onToggle}
                aria-label={item.label}
                className="size-4 accent-primary cursor-pointer"
            />
            <span className={cn('text-sm flex-1 truncate', item.packed && 'text-muted-foreground line-through')}>
                {item.label}
                {item.quantity > 1 ? <span className="ml-1 text-xs text-muted-foreground tabular-nums">×{item.quantity}</span> : null}
            </span>
            {item.notes ? (
                <span className="text-xs text-muted-foreground truncate max-w-[8rem]" title={item.notes}>
                    {item.notes}
                </span>
            ) : null}
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                <Button
                    variant="ghost"
                    size="icon"
                    className="size-6"
                    onClick={onEdit}
                    aria-label={{ de: 'Bearbeiten', en: 'Edit' }[locale]}
                >
                    <PencilIcon className="size-3" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="size-6 text-destructive/70 hover:text-destructive"
                    onClick={onDelete}
                    aria-label={{ de: 'Löschen', en: 'Delete' }[locale]}
                >
                    <Trash2Icon className="size-3" />
                </Button>
            </div>
        </li>
    );
}

// --- Edit dialogs -----------------------------------------------------------

function EditDayDialog({
    tripId,
    initial,
    nextDayNumber,
    locale,
    onClose,
}: {
    tripId: string;
    initial: DayRow | null;
    nextDayNumber: number;
    locale: Locale;
    onClose: () => void;
}) {
    const isNew = initial === null;
    const [dayNumber, setDayNumber] = useState<number>(initial?.dayNumber ?? nextDayNumber);
    const [date, setDate] = useState<Date | undefined>(initial?.date ? parseISO(initial.date) : undefined);
    const [title, setTitle] = useState(initial?.title ?? '');
    const [summary, setSummary] = useState(initial?.summary ?? '');
    const [, upsert] = useMutation(WorkspaceTripDaysUpsertDocument);
    const [submitting, setSubmitting] = useState(false);

    const submit = async () => {
        setSubmitting(true);
        try {
            const result = await upsert({
                tripDays: [
                    {
                        tripDayId: initial?.tripDayId ?? null,
                        tripId,
                        dayNumber,
                        date: date ? dateToIso(date) : null,
                        title: title.trim() || null,
                        summary: summary.trim() || null,
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
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>
                        {isNew ? { de: 'Tag hinzufügen', en: 'Add day' }[locale] : { de: 'Tag bearbeiten', en: 'Edit day' }[locale]}
                    </DialogTitle>
                    <DialogDescription>
                        {{ de: 'Tage sind die Buckets für Aktivitäten.', en: 'Days are the buckets activities live in.' }[locale]}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FieldWithLabel label={{ de: 'Tag Nr.', en: 'Day #' }[locale]} required>
                        <Input
                            type="number"
                            min={1}
                            max={365}
                            value={dayNumber}
                            onChange={(e) => setDayNumber(Number.parseInt(e.target.value, 10) || 1)}
                        />
                    </FieldWithLabel>
                    <FieldWithLabel label={{ de: 'Datum', en: 'Date' }[locale]}>
                        <DatePicker value={date} onValueChange={setDate} locale={DATE_FNS_LOCALE[locale]} captionLayout="dropdown" />
                    </FieldWithLabel>
                    <FieldWithLabel label={{ de: 'Titel', en: 'Title' }[locale]} className="sm:col-span-2">
                        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Colosseum + Trastevere" />
                    </FieldWithLabel>
                    <FieldWithLabel label={{ de: 'Zusammenfassung', en: 'Summary' }[locale]} className="sm:col-span-2">
                        <Textarea rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} />
                    </FieldWithLabel>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={onClose} disabled={submitting}>
                        {{ de: 'Abbrechen', en: 'Cancel' }[locale]}
                    </Button>
                    <Button onClick={submit} disabled={submitting}>
                        {{ de: 'Speichern', en: 'Save' }[locale]}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function DeleteDayAlert({ day, locale, onClose }: { day: DayRow; locale: Locale; onClose: () => void }) {
    const [, del] = useMutation(WorkspaceTripDaysDeleteDocument);
    const [submitting, setSubmitting] = useState(false);
    const doDelete = async () => {
        setSubmitting(true);
        try {
            await del({ tripDayIds: [day.tripDayId] });
            onClose();
        } finally {
            setSubmitting(false);
        }
    };
    return (
        <AlertDialog open onOpenChange={(open) => (open ? undefined : onClose())}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{{ de: 'Tag löschen?', en: 'Delete day?' }[locale]}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {
                            {
                                de: `Tag ${day.dayNumber} inkl. Aktivitäten wird entfernt.`,
                                en: `Day ${day.dayNumber} and its activities will be removed.`,
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

function EditActivityDialog({
    day,
    initial,
    locale,
    onClose,
}: {
    day: DayRow;
    initial: ActivityRow | null;
    locale: Locale;
    onClose: () => void;
}) {
    const isNew = initial === null;
    const [title, setTitle] = useState(initial?.title ?? '');
    const [startsAt, setStartsAt] = useState(initial?.startsAt ?? '');
    const [endsAt, setEndsAt] = useState(initial?.endsAt ?? '');
    const [location, setLocation] = useState(initial?.location ?? '');
    const [url, setUrl] = useState(initial?.url ?? '');
    const [notes, setNotes] = useState(initial?.notes ?? '');
    const [, upsert] = useMutation(WorkspaceTripActivitiesUpsertDocument);
    const [submitting, setSubmitting] = useState(false);

    const submit = async () => {
        setSubmitting(true);
        try {
            const result = await upsert({
                tripActivities: [
                    {
                        tripActivityId: initial?.tripActivityId ?? null,
                        tripDayId: day.tripDayId,
                        position: initial?.position ?? null,
                        startsAt: normalizeTimeInput(startsAt),
                        endsAt: normalizeTimeInput(endsAt),
                        title: title.trim(),
                        location: location.trim() || null,
                        url: url.trim() || null,
                        notes: notes.trim() || null,
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
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>
                        {isNew
                            ? { de: 'Aktivität hinzufügen', en: 'Add activity' }[locale]
                            : { de: 'Aktivität bearbeiten', en: 'Edit activity' }[locale]}
                    </DialogTitle>
                    <DialogDescription>{{ de: `Auf Tag ${day.dayNumber}.`, en: `On day ${day.dayNumber}.` }[locale]}</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FieldWithLabel label={{ de: 'Titel', en: 'Title' }[locale]} required className="sm:col-span-2">
                        <Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
                    </FieldWithLabel>
                    <FieldWithLabel label={{ de: 'Startzeit', en: 'Starts at' }[locale]}>
                        <Input type="time" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
                    </FieldWithLabel>
                    <FieldWithLabel label={{ de: 'Endzeit', en: 'Ends at' }[locale]}>
                        <Input type="time" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
                    </FieldWithLabel>
                    <FieldWithLabel label={{ de: 'Ort', en: 'Location' }[locale]} className="sm:col-span-2">
                        <Input value={location} onChange={(e) => setLocation(e.target.value)} />
                    </FieldWithLabel>
                    <FieldWithLabel label={{ de: 'Link', en: 'URL' }[locale]} className="sm:col-span-2">
                        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
                    </FieldWithLabel>
                    <FieldWithLabel label={{ de: 'Notizen', en: 'Notes' }[locale]} className="sm:col-span-2">
                        <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
                    </FieldWithLabel>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={onClose} disabled={submitting}>
                        {{ de: 'Abbrechen', en: 'Cancel' }[locale]}
                    </Button>
                    <Button onClick={submit} disabled={submitting || title.trim().length === 0}>
                        {{ de: 'Speichern', en: 'Save' }[locale]}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function DeleteActivityAlert({ activity, locale, onClose }: { activity: ActivityRow; locale: Locale; onClose: () => void }) {
    const [, del] = useMutation(WorkspaceTripActivitiesDeleteDocument);
    const [submitting, setSubmitting] = useState(false);
    const doDelete = async () => {
        setSubmitting(true);
        try {
            await del({ tripActivityIds: [activity.tripActivityId] });
            onClose();
        } finally {
            setSubmitting(false);
        }
    };
    return (
        <AlertDialog open onOpenChange={(open) => (open ? undefined : onClose())}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{{ de: 'Aktivität löschen?', en: 'Delete activity?' }[locale]}</AlertDialogTitle>
                    <AlertDialogDescription>„{activity.title}“</AlertDialogDescription>
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

function EditPackingItemDialog({
    tripId,
    initial,
    existingCategories,
    locale,
    onClose,
}: {
    tripId: string;
    initial: PackingRow | null;
    existingCategories: readonly string[];
    locale: Locale;
    onClose: () => void;
}) {
    const isNew = initial === null;
    const otherCategory = { de: 'Andere', en: 'Other' }[locale];
    const [category, setCategory] = useState(initial?.category ?? otherCategory);
    const [label, setLabel] = useState(initial?.label ?? '');
    const [quantity, setQuantity] = useState(initial?.quantity ?? 1);
    const [notes, setNotes] = useState(initial?.notes ?? '');
    const [, upsert] = useMutation(WorkspaceTripPackingItemsUpsertDocument);
    const [submitting, setSubmitting] = useState(false);
    const [categoryOpen, setCategoryOpen] = useState(false);

    const categorySuggestions = useMemo(() => {
        const seen = new Set<string>();
        const out: string[] = [];
        const defaults = PACKING_CATEGORY_DEFAULTS.map((entry) => entry[locale]);
        for (const value of [...defaults, ...existingCategories]) {
            const trimmed = value.trim();
            if (trimmed.length === 0) continue;
            const key = trimmed.toLowerCase();
            if (seen.has(key)) continue;
            seen.add(key);
            out.push(trimmed);
        }
        return out;
    }, [existingCategories, locale]);

    const query = category.trim().toLowerCase();
    const filteredCategories = useMemo(
        () => (query.length === 0 ? categorySuggestions : categorySuggestions.filter((c) => c.toLowerCase().includes(query))),
        [categorySuggestions, query],
    );
    const showAddCategory = query.length > 0 && !categorySuggestions.some((c) => c.toLowerCase() === query);

    const submit = async () => {
        setSubmitting(true);
        try {
            const result = await upsert({
                tripPackingItems: [
                    {
                        tripPackingItemId: initial?.tripPackingItemId ?? null,
                        tripId,
                        category: category.trim() || otherCategory,
                        label: label.trim(),
                        quantity,
                        packed: initial?.packed ?? false,
                        position: initial?.position ?? null,
                        notes: notes.trim() || null,
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
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        {isNew ? { de: 'Packlisten-Item', en: 'Packing item' }[locale] : { de: 'Item bearbeiten', en: 'Edit item' }[locale]}
                    </DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FieldWithLabel label={{ de: 'Kategorie', en: 'Category' }[locale]}>
                        <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
                            <PopoverAnchor asChild>
                                <Input
                                    value={category}
                                    onChange={(e) => {
                                        setCategory(e.target.value);
                                        setCategoryOpen(true);
                                    }}
                                    onFocus={() => setCategoryOpen(true)}
                                    placeholder={{ de: 'Dokumente / Elektronik / …', en: 'Documents / Electronics / …' }[locale]}
                                    autoComplete="off"
                                />
                            </PopoverAnchor>
                            {(filteredCategories.length > 0 || showAddCategory) && (
                                <PopoverContent
                                    align="start"
                                    className="w-[--radix-popover-trigger-width] p-1"
                                    onOpenAutoFocus={(e) => e.preventDefault()}
                                >
                                    <div className="max-h-56 overflow-y-auto">
                                        {filteredCategories.map((suggestion) => {
                                            const selected = suggestion.toLowerCase() === query;
                                            return (
                                                <button
                                                    key={suggestion}
                                                    type="button"
                                                    onClick={() => {
                                                        setCategory(suggestion);
                                                        setCategoryOpen(false);
                                                    }}
                                                    className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                                                >
                                                    <CheckIcon className={cn('size-4 shrink-0', selected ? 'opacity-100' : 'opacity-0')} />
                                                    <span className="truncate">{suggestion}</span>
                                                </button>
                                            );
                                        })}
                                        {showAddCategory && (
                                            <button
                                                type="button"
                                                onClick={() => setCategoryOpen(false)}
                                                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                                            >
                                                <PlusIcon className="size-4 shrink-0" />
                                                <span className="truncate">
                                                    {{ de: 'Hinzufügen', en: 'Add' }[locale]} „{category.trim()}“
                                                </span>
                                            </button>
                                        )}
                                    </div>
                                </PopoverContent>
                            )}
                        </Popover>
                    </FieldWithLabel>
                    <FieldWithLabel label={{ de: 'Anzahl', en: 'Quantity' }[locale]}>
                        <Input
                            type="number"
                            min={1}
                            max={9999}
                            value={quantity}
                            onChange={(e) => setQuantity(Math.max(1, Number.parseInt(e.target.value, 10) || 1))}
                        />
                    </FieldWithLabel>
                    <FieldWithLabel label={{ de: 'Bezeichnung', en: 'Label' }[locale]} required className="sm:col-span-2">
                        <Input value={label} onChange={(e) => setLabel(e.target.value)} autoFocus />
                    </FieldWithLabel>
                    <FieldWithLabel label={{ de: 'Notizen', en: 'Notes' }[locale]} className="sm:col-span-2">
                        <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
                    </FieldWithLabel>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={onClose} disabled={submitting}>
                        {{ de: 'Abbrechen', en: 'Cancel' }[locale]}
                    </Button>
                    <Button onClick={submit} disabled={submitting || label.trim().length === 0}>
                        {{ de: 'Speichern', en: 'Save' }[locale]}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function DeletePackingItemAlert({ item, locale, onClose }: { item: PackingRow; locale: Locale; onClose: () => void }) {
    const [, del] = useMutation(WorkspaceTripPackingItemsDeleteDocument);
    const [submitting, setSubmitting] = useState(false);
    const doDelete = async () => {
        setSubmitting(true);
        try {
            await del({ tripPackingItemIds: [item.tripPackingItemId] });
            onClose();
        } finally {
            setSubmitting(false);
        }
    };
    return (
        <AlertDialog open onOpenChange={(open) => (open ? undefined : onClose())}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{{ de: 'Item löschen?', en: 'Delete item?' }[locale]}</AlertDialogTitle>
                    <AlertDialogDescription>„{item.label}“</AlertDialogDescription>
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

// --- Field / helpers --------------------------------------------------------

function FieldWithLabel({
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

function formatDate(iso: string | null | undefined, locale: Locale): string {
    if (!iso) return '—';
    try {
        return format(parseISO(iso), 'PP', { locale: DATE_FNS_LOCALE[locale] });
    } catch {
        return iso;
    }
}

function formatDateRange(startsOn: string | null | undefined, endsOn: string | null | undefined, locale: Locale): string {
    if (!startsOn && !endsOn) return '—';
    if (startsOn && endsOn) return `${formatDate(startsOn, locale)} – ${formatDate(endsOn, locale)}`;
    return formatDate(startsOn ?? endsOn, locale);
}

function formatTime(value: string | null | undefined): string {
    if (!value) return '';
    // Accept `HH:MM` or `HH:MM:SS`; trim seconds for display.
    const match = value.match(/^(\d{2}:\d{2})/);
    return match ? match[1]! : value;
}

function normalizeTimeInput(value: string): string | null {
    const trimmed = value.trim();
    if (!trimmed) return null;
    return trimmed;
}

function dateToIso(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

// --- Live user hook ---------------------------------------------------------

function useWorkspaceTravelDetailLiveUser(
    seed: GqlCWorkspaceTravelDetailUserFragment | null | undefined,
    tripId: string,
): GqlCWorkspaceTravelDetailUserFragment | null | undefined {
    const [user, setUser] = useState(seed);

    const client = useClient();
    useEffect(() => {
        const request = createRequest(WorkspaceTravelDetailUpdatesDocument, { tripId });
        const operation = client.executeSubscription<GqlCWorkspaceTravelDetailUpdatesSubscription>(request);
        const { unsubscribe } = pipe(
            operation,
            subscribe((result) => {
                if (result.data) setUser(result.data.userUpdates);
            }),
        );
        return unsubscribe;
    }, [client, tripId]);

    return user;
}
