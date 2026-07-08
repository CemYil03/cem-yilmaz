import { createFileRoute, Link } from '@tanstack/react-router';
import { format } from 'date-fns';
import {
    ActivityIcon,
    AlertTriangleIcon,
    CalendarIcon,
    CheckIcon,
    ClipboardListIcon,
    LayoutDashboardIcon,
    Loader2Icon,
    MoreVerticalIcon,
    PaperclipIcon,
    PencilIcon,
    PlusIcon,
    StethoscopeIcon,
    Trash2Icon,
    XIcon,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '../../../web/components/base/dropdown-menu';
import { Input } from '../../../web/components/base/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../web/components/base/select';
import { Textarea } from '../../../web/components/base/textarea';
import { GlassCard } from '../../../web/components/GlassCard';
import { WorkspaceUnauthorized } from '../../../web/components/WorkspaceUnauthorized';
import { uploadFile } from '../../../web/chat/fileUpload';
import type {
    GqlCMedicalAppointmentStatus,
    GqlCMedicalCategory,
    GqlCMedicalRecordSeverity,
    GqlCWorkspaceMedicalPageAppointmentFragment,
    GqlCWorkspaceMedicalPageRecordFragment,
    GqlCWorkspaceMedicalPageUpdatesSubscription,
    GqlCWorkspaceMedicalPageUserFragment,
} from '../../../web/graphql/generated';
import {
    WorkspaceMedicalAppointmentCompleteDocument,
    WorkspaceMedicalAppointmentDeleteDocument,
    WorkspaceMedicalAppointmentUpsertDocument,
    WorkspaceMedicalPageDocument,
    WorkspaceMedicalPageUpdatesDocument,
    WorkspaceMedicalRecordDeleteDocument,
    WorkspaceMedicalRecordFileAttachDocument,
    WorkspaceMedicalRecordFileDeleteDocument,
    WorkspaceMedicalRecordUpsertDocument,
} from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import { useLocale } from '../../../web/hooks/useLocale';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { cn } from '../../../web/utils/cn';
import { DATE_FNS_LOCALE } from '../../../web/utils/dateFnsLocale';
import type { Locale } from '../../../web/utils/locale';
import { localeFromParam } from '../../../web/utils/locale';

// Admin health journal + appointment tracker. Admin-only, noindex.
// Three tabs: Overview (category cards with cadence-driven overdue flags),
// Appointments (list grouped by category), Records (list of chat-authored
// health write-ups). The medical sub-agent authors most records from the
// workspace assistant chat; this page is the manual editor and read view.
// See `docs/features/workspace-medical.md`.

const pageTitle = { de: 'Medizinisches', en: 'Medical' };
const pageDescription = {
    de: 'Termine, Befunde und Notizen zur Gesundheit.',
    en: 'Appointments, records, and notes about my health.',
};

const CATEGORIES: ReadonlyArray<GqlCMedicalCategory> = ['dentist', 'gp', 'dermatology', 'eyes', 'mentalHealth', 'ent', 'physio', 'other'];

const CATEGORY_LABELS: Record<GqlCMedicalCategory, { de: string; en: string }> = {
    dentist: { de: 'Zahnarzt', en: 'Dentist' },
    gp: { de: 'Hausarzt', en: 'GP' },
    dermatology: { de: 'Hautarzt', en: 'Dermatology' },
    eyes: { de: 'Augenarzt', en: 'Eyes' },
    mentalHealth: { de: 'Psyche', en: 'Mental health' },
    ent: { de: 'HNO', en: 'ENT' },
    physio: { de: 'Physio', en: 'Physio' },
    other: { de: 'Sonstige', en: 'Other' },
};

const APPOINTMENT_STATUS_LABELS: Record<GqlCMedicalAppointmentStatus, { de: string; en: string }> = {
    scheduled: { de: 'Geplant', en: 'Scheduled' },
    completed: { de: 'Erledigt', en: 'Completed' },
    cancelled: { de: 'Abgesagt', en: 'Cancelled' },
    missed: { de: 'Verpasst', en: 'Missed' },
};

const SEVERITY_LABELS: Record<GqlCMedicalRecordSeverity, { de: string; en: string }> = {
    info: { de: 'Info', en: 'Info' },
    mild: { de: 'Leicht', en: 'Mild' },
    moderate: { de: 'Mittel', en: 'Moderate' },
    severe: { de: 'Schwer', en: 'Severe' },
};

type Tab = 'overview' | 'appointments' | 'records';
const TABS = ['overview', 'appointments', 'records'] as const satisfies ReadonlyArray<Tab>;
const TAB_LABELS: Record<Tab, { de: string; en: string }> = {
    overview: { de: 'Übersicht', en: 'Overview' },
    appointments: { de: 'Termine', en: 'Appointments' },
    records: { de: 'Befunde', en: 'Records' },
};
const TAB_ICONS: Record<Tab, typeof LayoutDashboardIcon> = {
    overview: LayoutDashboardIcon,
    appointments: CalendarIcon,
    records: ClipboardListIcon,
};

// URL state. `tab` selects the section; absent = overview.
// `focus` deep-links a card/row across tabs — the page scrolls it into view
// and flashes it briefly on land, then drops the param. Assistant links
// point here (`agentPersonalAssistant` deep-link templates).
const medicalSearchSchema = z.object({
    tab: z.enum(TABS).optional(),
    category: z.enum(CATEGORIES).optional(),
    focus: z.string().optional(),
});

type WorkspaceMedicalAdmin = NonNullable<GqlCWorkspaceMedicalPageUserFragment['admin']>;
type MedicalData = WorkspaceMedicalAdmin['medical'];
type AppointmentRow = GqlCWorkspaceMedicalPageAppointmentFragment;
type RecordRow = GqlCWorkspaceMedicalPageRecordFragment;
type OverviewRow = MedicalData['overview'][number];

export const Route = createFileRoute('/{-$locale}/workspace/medical')({
    validateSearch: medicalSearchSchema,
    loader: () => routeLoaderGraphqlClient(WorkspaceMedicalPageDocument)(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: pageTitle[locale],
            description: pageDescription[locale],
            path: '/workspace/medical',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component: WorkspaceMedical,
});

function WorkspaceMedical() {
    const locale = useLocale();
    const search = Route.useSearch();
    const navigate = Route.useNavigate();
    const data = Route.useLoaderData();
    const tab: Tab = search.tab ?? 'overview';

    // Seed once from the loader, then let `userUpdates` replace it on every
    // server push. Every medical mutation publishes on the user channel
    // already, so we never re-fetch from the client. See
    // `docs/architecture/state-synchronization.md`.
    const user = useWorkspaceMedicalPageLiveUser(data.currentSession.user);
    const admin = user?.admin;
    const medical = admin?.medical;

    // Deep-link focus: chat assistant emits links like
    // `/workspace/medical?tab=records&focus=<id>`. Same shape as `media.tsx`.
    useEffect(() => {
        const focusId = search.focus;
        if (!focusId) return;
        let cancelled = false;
        const frame = requestAnimationFrame(() => {
            if (cancelled) return;
            const el = document.querySelector<HTMLElement>(`[data-row-id="${focusId}"]`);
            if (!el) {
                void navigate({ search: (prev) => ({ ...prev, focus: undefined }), replace: true });
                return;
            }
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.setAttribute('data-focused', 'true');
            window.setTimeout(() => {
                el.removeAttribute('data-focused');
                void navigate({ search: (prev) => ({ ...prev, focus: undefined }), replace: true });
            }, 1500);
        });
        return () => {
            cancelled = true;
            cancelAnimationFrame(frame);
        };
    }, [search.focus, tab, navigate]);

    if (!admin) return <WorkspaceUnauthorized locale={locale} />;
    if (!medical) return null;

    return (
        <main className="px-6 md:px-10 lg:px-16 max-w-8xl mx-auto w-full py-12 leading-relaxed">
            <p className="text-sm text-muted-foreground">{pageDescription[locale]}</p>

            <nav
                className="mt-8 flex gap-1 overflow-x-auto border-b border-border/60 scrollbar-none"
                aria-label={{ de: 'Bereiche', en: 'Sections' }[locale]}
            >
                {TABS.map((t) => {
                    const Icon = TAB_ICONS[t];
                    const isActive = tab === t;
                    return (
                        <Link
                            key={t}
                            to="/{-$locale}/workspace/medical"
                            from="/{-$locale}/workspace/medical"
                            search={(prev) => ({
                                ...prev,
                                tab: t === 'overview' ? undefined : t,
                                focus: undefined,
                            })}
                            replace
                            className={cn(
                                'inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
                                isActive
                                    ? 'border-primary text-foreground'
                                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
                            )}
                        >
                            <Icon className="size-4" />
                            {TAB_LABELS[t][locale]}
                        </Link>
                    );
                })}
            </nav>

            <div className="mt-8">
                {tab === 'overview' && <OverviewTab overview={medical.overview} locale={locale} />}
                {tab === 'appointments' && <AppointmentsTab appointments={medical.appointments} locale={locale} />}
                {tab === 'records' && <RecordsTab records={medical.records} appointments={medical.appointments} locale={locale} />}
            </div>
        </main>
    );
}

// ─── Overview tab ───────────────────────────────────────────────────────────

function OverviewTab({ overview, locale }: { overview: ReadonlyArray<OverviewRow>; locale: Locale }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {overview.map((row) => (
                <OverviewCard key={row.category} row={row} locale={locale} />
            ))}
        </div>
    );
}

function OverviewCard({ row, locale }: { row: OverviewRow; locale: Locale }) {
    const label = CATEGORY_LABELS[row.category][locale];
    const cadence = row.defaultCadenceMonths;
    const lastLabel = row.lastCompletedAt
        ? format(new Date(row.lastCompletedAt), 'PP', { locale: DATE_FNS_LOCALE[locale] })
        : { de: '—', en: '—' }[locale];
    const nextLabel = row.nextDueAt
        ? format(new Date(row.nextDueAt), 'PP', { locale: DATE_FNS_LOCALE[locale] })
        : { de: 'Kein Termin geplant', en: 'No visit scheduled' }[locale];

    return (
        <GlassCard className="p-5">
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                    <StethoscopeIcon className="size-4 text-muted-foreground" />
                    <h3 className="font-semibold">{label}</h3>
                </div>
                {row.isOverdue && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 text-destructive px-2 py-0.5 text-xs font-medium">
                        <AlertTriangleIcon className="size-3" />
                        {{ de: 'Überfällig', en: 'Overdue' }[locale]}
                    </span>
                )}
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                    <dt className="text-muted-foreground">{{ de: 'Letzter Besuch', en: 'Last visit' }[locale]}</dt>
                    <dd className="mt-0.5 font-medium">{lastLabel}</dd>
                </div>
                <div>
                    <dt className="text-muted-foreground">{{ de: 'Nächster Besuch', en: 'Next visit' }[locale]}</dt>
                    <dd className={cn('mt-0.5 font-medium', row.isOverdue && 'text-destructive')}>{nextLabel}</dd>
                </div>
                {cadence !== null && (
                    <div className="col-span-2">
                        <dt className="text-muted-foreground text-xs">{{ de: 'Rhythmus', en: 'Cadence' }[locale]}</dt>
                        <dd className="text-xs">{{ de: `alle ${cadence} Monate`, en: `every ${cadence} months` }[locale]}</dd>
                    </div>
                )}
            </dl>

            {row.upcoming.length > 0 && (
                <div className="mt-4 border-t border-border/60 pt-3">
                    <p className="text-xs text-muted-foreground mb-1.5">{{ de: 'Anstehend', en: 'Upcoming' }[locale]}</p>
                    <ul className="space-y-1 text-sm">
                        {row.upcoming.slice(0, 3).map((a) => (
                            <li key={a.appointmentId} className="flex justify-between gap-2">
                                <span className="truncate">{a.title}</span>
                                <span className="text-muted-foreground shrink-0">
                                    {format(new Date(a.scheduledAt), 'PP', { locale: DATE_FNS_LOCALE[locale] })}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {row.recentRecords.length > 0 && (
                <div className="mt-4 border-t border-border/60 pt-3">
                    <p className="text-xs text-muted-foreground mb-1.5">{{ de: 'Zuletzt notiert', en: 'Recent notes' }[locale]}</p>
                    <ul className="space-y-1 text-sm">
                        {row.recentRecords.slice(0, 3).map((r) => (
                            <li key={r.recordId} className="truncate">
                                <Link
                                    to="/{-$locale}/workspace/medical"
                                    from="/{-$locale}/workspace/medical"
                                    search={{ tab: 'records', focus: r.recordId }}
                                    className="hover:text-primary"
                                >
                                    {r.title}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </GlassCard>
    );
}

// ─── Appointments tab ───────────────────────────────────────────────────────

function AppointmentsTab({ appointments, locale }: { appointments: ReadonlyArray<AppointmentRow>; locale: Locale }) {
    const [editing, setEditing] = useState<AppointmentRow | null>(null);
    const [creating, setCreating] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [, deleteAppointment] = useMutation(WorkspaceMedicalAppointmentDeleteDocument);
    const [, completeAppointment] = useMutation(WorkspaceMedicalAppointmentCompleteDocument);

    const grouped = useMemo(() => {
        const map = new Map<GqlCMedicalCategory, AppointmentRow[]>();
        for (const a of appointments) {
            const list = map.get(a.category) ?? [];
            list.push(a);
            map.set(a.category, list);
        }
        return map;
    }, [appointments]);

    return (
        <div>
            <div className="flex justify-end mb-4">
                <Button onClick={() => setCreating(true)} size="sm">
                    <PlusIcon className="size-4" />
                    {{ de: 'Termin anlegen', en: 'New appointment' }[locale]}
                </Button>
            </div>

            {appointments.length === 0 ? (
                <GlassCard className="p-8 text-center text-sm text-muted-foreground">
                    {{ de: 'Noch keine Termine erfasst.', en: 'No appointments yet.' }[locale]}
                </GlassCard>
            ) : (
                <div className="space-y-6">
                    {CATEGORIES.filter((c) => grouped.has(c)).map((category) => (
                        <section key={category}>
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                                {CATEGORY_LABELS[category][locale]}
                            </h3>
                            <div className="space-y-2">
                                {grouped.get(category)!.map((a) => (
                                    <AppointmentRowCard
                                        key={a.appointmentId}
                                        appointment={a}
                                        locale={locale}
                                        onEdit={() => setEditing(a)}
                                        onDelete={() => setDeletingId(a.appointmentId)}
                                        onComplete={() =>
                                            void completeAppointment({
                                                appointmentId: a.appointmentId,
                                                completedAt: new Date().toISOString(),
                                            })
                                        }
                                    />
                                ))}
                            </div>
                        </section>
                    ))}
                </div>
            )}

            {(creating || editing) && (
                <AppointmentEditor
                    appointment={editing}
                    onClose={() => {
                        setCreating(false);
                        setEditing(null);
                    }}
                    locale={locale}
                />
            )}

            <AlertDialog open={deletingId !== null} onOpenChange={(open) => !open && setDeletingId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{{ de: 'Termin löschen?', en: 'Delete this appointment?' }[locale]}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {
                                {
                                    de: 'Verknüpfte Befunde bleiben erhalten und verlieren nur den Terminbezug.',
                                    en: 'Linked records stay put; only their appointment reference is cleared.',
                                }[locale]
                            }
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{{ de: 'Abbrechen', en: 'Cancel' }[locale]}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (deletingId) void deleteAppointment({ appointmentId: deletingId });
                                setDeletingId(null);
                            }}
                        >
                            {{ de: 'Löschen', en: 'Delete' }[locale]}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

function AppointmentRowCard({
    appointment,
    locale,
    onEdit,
    onDelete,
    onComplete,
}: {
    appointment: AppointmentRow;
    locale: Locale;
    onEdit: () => void;
    onDelete: () => void;
    onComplete: () => void;
}) {
    const isPast = new Date(appointment.scheduledAt).getTime() < Date.now();
    return (
        <GlassCard
            data-row-id={appointment.appointmentId}
            className="p-4 flex items-center gap-4 data-[focused=true]:ring-2 data-[focused=true]:ring-primary transition-shadow"
        >
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-medium truncate">{appointment.title}</h4>
                    <span
                        className={cn(
                            'rounded-full px-2 py-0.5 text-xs',
                            appointment.status === 'scheduled' && 'bg-primary/10 text-primary',
                            appointment.status === 'completed' && 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
                            appointment.status === 'cancelled' && 'bg-muted text-muted-foreground',
                            appointment.status === 'missed' && 'bg-destructive/10 text-destructive',
                        )}
                    >
                        {APPOINTMENT_STATUS_LABELS[appointment.status][locale]}
                    </span>
                </div>
                <div className="mt-1 text-sm text-muted-foreground flex items-center gap-3 flex-wrap">
                    <span>{format(new Date(appointment.scheduledAt), 'PPp', { locale: DATE_FNS_LOCALE[locale] })}</span>
                    {appointment.providerName && <span>· {appointment.providerName}</span>}
                    {appointment.nextDueAt && (
                        <span>
                            · {{ de: 'nächster fällig', en: 'next due' }[locale]}{' '}
                            {format(new Date(appointment.nextDueAt), 'PP', { locale: DATE_FNS_LOCALE[locale] })}
                        </span>
                    )}
                </div>
                {appointment.notes && <p className="mt-2 text-sm">{appointment.notes}</p>}
            </div>
            <div className="flex items-center gap-1 shrink-0">
                {appointment.status === 'scheduled' && isPast && (
                    <Button size="sm" variant="outline" onClick={onComplete}>
                        <CheckIcon className="size-4" />
                        {{ de: 'Erledigt', en: 'Complete' }[locale]}
                    </Button>
                )}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost">
                            <MoreVerticalIcon className="size-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={onEdit}>
                            <PencilIcon className="size-4" />
                            {{ de: 'Bearbeiten', en: 'Edit' }[locale]}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={onDelete} className="text-destructive focus:text-destructive">
                            <Trash2Icon className="size-4" />
                            {{ de: 'Löschen', en: 'Delete' }[locale]}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </GlassCard>
    );
}

function AppointmentEditor({ appointment, onClose, locale }: { appointment: AppointmentRow | null; onClose: () => void; locale: Locale }) {
    const [, upsert] = useMutation(WorkspaceMedicalAppointmentUpsertDocument);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        title: appointment?.title ?? '',
        category: appointment?.category ?? 'other',
        providerName: appointment?.providerName ?? '',
        scheduledAt: appointment?.scheduledAt ? new Date(appointment.scheduledAt) : new Date(),
        nextDueAt: appointment?.nextDueAt ? new Date(appointment.nextDueAt) : null,
        status: appointment?.status ?? 'scheduled',
        notes: appointment?.notes ?? '',
    });

    const handleSave = async () => {
        if (!form.title.trim()) return;
        setSaving(true);
        const result = await upsert({
            input: {
                appointmentId: appointment?.appointmentId ?? null,
                category: form.category,
                providerName: form.providerName.trim() || null,
                title: form.title.trim(),
                notes: form.notes.trim() || null,
                scheduledAt: form.scheduledAt.toISOString(),
                completedAt: appointment?.completedAt ?? null,
                nextDueAt: form.nextDueAt ? form.nextDueAt.toISOString() : null,
                status: form.status,
                topics: appointment?.topics ?? [],
            },
        });
        setSaving(false);
        if (!result.error) onClose();
    };

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {appointment
                            ? { de: 'Termin bearbeiten', en: 'Edit appointment' }[locale]
                            : { de: 'Neuer Termin', en: 'New appointment' }[locale]}
                    </DialogTitle>
                    <DialogDescription>{{ de: 'Details zum Arztbesuch.', en: 'Details of the visit.' }[locale]}</DialogDescription>
                </DialogHeader>

                <div className="space-y-3">
                    <label className="block text-sm">
                        <span className="text-muted-foreground">{{ de: 'Kategorie', en: 'Category' }[locale]}</span>
                        <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v as GqlCMedicalCategory }))}>
                            <SelectTrigger className="mt-1">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {CATEGORIES.map((c) => (
                                    <SelectItem key={c} value={c}>
                                        {CATEGORY_LABELS[c][locale]}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </label>

                    <label className="block text-sm">
                        <span className="text-muted-foreground">{{ de: 'Titel', en: 'Title' }[locale]}</span>
                        <Input
                            className="mt-1"
                            value={form.title}
                            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                            placeholder={{ de: 'z. B. Kontrolluntersuchung', en: 'e.g. routine check-up' }[locale]}
                        />
                    </label>

                    <label className="block text-sm">
                        <span className="text-muted-foreground">{{ de: 'Arzt / Praxis', en: 'Provider' }[locale]}</span>
                        <Input
                            className="mt-1"
                            value={form.providerName}
                            onChange={(e) => setForm((f) => ({ ...f, providerName: e.target.value }))}
                            placeholder={{ de: 'z. B. Dr. Schmidt', en: 'e.g. Dr Schmidt' }[locale]}
                        />
                    </label>

                    <div className="grid grid-cols-2 gap-3">
                        <label className="block text-sm">
                            <span className="text-muted-foreground">{{ de: 'Termin', en: 'When' }[locale]}</span>
                            <DatePicker value={form.scheduledAt} onValueChange={(d) => d && setForm((f) => ({ ...f, scheduledAt: d }))} />
                        </label>
                        <label className="block text-sm">
                            <span className="text-muted-foreground">{{ de: 'Nächster fällig', en: 'Next due' }[locale]}</span>
                            <DatePicker
                                value={form.nextDueAt ?? undefined}
                                onValueChange={(d) => setForm((f) => ({ ...f, nextDueAt: d ?? null }))}
                            />
                        </label>
                    </div>

                    <label className="block text-sm">
                        <span className="text-muted-foreground">{{ de: 'Status', en: 'Status' }[locale]}</span>
                        <Select
                            value={form.status}
                            onValueChange={(v) => setForm((f) => ({ ...f, status: v as GqlCMedicalAppointmentStatus }))}
                        >
                            <SelectTrigger className="mt-1">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {(['scheduled', 'completed', 'cancelled', 'missed'] as const).map((s) => (
                                    <SelectItem key={s} value={s}>
                                        {APPOINTMENT_STATUS_LABELS[s][locale]}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </label>

                    <label className="block text-sm">
                        <span className="text-muted-foreground">{{ de: 'Notizen', en: 'Notes' }[locale]}</span>
                        <Textarea
                            className="mt-1"
                            rows={3}
                            value={form.notes}
                            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                        />
                    </label>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={onClose} disabled={saving}>
                        {{ de: 'Abbrechen', en: 'Cancel' }[locale]}
                    </Button>
                    <Button onClick={handleSave} disabled={saving || !form.title.trim()}>
                        {saving && <Loader2Icon className="size-4 animate-spin" />}
                        {{ de: 'Speichern', en: 'Save' }[locale]}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─── Records tab ────────────────────────────────────────────────────────────

function RecordsTab({
    records,
    appointments,
    locale,
}: {
    records: ReadonlyArray<RecordRow>;
    appointments: ReadonlyArray<AppointmentRow>;
    locale: Locale;
}) {
    const [editing, setEditing] = useState<RecordRow | null>(null);
    const [creating, setCreating] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [, deleteRecord] = useMutation(WorkspaceMedicalRecordDeleteDocument);

    return (
        <div>
            <div className="flex justify-end mb-4">
                <Button onClick={() => setCreating(true)} size="sm">
                    <PlusIcon className="size-4" />
                    {{ de: 'Befund anlegen', en: 'New record' }[locale]}
                </Button>
            </div>

            {records.length === 0 ? (
                <GlassCard className="p-8 text-center text-sm text-muted-foreground">
                    {
                        {
                            de: 'Noch keine Befunde. Frage deinen Assistenten oder lege manuell einen an.',
                            en: 'No records yet. Ask your assistant or add one manually.',
                        }[locale]
                    }
                </GlassCard>
            ) : (
                <div className="space-y-3">
                    {records.map((r) => (
                        <RecordCard
                            key={r.recordId}
                            record={r}
                            locale={locale}
                            onEdit={() => setEditing(r)}
                            onDelete={() => setDeletingId(r.recordId)}
                        />
                    ))}
                </div>
            )}

            {(creating || editing) && (
                <RecordEditor
                    record={editing}
                    appointments={appointments}
                    onClose={() => {
                        setCreating(false);
                        setEditing(null);
                    }}
                    locale={locale}
                />
            )}

            <AlertDialog open={deletingId !== null} onOpenChange={(open) => !open && setDeletingId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{{ de: 'Befund löschen?', en: 'Delete this record?' }[locale]}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {
                                {
                                    de: 'Angehängte Dateien werden ebenfalls entfernt.',
                                    en: 'Attached files are removed with the record.',
                                }[locale]
                            }
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{{ de: 'Abbrechen', en: 'Cancel' }[locale]}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (deletingId) void deleteRecord({ recordId: deletingId });
                                setDeletingId(null);
                            }}
                        >
                            {{ de: 'Löschen', en: 'Delete' }[locale]}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

function RecordCard({ record, locale, onEdit, onDelete }: { record: RecordRow; locale: Locale; onEdit: () => void; onDelete: () => void }) {
    const [, deleteFile] = useMutation(WorkspaceMedicalRecordFileDeleteDocument);
    const dateLabel = record.occurredAt
        ? format(new Date(record.occurredAt), 'PP', { locale: DATE_FNS_LOCALE[locale] })
        : format(new Date(record.createdAt), 'PP', { locale: DATE_FNS_LOCALE[locale] });

    return (
        <GlassCard
            data-row-id={record.recordId}
            className="p-4 data-[focused=true]:ring-2 data-[focused=true]:ring-primary transition-shadow"
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-medium">{record.title}</h4>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{CATEGORY_LABELS[record.category][locale]}</span>
                        {record.severity && (
                            <span
                                className={cn(
                                    'rounded-full px-2 py-0.5 text-xs',
                                    record.severity === 'info' && 'bg-muted text-muted-foreground',
                                    record.severity === 'mild' && 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
                                    record.severity === 'moderate' && 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
                                    record.severity === 'severe' && 'bg-destructive/10 text-destructive',
                                )}
                            >
                                {SEVERITY_LABELS[record.severity][locale]}
                            </span>
                        )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{dateLabel}</p>
                    <p className="mt-2 text-sm whitespace-pre-wrap">{record.summary}</p>

                    {(record.symptoms.length > 0 || record.bodyAreas.length > 0) && (
                        <div className="mt-2 flex gap-1.5 flex-wrap text-xs">
                            {record.symptoms.map((s) => (
                                <span key={`s-${s}`} className="rounded-full bg-primary/10 text-primary px-2 py-0.5">
                                    <ActivityIcon className="size-3 inline mr-1" />
                                    {s}
                                </span>
                            ))}
                            {record.bodyAreas.map((b) => (
                                <span key={`b-${b}`} className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                                    {b}
                                </span>
                            ))}
                        </div>
                    )}

                    {record.files.length > 0 && (
                        <div className="mt-3 flex gap-2 flex-wrap">
                            {record.files.map((f) => {
                                const isImage = f.fileUpload.mediaType.startsWith('image/');
                                return (
                                    <div key={f.recordFileId} className="group relative">
                                        {isImage ? (
                                            <a
                                                href={f.fileUpload.url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="block size-20 rounded-md overflow-hidden border border-border"
                                            >
                                                <img
                                                    src={f.fileUpload.url}
                                                    alt={f.label ?? f.fileUpload.filename}
                                                    className="size-full object-cover"
                                                />
                                            </a>
                                        ) : (
                                            <a
                                                href={f.fileUpload.url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="flex items-center gap-2 rounded-md border border-border bg-muted px-3 py-2 text-xs hover:bg-muted/70"
                                            >
                                                <PaperclipIcon className="size-3" />
                                                {f.fileUpload.filename}
                                            </a>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => void deleteFile({ recordFileId: f.recordFileId })}
                                            className="absolute -top-1.5 -right-1.5 size-5 rounded-full bg-background border border-border opacity-0 group-hover:opacity-100 hover:bg-destructive hover:text-destructive-foreground transition"
                                            aria-label={{ de: 'Datei entfernen', en: 'Remove file' }[locale]}
                                        >
                                            <XIcon className="size-3 mx-auto" />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost">
                            <MoreVerticalIcon className="size-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={onEdit}>
                            <PencilIcon className="size-4" />
                            {{ de: 'Bearbeiten', en: 'Edit' }[locale]}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={onDelete} className="text-destructive focus:text-destructive">
                            <Trash2Icon className="size-4" />
                            {{ de: 'Löschen', en: 'Delete' }[locale]}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </GlassCard>
    );
}

function RecordEditor({
    record,
    appointments,
    onClose,
    locale,
}: {
    record: RecordRow | null;
    appointments: ReadonlyArray<AppointmentRow>;
    onClose: () => void;
    locale: Locale;
}) {
    const [, upsert] = useMutation(WorkspaceMedicalRecordUpsertDocument);
    const [, attachFile] = useMutation(WorkspaceMedicalRecordFileAttachDocument);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [form, setForm] = useState({
        title: record?.title ?? '',
        category: record?.category ?? 'other',
        summary: record?.summary ?? '',
        severity: record?.severity ?? null,
        symptomsText: record?.symptoms.join(', ') ?? '',
        bodyAreasText: record?.bodyAreas.join(', ') ?? '',
        occurredAt: record?.occurredAt ? new Date(record.occurredAt) : new Date(),
        appointmentId: record?.appointmentId ?? null,
    });

    // Pending file uploads staged during a create — attached inline via the
    // upsert's `fileUploadIds` argument. On edit, uploads go straight to the
    // existing record via `medicalRecordFileAttach`.
    const [pendingFileIds, setPendingFileIds] = useState<string[]>([]);

    const handleFilePick = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;
        setUploading(true);
        for (const file of Array.from(files)) {
            try {
                const upload = await uploadFile(file);
                if (record) {
                    await attachFile({
                        input: { recordId: record.recordId, fileUploadId: upload.fileUploadId, label: null, pinned: false },
                    });
                } else {
                    setPendingFileIds((prev) => [...prev, upload.fileUploadId]);
                }
            } catch (err) {
                console.error('medical: file upload failed', err);
            }
        }
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSave = async () => {
        if (!form.title.trim() || !form.summary.trim()) return;
        setSaving(true);
        const symptoms = form.symptomsText
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
        const bodyAreas = form.bodyAreasText
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
        const result = await upsert({
            input: {
                recordId: record?.recordId ?? null,
                category: form.category,
                title: form.title.trim(),
                summary: form.summary.trim(),
                severity: form.severity,
                symptoms,
                bodyAreas,
                occurredAt: form.occurredAt.toISOString(),
                resolvedAt: record?.resolvedAt ?? null,
                appointmentId: form.appointmentId,
                topics: record?.topics ?? [],
                fileUploadIds: pendingFileIds.length > 0 ? pendingFileIds : null,
            },
        });
        setSaving(false);
        if (!result.error) onClose();
    };

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>
                        {record ? { de: 'Befund bearbeiten', en: 'Edit record' }[locale] : { de: 'Neuer Befund', en: 'New record' }[locale]}
                    </DialogTitle>
                    <DialogDescription>
                        {
                            {
                                de: 'Beschreibung, Symptome und optionale Anhänge.',
                                en: 'Description, symptoms, and optional attachments.',
                            }[locale]
                        }
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <label className="block text-sm">
                            <span className="text-muted-foreground">{{ de: 'Kategorie', en: 'Category' }[locale]}</span>
                            <Select
                                value={form.category}
                                onValueChange={(v) => setForm((f) => ({ ...f, category: v as GqlCMedicalCategory }))}
                            >
                                <SelectTrigger className="mt-1">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {CATEGORIES.map((c) => (
                                        <SelectItem key={c} value={c}>
                                            {CATEGORY_LABELS[c][locale]}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </label>
                        <label className="block text-sm">
                            <span className="text-muted-foreground">{{ de: 'Schwere', en: 'Severity' }[locale]}</span>
                            <Select
                                value={form.severity ?? '__none'}
                                onValueChange={(v) =>
                                    setForm((f) => ({ ...f, severity: v === '__none' ? null : (v as GqlCMedicalRecordSeverity) }))
                                }
                            >
                                <SelectTrigger className="mt-1">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__none">{{ de: 'Keine', en: 'None' }[locale]}</SelectItem>
                                    {(['info', 'mild', 'moderate', 'severe'] as const).map((s) => (
                                        <SelectItem key={s} value={s}>
                                            {SEVERITY_LABELS[s][locale]}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </label>
                    </div>

                    <label className="block text-sm">
                        <span className="text-muted-foreground">{{ de: 'Titel', en: 'Title' }[locale]}</span>
                        <Input
                            className="mt-1"
                            value={form.title}
                            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                            placeholder={{ de: 'z. B. Hautausschlag am Unterarm', en: 'e.g. forearm rash' }[locale]}
                        />
                    </label>

                    <label className="block text-sm">
                        <span className="text-muted-foreground">{{ de: 'Zusammenfassung', en: 'Summary' }[locale]}</span>
                        <Textarea
                            className="mt-1"
                            rows={4}
                            value={form.summary}
                            onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
                        />
                    </label>

                    <div className="grid grid-cols-2 gap-3">
                        <label className="block text-sm">
                            <span className="text-muted-foreground">
                                {{ de: 'Symptome (Komma-getrennt)', en: 'Symptoms (comma-sep.)' }[locale]}
                            </span>
                            <Input
                                className="mt-1"
                                value={form.symptomsText}
                                onChange={(e) => setForm((f) => ({ ...f, symptomsText: e.target.value }))}
                                placeholder={{ de: 'Juckreiz, Rötung', en: 'itch, redness' }[locale]}
                            />
                        </label>
                        <label className="block text-sm">
                            <span className="text-muted-foreground">
                                {{ de: 'Körperregion (Komma-getrennt)', en: 'Body areas (comma-sep.)' }[locale]}
                            </span>
                            <Input
                                className="mt-1"
                                value={form.bodyAreasText}
                                onChange={(e) => setForm((f) => ({ ...f, bodyAreasText: e.target.value }))}
                                placeholder={{ de: 'Unterarm', en: 'forearm' }[locale]}
                            />
                        </label>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <label className="block text-sm">
                            <span className="text-muted-foreground">{{ de: 'Aufgetreten', en: 'Occurred at' }[locale]}</span>
                            <DatePicker value={form.occurredAt} onValueChange={(d) => d && setForm((f) => ({ ...f, occurredAt: d }))} />
                        </label>
                        <label className="block text-sm">
                            <span className="text-muted-foreground">{{ de: 'Zugehöriger Termin', en: 'Related appointment' }[locale]}</span>
                            <Select
                                value={form.appointmentId ?? '__none'}
                                onValueChange={(v) => setForm((f) => ({ ...f, appointmentId: v === '__none' ? null : v }))}
                            >
                                <SelectTrigger className="mt-1">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__none">{{ de: 'Keiner', en: 'None' }[locale]}</SelectItem>
                                    {appointments.map((a) => (
                                        <SelectItem key={a.appointmentId} value={a.appointmentId}>
                                            {a.title} · {format(new Date(a.scheduledAt), 'PP', { locale: DATE_FNS_LOCALE[locale] })}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </label>
                    </div>

                    <div className="border-t border-border/60 pt-3">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">
                                {{ de: 'Anhänge', en: 'Attachments' }[locale]}
                                {pendingFileIds.length > 0 && ` (${pendingFileIds.length})`}
                            </p>
                            <input ref={fileInputRef} type="file" multiple hidden onChange={handleFilePick} />
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                            >
                                {uploading ? <Loader2Icon className="size-4 animate-spin" /> : <PaperclipIcon className="size-4" />}
                                {{ de: 'Datei hinzufügen', en: 'Add file' }[locale]}
                            </Button>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={onClose} disabled={saving}>
                        {{ de: 'Abbrechen', en: 'Cancel' }[locale]}
                    </Button>
                    <Button onClick={handleSave} disabled={saving || !form.title.trim() || !form.summary.trim()}>
                        {saving && <Loader2Icon className="size-4 animate-spin" />}
                        {{ de: 'Speichern', en: 'Save' }[locale]}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─── Seed-and-subscribe ─────────────────────────────────────────────────────

// Seed-and-Subscribe: the route loader provides the initial `user`, then the
// `userUpdates` subscription replaces it with the same fragment shape on
// every server push. Imperative URQL — not `useSubscription` — because
// URQL's declarative hook can deliver each event more than once under
// concurrent React. Mirrors `useWorkspaceMediaPageLiveUser`.
function useWorkspaceMedicalPageLiveUser(
    seed: GqlCWorkspaceMedicalPageUserFragment | null | undefined,
): GqlCWorkspaceMedicalPageUserFragment | null | undefined {
    const [user, setUser] = useState(seed);
    const client = useClient();
    useEffect(() => {
        const request = createRequest(WorkspaceMedicalPageUpdatesDocument, {});
        const operation = client.executeSubscription<GqlCWorkspaceMedicalPageUpdatesSubscription>(request);
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
