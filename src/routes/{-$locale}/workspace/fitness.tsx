import { createFileRoute, Link } from '@tanstack/react-router';
import { formatDate, formatIsoDate } from '../../../shared';
import { ChevronDownIcon, DumbbellIcon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../web/components/base/dialog';
import { Input } from '../../../web/components/base/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../web/components/base/select';
import { Switch } from '../../../web/components/base/switch';
import { Textarea } from '../../../web/components/base/textarea';
import { DateField } from '../../../web/components/DateField';
import { GlassCard } from '../../../web/components/GlassCard';
import { WorkspaceUnauthorized } from '../../../web/components/WorkspaceUnauthorized';
import type {
    GqlCAdminFitnessEquipmentType,
    GqlCAdminFitnessMuscleGroup,
    GqlCWorkspaceFitnessPageUpdatesSubscription,
    GqlCWorkspaceFitnessPageUserFragment,
} from '../../../web/graphql/generated';
import {
    WorkspaceExercisesDeleteDocument,
    WorkspaceExercisesUpsertDocument,
    WorkspaceFitnessPageDocument,
    WorkspaceFitnessPageUpdatesDocument,
    WorkspaceWorkoutRoutineItemsUpsertDocument,
    WorkspaceWorkoutRoutinesDeleteDocument,
    WorkspaceWorkoutRoutinesUpsertDocument,
    WorkspaceWorkoutSessionsDeleteDocument,
    WorkspaceWorkoutSessionsUpsertDocument,
    WorkspaceWorkoutSetsDeleteDocument,
    WorkspaceWorkoutSetsUpsertDocument,
} from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import { useLocale } from '../../../web/hooks/useLocale';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { cn } from '../../../web/utils/cn';
import type { Locale } from '../../../web/utils/locale';
import { localeFromParam } from '../../../web/utils/locale';

// Admin editor for Cem's training: gym log (sessions → sets), reusable
// routines, and an exercise catalog. Admin-only, `noindex`. The fitness
// sub-agent writes the same rows via the same GraphQL mutations — logging
// "5×5 squats at 100kg" in chat surfaces here immediately. See
// `docs/features/workspace-fitness.md`.

const title = { de: 'Fitness', en: 'Fitness' };
const description = { de: 'Training, Fortschritt und Routinen.', en: 'Workouts, progress, and routines.' };

const MUSCLE_GROUPS: ReadonlyArray<GqlCAdminFitnessMuscleGroup> = [
    'chest',
    'back',
    'legs',
    'shoulders',
    'arms',
    'core',
    'fullBody',
    'cardio',
    'other',
];
const MUSCLE_GROUP_LABELS: Record<GqlCAdminFitnessMuscleGroup, { de: string; en: string }> = {
    chest: { de: 'Brust', en: 'Chest' },
    back: { de: 'Rücken', en: 'Back' },
    legs: { de: 'Beine', en: 'Legs' },
    shoulders: { de: 'Schultern', en: 'Shoulders' },
    arms: { de: 'Arme', en: 'Arms' },
    core: { de: 'Rumpf', en: 'Core' },
    fullBody: { de: 'Ganzkörper', en: 'Full body' },
    cardio: { de: 'Cardio', en: 'Cardio' },
    other: { de: 'Sonstiges', en: 'Other' },
};

const EQUIPMENT_TYPES: ReadonlyArray<GqlCAdminFitnessEquipmentType> = [
    'barbell',
    'dumbbell',
    'machine',
    'cable',
    'bodyweight',
    'kettlebell',
    'other',
];
const EQUIPMENT_LABELS: Record<GqlCAdminFitnessEquipmentType, { de: string; en: string }> = {
    barbell: { de: 'Langhantel', en: 'Barbell' },
    dumbbell: { de: 'Kurzhantel', en: 'Dumbbell' },
    machine: { de: 'Maschine', en: 'Machine' },
    cable: { de: 'Kabelzug', en: 'Cable' },
    bodyweight: { de: 'Körpergewicht', en: 'Bodyweight' },
    kettlebell: { de: 'Kettlebell', en: 'Kettlebell' },
    other: { de: 'Sonstiges', en: 'Other' },
};

type FitnessTab = 'workouts' | 'routines' | 'exercises';
const TAB_ORDER: ReadonlyArray<FitnessTab> = ['workouts', 'routines', 'exercises'];
const TAB_LABELS: Record<FitnessTab, { de: string; en: string }> = {
    workouts: { de: 'Training', en: 'Workouts' },
    routines: { de: 'Routinen', en: 'Routines' },
    exercises: { de: 'Übungen', en: 'Exercises' },
};

const fitnessSearchSchema = z.object({
    tab: z.enum(TAB_ORDER).optional(),
    focus: z.string().optional(),
});

type FitnessAdmin = NonNullable<GqlCWorkspaceFitnessPageUserFragment['admin']>;
type FitnessData = FitnessAdmin['adminFitnessFindOne'];
type ExerciseRow = FitnessData['adminFitnessExerciseFindMany'][number];
type RoutineRow = FitnessData['adminFitnessRoutineFindMany'][number];
type SessionRow = FitnessData['adminFitnessSessionFindMany'][number];
type SetRow = SessionRow['sets'][number];

export const Route = createFileRoute('/{-$locale}/workspace/fitness')({
    validateSearch: fitnessSearchSchema,
    loader: () => routeLoaderGraphqlClient(WorkspaceFitnessPageDocument)(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: title[locale],
            description: description[locale],
            path: '/workspace/fitness',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component: FitnessArea,
});

function FitnessArea() {
    const locale = useLocale();
    const data = Route.useLoaderData();
    const search = Route.useSearch();
    const navigate = Route.useNavigate();
    const user = useWorkspaceFitnessLiveUser(data.sessionFindOne.user);
    const admin = user?.admin;
    const fitness = admin?.adminFitnessFindOne;
    const tab: FitnessTab = search.tab ?? 'workouts';

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
    if (!fitness) return null;

    return (
        <main className="px-6 md:px-10 lg:px-16 max-w-8xl mx-auto w-full py-12 leading-relaxed">
            <p className="text-sm text-muted-foreground">{description[locale]}</p>

            <nav
                className="mt-8 flex gap-1 overflow-x-auto overflow-y-hidden border-b border-border/60 no-scrollbar scroll-fade-x"
                aria-label={{ de: 'Bereiche', en: 'Sections' }[locale]}
            >
                {TAB_ORDER.map((t) => {
                    const isActive = tab === t;
                    return (
                        <Link
                            key={t}
                            to="/{-$locale}/workspace/fitness"
                            from="/{-$locale}/workspace/fitness"
                            search={(prev) => ({ ...prev, tab: t === 'workouts' ? undefined : t, focus: undefined })}
                            replace
                            className={cn(
                                'inline-flex shrink-0 items-center gap-2 whitespace-nowrap px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
                                isActive
                                    ? 'border-primary text-foreground'
                                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
                            )}
                            aria-current={isActive ? 'page' : undefined}
                        >
                            {TAB_LABELS[t][locale]}
                        </Link>
                    );
                })}
            </nav>

            <div className="mt-8">
                {tab === 'workouts' && (
                    <WorkoutsTab
                        sessions={fitness.adminFitnessSessionFindMany}
                        exercises={fitness.adminFitnessExerciseFindMany}
                        routines={fitness.adminFitnessRoutineFindMany}
                        locale={locale}
                    />
                )}
                {tab === 'routines' && (
                    <RoutinesTab
                        routines={fitness.adminFitnessRoutineFindMany}
                        exercises={fitness.adminFitnessExerciseFindMany}
                        locale={locale}
                    />
                )}
                {tab === 'exercises' && <ExercisesTab exercises={fitness.adminFitnessExerciseFindMany} locale={locale} />}
            </div>
        </main>
    );
}

// --- Workouts tab -----------------------------------------------------------

function WorkoutsTab({
    sessions,
    exercises,
    routines,
    locale,
}: {
    sessions: ReadonlyArray<SessionRow>;
    exercises: ReadonlyArray<ExerciseRow>;
    routines: ReadonlyArray<RoutineRow>;
    locale: Locale;
}) {
    const [editingSession, setEditingSession] = useState<SessionRow | 'new' | null>(null);
    const [deletingSession, setDeletingSession] = useState<SessionRow | null>(null);

    return (
        <div>
            <div className="flex justify-end">
                <Button
                    size="sm"
                    onClick={() => setEditingSession('new')}
                    disabled={exercises.length === 0}
                    title={exercises.length === 0 ? { de: 'Erst eine Übung anlegen', en: 'Add an exercise first' }[locale] : undefined}
                >
                    <PlusIcon className="size-4" />
                    {{ de: 'Neues Training', en: 'New workout' }[locale]}
                </Button>
            </div>

            {sessions.length === 0 ? (
                <GlassCard className="mt-6 px-6 py-10 text-center">
                    <DumbbellIcon className="mx-auto size-8 text-muted-foreground/60" aria-hidden />
                    <h2 className="mt-3 text-base font-semibold">{{ de: 'Noch kein Training', en: 'No workouts yet' }[locale]}</h2>
                    <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                        {
                            {
                                de: 'Protokolliere dein erstes Training — oder sag deinem Assistenten „5×5 Kniebeugen mit 100 kg heute“.',
                                en: 'Log your first workout — or tell the assistant "5×5 squats at 100kg today".',
                            }[locale]
                        }
                    </p>
                </GlassCard>
            ) : (
                <div className="mt-6 space-y-3">
                    {sessions.map((session) => (
                        <SessionCard
                            key={session.sessionId}
                            session={session}
                            exercises={exercises}
                            locale={locale}
                            onEdit={() => setEditingSession(session)}
                            onDelete={() => setDeletingSession(session)}
                        />
                    ))}
                </div>
            )}

            {editingSession !== null ? (
                <EditSessionDialog
                    initial={editingSession === 'new' ? null : editingSession}
                    routines={routines}
                    locale={locale}
                    onClose={() => setEditingSession(null)}
                />
            ) : null}
            {deletingSession !== null ? (
                <DeleteAlert
                    heading={{ de: 'Training löschen?', en: 'Delete this workout?' }[locale]}
                    body={
                        {
                            de: `Das Training vom ${formatDate(deletingSession.date, { locale })} wird mit allen Sätzen entfernt.`,
                            en: `The workout from ${formatDate(deletingSession.date, { locale })} will be removed along with all its sets.`,
                        }[locale]
                    }
                    locale={locale}
                    mutation="session"
                    ids={[deletingSession.sessionId]}
                    onClose={() => setDeletingSession(null)}
                />
            ) : null}
        </div>
    );
}

function SessionCard({
    session,
    exercises,
    locale,
    onEdit,
    onDelete,
}: {
    session: SessionRow;
    exercises: ReadonlyArray<ExerciseRow>;
    locale: Locale;
    onEdit: () => void;
    onDelete: () => void;
}) {
    const [open, setOpen] = useState(false);
    const [addingSet, setAddingSet] = useState(false);
    const [editingSet, setEditingSet] = useState<SetRow | null>(null);
    const [deletingSet, setDeletingSet] = useState<SetRow | null>(null);

    return (
        <GlassCard
            className="px-4 py-3 data-[focused=true]:ring-2 data-[focused=true]:ring-primary transition-shadow"
            data-row-id={session.sessionId}
        >
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={() => setOpen((v) => !v)}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    aria-expanded={open}
                >
                    <ChevronDownIcon className={cn('size-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
                    <div className="min-w-0">
                        <div className="text-sm font-semibold truncate">{session.title || formatDate(session.date, { locale })}</div>
                        <div className="text-xs text-muted-foreground">
                            {formatDate(session.date, { locale })} ·{' '}
                            {{ de: `${session.sets.length} Sätze`, en: `${session.sets.length} sets` }[locale]}
                            {session.durationMinutes ? ` · ${session.durationMinutes} min` : ''}
                        </div>
                    </div>
                </button>
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={onEdit}
                        aria-label={{ de: 'Bearbeiten', en: 'Edit' }[locale]}
                    >
                        <PencilIcon className="size-3.5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-destructive/70 hover:text-destructive"
                        onClick={onDelete}
                        aria-label={{ de: 'Löschen', en: 'Delete' }[locale]}
                    >
                        <Trash2Icon className="size-3.5" />
                    </Button>
                </div>
            </div>

            {open ? (
                <div className="mt-3 border-t border-border/50 pt-3">
                    {session.sets.length === 0 ? (
                        <p className="text-xs text-muted-foreground">{{ de: 'Noch keine Sätze.', en: 'No sets yet.' }[locale]}</p>
                    ) : (
                        <ul className="space-y-1">
                            {session.sets.map((set, i) => (
                                <li key={set.setId} className="flex items-center gap-3 text-sm">
                                    <span className="w-5 shrink-0 text-xs text-muted-foreground tabular-nums">{i + 1}</span>
                                    <span className="min-w-0 flex-1 truncate">{set.exercise.name}</span>
                                    <span className="shrink-0 tabular-nums text-muted-foreground">{formatSet(set, locale)}</span>
                                    <div className="flex shrink-0 items-center gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="size-6"
                                            onClick={() => setEditingSet(set)}
                                            aria-label={{ de: 'Satz bearbeiten', en: 'Edit set' }[locale]}
                                        >
                                            <PencilIcon className="size-3" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="size-6 text-destructive/70 hover:text-destructive"
                                            onClick={() => setDeletingSet(set)}
                                            aria-label={{ de: 'Satz löschen', en: 'Delete set' }[locale]}
                                        >
                                            <Trash2Icon className="size-3" />
                                        </Button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                    <Button variant="ghost" size="sm" className="mt-2" onClick={() => setAddingSet(true)}>
                        <PlusIcon className="size-3.5" />
                        {{ de: 'Satz hinzufügen', en: 'Add set' }[locale]}
                    </Button>
                </div>
            ) : null}

            {addingSet || editingSet ? (
                <EditSetDialog
                    sessionId={session.sessionId}
                    initial={editingSet}
                    exercises={exercises}
                    locale={locale}
                    onClose={() => {
                        setAddingSet(false);
                        setEditingSet(null);
                    }}
                />
            ) : null}
            {deletingSet ? (
                <DeleteAlert
                    heading={{ de: 'Satz löschen?', en: 'Delete this set?' }[locale]}
                    body={`${deletingSet.exercise.name} · ${formatSet(deletingSet, locale)}`}
                    locale={locale}
                    mutation="set"
                    ids={[deletingSet.setId]}
                    onClose={() => setDeletingSet(null)}
                />
            ) : null}
        </GlassCard>
    );
}

type SessionFormState = {
    sessionId: string | null;
    date: string;
    title: string;
    routineId: string;
    durationMinutes: string;
    notes: string;
};

function EditSessionDialog({
    initial,
    routines,
    locale,
    onClose,
}: {
    initial: SessionRow | null;
    routines: ReadonlyArray<RoutineRow>;
    locale: Locale;
    onClose: () => void;
}) {
    const isNew = initial === null;
    const [state, setState] = useState<SessionFormState>(() => ({
        sessionId: initial?.sessionId ?? null,
        date: initial?.date ?? formatIsoDate(new Date()),
        title: initial?.title ?? '',
        routineId: initial?.routineId ?? 'none',
        durationMinutes: initial?.durationMinutes != null ? String(initial.durationMinutes) : '',
        notes: initial?.notes ?? '',
    }));
    const [, upsertSession] = useMutation(WorkspaceWorkoutSessionsUpsertDocument);
    const [, upsertSets] = useMutation(WorkspaceWorkoutSetsUpsertDocument);
    const [submitting, setSubmitting] = useState(false);

    const submit = async () => {
        setSubmitting(true);
        try {
            const routineId = state.routineId === 'none' ? null : state.routineId;
            const result = await upsertSession({
                workoutSessions: [
                    {
                        sessionId: state.sessionId,
                        date: state.date,
                        title: state.title.trim() || null,
                        routineId,
                        durationMinutes: parseIntOrNull(state.durationMinutes),
                        notes: state.notes.trim() || null,
                    },
                ],
            });
            if (result.error) return;

            // Seeding: a brand-new session created from a routine gets one set
            // per routine item (target weight/reps carried over) so the log
            // starts pre-filled.
            const newSessionId = result.data?.admin.adminFitnessWorkoutSessionsUpsert.referenceIds?.[0];
            if (isNew && routineId && newSessionId) {
                const routine = routines.find((r) => r.routineId === routineId);
                if (routine && routine.items.length > 0) {
                    await upsertSets({
                        workoutSets: routine.items.map((item, index) => ({
                            setId: null,
                            sessionId: newSessionId,
                            exerciseId: item.exercise.exerciseId,
                            position: index,
                            weight: item.targetWeight ?? null,
                            reps: item.targetReps ?? null,
                            rpe: null,
                            isWarmup: false,
                            notes: null,
                        })),
                    });
                }
            }
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
                            ? { de: 'Neues Training', en: 'New workout' }[locale]
                            : { de: 'Training bearbeiten', en: 'Edit workout' }[locale]}
                    </DialogTitle>
                    <DialogDescription>
                        {
                            {
                                de: 'Basisdaten. Sätze fügst du danach am Training hinzu — oder starte aus einer Routine.',
                                en: 'Base facts. Add sets on the workout afterwards — or seed them from a routine.',
                            }[locale]
                        }
                    </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label={{ de: 'Datum', en: 'Date' }[locale]} required>
                        <DateField
                            value={state.date}
                            onChange={(next) => setState((s) => ({ ...s, date: next }))}
                            required
                            locale={locale}
                        />
                    </Field>
                    <Field label={{ de: 'Titel', en: 'Title' }[locale]}>
                        <Input
                            value={state.title}
                            onChange={(e) => setState((s) => ({ ...s, title: e.target.value }))}
                            placeholder={{ de: 'z. B. Push Day', en: 'e.g. Push day' }[locale]}
                        />
                    </Field>
                    {isNew ? (
                        <Field label={{ de: 'Aus Routine starten', en: 'Start from routine' }[locale]}>
                            <Select value={state.routineId} onValueChange={(v) => setState((s) => ({ ...s, routineId: v }))}>
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">{{ de: '– keine –', en: '– none –' }[locale]}</SelectItem>
                                    {routines.map((r) => (
                                        <SelectItem key={r.routineId} value={r.routineId}>
                                            {r.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </Field>
                    ) : null}
                    <Field label={{ de: 'Dauer (min)', en: 'Duration (min)' }[locale]}>
                        <Input
                            type="number"
                            min={0}
                            value={state.durationMinutes}
                            onChange={(e) => setState((s) => ({ ...s, durationMinutes: e.target.value }))}
                        />
                    </Field>
                    <Field label={{ de: 'Notizen', en: 'Notes' }[locale]} className="sm:col-span-2">
                        <Textarea rows={2} value={state.notes} onChange={(e) => setState((s) => ({ ...s, notes: e.target.value }))} />
                    </Field>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={onClose} disabled={submitting}>
                        {{ de: 'Abbrechen', en: 'Cancel' }[locale]}
                    </Button>
                    <Button onClick={submit} disabled={submitting || state.date.trim().length === 0}>
                        {{ de: 'Speichern', en: 'Save' }[locale]}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

type SetFormState = {
    setId: string | null;
    exerciseId: string;
    weight: string;
    reps: string;
    rpe: string;
    isWarmup: boolean;
};

function EditSetDialog({
    sessionId,
    initial,
    exercises,
    locale,
    onClose,
}: {
    sessionId: string;
    initial: SetRow | null;
    exercises: ReadonlyArray<ExerciseRow>;
    locale: Locale;
    onClose: () => void;
}) {
    const isNew = initial === null;
    const [state, setState] = useState<SetFormState>(() => ({
        setId: initial?.setId ?? null,
        exerciseId: initial?.exercise.exerciseId ?? exercises[0]?.exerciseId ?? '',
        weight: initial?.weight != null ? String(initial.weight) : '',
        reps: initial?.reps != null ? String(initial.reps) : '',
        rpe: initial?.rpe != null ? String(initial.rpe) : '',
        isWarmup: initial?.isWarmup ?? false,
    }));
    const [, upsert] = useMutation(WorkspaceWorkoutSetsUpsertDocument);
    const [submitting, setSubmitting] = useState(false);

    const submit = async () => {
        setSubmitting(true);
        try {
            const result = await upsert({
                workoutSets: [
                    {
                        setId: state.setId,
                        sessionId,
                        exerciseId: state.exerciseId,
                        weight: parseFloatOrNull(state.weight),
                        reps: parseIntOrNull(state.reps),
                        rpe: parseIntOrNull(state.rpe),
                        isWarmup: state.isWarmup,
                        notes: null,
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
                        {isNew ? { de: 'Satz hinzufügen', en: 'Add set' }[locale] : { de: 'Satz bearbeiten', en: 'Edit set' }[locale]}
                    </DialogTitle>
                    <DialogDescription>
                        {{ de: 'Übung, Gewicht und Wiederholungen.', en: 'AdminFitnessExercise, weight, and reps.' }[locale]}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label={{ de: 'Übung', en: 'AdminFitnessExercise' }[locale]} className="sm:col-span-2">
                        <Select value={state.exerciseId} onValueChange={(v) => setState((s) => ({ ...s, exerciseId: v }))}>
                            <SelectTrigger className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {exercises.map((ex) => (
                                    <SelectItem key={ex.exerciseId} value={ex.exerciseId}>
                                        {ex.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>
                    <Field label={{ de: 'Gewicht (kg)', en: 'Weight (kg)' }[locale]}>
                        <Input
                            type="number"
                            step="0.5"
                            min={0}
                            value={state.weight}
                            onChange={(e) => setState((s) => ({ ...s, weight: e.target.value }))}
                        />
                    </Field>
                    <Field label={{ de: 'Wiederholungen', en: 'Reps' }[locale]}>
                        <Input
                            type="number"
                            min={0}
                            value={state.reps}
                            onChange={(e) => setState((s) => ({ ...s, reps: e.target.value }))}
                        />
                    </Field>
                    <Field label={{ de: 'RPE (1–10)', en: 'RPE (1–10)' }[locale]}>
                        <Input
                            type="number"
                            min={1}
                            max={10}
                            value={state.rpe}
                            onChange={(e) => setState((s) => ({ ...s, rpe: e.target.value }))}
                        />
                    </Field>
                    <label className="flex items-center gap-2 text-sm">
                        <Switch checked={state.isWarmup} onCheckedChange={(v) => setState((s) => ({ ...s, isWarmup: v }))} />
                        {{ de: 'Aufwärmsatz', en: 'Warmup' }[locale]}
                    </label>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={onClose} disabled={submitting}>
                        {{ de: 'Abbrechen', en: 'Cancel' }[locale]}
                    </Button>
                    <Button onClick={submit} disabled={submitting || !state.exerciseId}>
                        {{ de: 'Speichern', en: 'Save' }[locale]}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// --- Routines tab -----------------------------------------------------------

function RoutinesTab({
    routines,
    exercises,
    locale,
}: {
    routines: ReadonlyArray<RoutineRow>;
    exercises: ReadonlyArray<ExerciseRow>;
    locale: Locale;
}) {
    const [editing, setEditing] = useState<RoutineRow | 'new' | null>(null);
    const [deleting, setDeleting] = useState<RoutineRow | null>(null);

    return (
        <div>
            <div className="flex justify-end">
                <Button size="sm" onClick={() => setEditing('new')}>
                    <PlusIcon className="size-4" />
                    {{ de: 'Neue Routine', en: 'New routine' }[locale]}
                </Button>
            </div>

            {routines.length === 0 ? (
                <GlassCard className="mt-6 px-6 py-10 text-center text-sm text-muted-foreground">
                    {
                        {
                            de: 'Noch keine Routinen. Eine Routine ist eine wiederverwendbare Vorlage („Push Day“), aus der du ein Training starten kannst.',
                            en: 'No routines yet. A routine is a reusable template ("Push day") you can start a workout from.',
                        }[locale]
                    }
                </GlassCard>
            ) : (
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {routines.map((routine) => (
                        <RoutineCard
                            key={routine.routineId}
                            routine={routine}
                            locale={locale}
                            onEdit={() => setEditing(routine)}
                            onDelete={() => setDeleting(routine)}
                        />
                    ))}
                </div>
            )}

            {editing !== null ? (
                <EditRoutineDialog
                    initial={editing === 'new' ? null : editing}
                    exercises={exercises}
                    locale={locale}
                    onClose={() => setEditing(null)}
                />
            ) : null}
            {deleting !== null ? (
                <DeleteAlert
                    heading={{ de: 'Routine löschen?', en: 'Delete this routine?' }[locale]}
                    body={
                        {
                            de: `„${deleting.name}“ wird entfernt. Bereits protokollierte Trainings bleiben erhalten.`,
                            en: `"${deleting.name}" will be removed. Already-logged workouts are kept.`,
                        }[locale]
                    }
                    locale={locale}
                    mutation="routine"
                    ids={[deleting.routineId]}
                    onClose={() => setDeleting(null)}
                />
            ) : null}
        </div>
    );
}

function RoutineCard({
    routine,
    locale,
    onEdit,
    onDelete,
}: {
    routine: RoutineRow;
    locale: Locale;
    onEdit: () => void;
    onDelete: () => void;
}) {
    return (
        <GlassCard
            className="group px-4 py-4 data-[focused=true]:ring-2 data-[focused=true]:ring-primary transition-shadow"
            data-row-id={routine.routineId}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 text-base font-semibold truncate">{routine.name}</div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={onEdit}
                        aria-label={{ de: 'Bearbeiten', en: 'Edit' }[locale]}
                    >
                        <PencilIcon className="size-3.5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-destructive/70 hover:text-destructive"
                        onClick={onDelete}
                        aria-label={{ de: 'Löschen', en: 'Delete' }[locale]}
                    >
                        <Trash2Icon className="size-3.5" />
                    </Button>
                </div>
            </div>
            {routine.items.length > 0 ? (
                <ul className="mt-3 space-y-1 text-sm">
                    {routine.items.map((item) => (
                        <li key={item.routineItemId} className="flex items-center justify-between gap-3">
                            <span className="min-w-0 truncate">{item.exercise.name}</span>
                            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{formatTarget(item, locale)}</span>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="mt-3 text-xs text-muted-foreground">{{ de: 'Keine Übungen.', en: 'No exercises.' }[locale]}</p>
            )}
        </GlassCard>
    );
}

type RoutineItemDraft = {
    routineItemId: string | null;
    exerciseId: string;
    targetSets: string;
    targetReps: string;
    targetWeight: string;
};

function EditRoutineDialog({
    initial,
    exercises,
    locale,
    onClose,
}: {
    initial: RoutineRow | null;
    exercises: ReadonlyArray<ExerciseRow>;
    locale: Locale;
    onClose: () => void;
}) {
    const isNew = initial === null;
    const [name, setName] = useState(initial?.name ?? '');
    const [notes, setNotes] = useState(initial?.notes ?? '');
    const [items, setItems] = useState<RoutineItemDraft[]>(() =>
        initial
            ? initial.items.map((item) => ({
                  routineItemId: item.routineItemId,
                  exerciseId: item.exercise.exerciseId,
                  targetSets: item.targetSets != null ? String(item.targetSets) : '',
                  targetReps: item.targetReps != null ? String(item.targetReps) : '',
                  targetWeight: item.targetWeight != null ? String(item.targetWeight) : '',
              }))
            : [],
    );
    const [, upsertRoutine] = useMutation(WorkspaceWorkoutRoutinesUpsertDocument);
    const [, upsertItems] = useMutation(WorkspaceWorkoutRoutineItemsUpsertDocument);
    const [submitting, setSubmitting] = useState(false);

    const addItem = () => {
        const first = exercises[0];
        if (!first) return;
        setItems((prev) => [
            ...prev,
            { routineItemId: null, exerciseId: first.exerciseId, targetSets: '', targetReps: '', targetWeight: '' },
        ]);
    };

    const submit = async () => {
        setSubmitting(true);
        try {
            const result = await upsertRoutine({
                workoutRoutines: [
                    {
                        routineId: initial?.routineId ?? null,
                        name: name.trim(),
                        notes: notes.trim() || null,
                        position: initial?.position ?? null,
                    },
                ],
            });
            if (result.error) return;
            const routineId = result.data?.admin.adminFitnessWorkoutRoutinesUpsert.referenceIds?.[0];
            if (routineId && items.length > 0) {
                const itemsResult = await upsertItems({
                    workoutRoutineItems: items.map((item, index) => ({
                        routineItemId: item.routineItemId,
                        routineId,
                        exerciseId: item.exerciseId,
                        position: index,
                        targetSets: parseIntOrNull(item.targetSets),
                        targetReps: parseIntOrNull(item.targetReps),
                        targetWeight: parseFloatOrNull(item.targetWeight),
                        notes: null,
                    })),
                });
                if (itemsResult.error) return;
            }
            onClose();
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {isNew
                            ? { de: 'Neue Routine', en: 'New routine' }[locale]
                            : { de: 'Routine bearbeiten', en: 'Edit routine' }[locale]}
                    </DialogTitle>
                    <DialogDescription>
                        {
                            {
                                de: 'Eine wiederverwendbare Vorlage aus Übungen mit Zielvorgaben.',
                                en: 'A reusable template of exercises with targets.',
                            }[locale]
                        }
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <Field label={{ de: 'Name', en: 'Name' }[locale]} required>
                        <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
                    </Field>
                    <div>
                        <span className="text-xs font-medium text-muted-foreground">{{ de: 'Übungen', en: 'Exercises' }[locale]}</span>
                        <div className="mt-2 space-y-2">
                            {items.map((item, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <Select
                                        value={item.exerciseId}
                                        onValueChange={(v) =>
                                            setItems((prev) => prev.map((it, i) => (i === index ? { ...it, exerciseId: v } : it)))
                                        }
                                    >
                                        <SelectTrigger className="flex-1">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {exercises.map((ex) => (
                                                <SelectItem key={ex.exerciseId} value={ex.exerciseId}>
                                                    {ex.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Input
                                        className="w-16"
                                        type="number"
                                        min={0}
                                        placeholder={{ de: 'Sätze', en: 'Sets' }[locale]}
                                        value={item.targetSets}
                                        onChange={(e) =>
                                            setItems((prev) =>
                                                prev.map((it, i) => (i === index ? { ...it, targetSets: e.target.value } : it)),
                                            )
                                        }
                                    />
                                    <Input
                                        className="w-16"
                                        type="number"
                                        min={0}
                                        placeholder={{ de: 'Wdh', en: 'Reps' }[locale]}
                                        value={item.targetReps}
                                        onChange={(e) =>
                                            setItems((prev) =>
                                                prev.map((it, i) => (i === index ? { ...it, targetReps: e.target.value } : it)),
                                            )
                                        }
                                    />
                                    <Input
                                        className="w-20"
                                        type="number"
                                        step="0.5"
                                        min={0}
                                        placeholder={{ de: 'kg', en: 'kg' }[locale]}
                                        value={item.targetWeight}
                                        onChange={(e) =>
                                            setItems((prev) =>
                                                prev.map((it, i) => (i === index ? { ...it, targetWeight: e.target.value } : it)),
                                            )
                                        }
                                    />
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-8 shrink-0 text-destructive/70 hover:text-destructive"
                                        onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))}
                                        aria-label={{ de: 'Entfernen', en: 'Remove' }[locale]}
                                    >
                                        <Trash2Icon className="size-3.5" />
                                    </Button>
                                </div>
                            ))}
                            <Button variant="ghost" size="sm" onClick={addItem} disabled={exercises.length === 0}>
                                <PlusIcon className="size-3.5" />
                                {{ de: 'Übung hinzufügen', en: 'Add exercise' }[locale]}
                            </Button>
                        </div>
                    </div>
                    <Field label={{ de: 'Notizen', en: 'Notes' }[locale]}>
                        <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
                    </Field>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={onClose} disabled={submitting}>
                        {{ de: 'Abbrechen', en: 'Cancel' }[locale]}
                    </Button>
                    <Button onClick={submit} disabled={submitting || name.trim().length === 0}>
                        {{ de: 'Speichern', en: 'Save' }[locale]}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// --- Exercises tab ----------------------------------------------------------

function ExercisesTab({ exercises, locale }: { exercises: ReadonlyArray<ExerciseRow>; locale: Locale }) {
    const [editing, setEditing] = useState<ExerciseRow | 'new' | null>(null);
    const [deleting, setDeleting] = useState<ExerciseRow | null>(null);

    const groups = useMemo(() => {
        const byGroup = new Map<GqlCAdminFitnessMuscleGroup, ExerciseRow[]>();
        for (const row of exercises) {
            const list = byGroup.get(row.muscleGroup) ?? [];
            list.push(row);
            byGroup.set(row.muscleGroup, list);
        }
        return MUSCLE_GROUPS.flatMap((key) => {
            const list = byGroup.get(key);
            if (!list || list.length === 0) return [];
            return [{ key, exercises: list }];
        });
    }, [exercises]);

    return (
        <div>
            <div className="flex justify-end">
                <Button size="sm" onClick={() => setEditing('new')}>
                    <PlusIcon className="size-4" />
                    {{ de: 'Neue Übung', en: 'New exercise' }[locale]}
                </Button>
            </div>

            {exercises.length === 0 ? (
                <GlassCard className="mt-6 px-6 py-10 text-center text-sm text-muted-foreground">
                    {
                        {
                            de: 'Noch keine Übungen. Übungen sind der Katalog, aus dem Trainings und Routinen schöpfen.',
                            en: 'No exercises yet. Exercises are the catalog workouts and routines draw from.',
                        }[locale]
                    }
                </GlassCard>
            ) : (
                <div className="mt-6 space-y-8">
                    {groups.map((group) => (
                        <section key={group.key} aria-labelledby={`exercise-group-${group.key}`}>
                            <h2
                                id={`exercise-group-${group.key}`}
                                className="mb-3 text-sm font-medium text-muted-foreground uppercase tracking-wider"
                            >
                                {MUSCLE_GROUP_LABELS[group.key][locale]}
                                <span className="ml-2 text-xs normal-case tracking-normal">{group.exercises.length}</span>
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                {group.exercises.map((exercise) => (
                                    <ExerciseCard
                                        key={exercise.exerciseId}
                                        exercise={exercise}
                                        locale={locale}
                                        onEdit={() => setEditing(exercise)}
                                        onDelete={() => setDeleting(exercise)}
                                    />
                                ))}
                            </div>
                        </section>
                    ))}
                </div>
            )}

            {editing !== null ? (
                <EditExerciseDialog initial={editing === 'new' ? null : editing} locale={locale} onClose={() => setEditing(null)} />
            ) : null}
            {deleting !== null ? (
                <DeleteAlert
                    heading={{ de: 'Übung löschen?', en: 'Delete this exercise?' }[locale]}
                    body={
                        {
                            de: `„${deleting.name}“ wird entfernt — inklusive aller protokollierten Sätze und Routinen-Einträge dieser Übung.`,
                            en: `"${deleting.name}" will be removed — along with every logged set and routine item using it.`,
                        }[locale]
                    }
                    locale={locale}
                    mutation="exercise"
                    ids={[deleting.exerciseId]}
                    onClose={() => setDeleting(null)}
                />
            ) : null}
        </div>
    );
}

function ExerciseCard({
    exercise,
    locale,
    onEdit,
    onDelete,
}: {
    exercise: ExerciseRow;
    locale: Locale;
    onEdit: () => void;
    onDelete: () => void;
}) {
    return (
        <GlassCard
            className="group px-4 py-3 flex items-center gap-3 data-[focused=true]:ring-2 data-[focused=true]:ring-primary transition-shadow"
            data-row-id={exercise.exerciseId}
        >
            <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{exercise.name}</div>
                <div className="text-xs text-muted-foreground">
                    {MUSCLE_GROUP_LABELS[exercise.muscleGroup][locale]}
                    {exercise.equipment ? ` · ${EQUIPMENT_LABELS[exercise.equipment][locale]}` : ''}
                </div>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={onEdit}
                    aria-label={{ de: 'Bearbeiten', en: 'Edit' }[locale]}
                >
                    <PencilIcon className="size-3.5" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-destructive/70 hover:text-destructive"
                    onClick={onDelete}
                    aria-label={{ de: 'Löschen', en: 'Delete' }[locale]}
                >
                    <Trash2Icon className="size-3.5" />
                </Button>
            </div>
        </GlassCard>
    );
}

type ExerciseFormState = {
    exerciseId: string | null;
    name: string;
    muscleGroup: GqlCAdminFitnessMuscleGroup;
    equipment: GqlCAdminFitnessEquipmentType | 'none';
    notes: string;
};

function EditExerciseDialog({ initial, locale, onClose }: { initial: ExerciseRow | null; locale: Locale; onClose: () => void }) {
    const isNew = initial === null;
    const [state, setState] = useState<ExerciseFormState>(() => ({
        exerciseId: initial?.exerciseId ?? null,
        name: initial?.name ?? '',
        muscleGroup: initial?.muscleGroup ?? 'chest',
        equipment: initial?.equipment ?? 'none',
        notes: initial?.notes ?? '',
    }));
    const [, upsert] = useMutation(WorkspaceExercisesUpsertDocument);
    const [submitting, setSubmitting] = useState(false);

    const submit = async () => {
        setSubmitting(true);
        try {
            const result = await upsert({
                exercises: [
                    {
                        exerciseId: state.exerciseId,
                        name: state.name.trim(),
                        muscleGroup: state.muscleGroup,
                        equipment: state.equipment === 'none' ? null : state.equipment,
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
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>
                        {isNew ? { de: 'Neue Übung', en: 'New exercise' }[locale] : { de: 'Übung bearbeiten', en: 'Edit exercise' }[locale]}
                    </DialogTitle>
                    <DialogDescription>{{ de: 'Eine Bewegung im Katalog.', en: 'A movement in the catalog.' }[locale]}</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label={{ de: 'Name', en: 'Name' }[locale]} required className="sm:col-span-2">
                        <Input value={state.name} onChange={(e) => setState((s) => ({ ...s, name: e.target.value }))} autoFocus />
                    </Field>
                    <Field label={{ de: 'Muskelgruppe', en: 'Muscle group' }[locale]}>
                        <Select
                            value={state.muscleGroup}
                            onValueChange={(v) => setState((s) => ({ ...s, muscleGroup: v as GqlCAdminFitnessMuscleGroup }))}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {MUSCLE_GROUPS.map((key) => (
                                    <SelectItem key={key} value={key}>
                                        {MUSCLE_GROUP_LABELS[key][locale]}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>
                    <Field label={{ de: 'Gerät', en: 'Equipment' }[locale]}>
                        <Select
                            value={state.equipment}
                            onValueChange={(v) => setState((s) => ({ ...s, equipment: v as GqlCAdminFitnessEquipmentType | 'none' }))}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">{{ de: '– keines –', en: '– none –' }[locale]}</SelectItem>
                                {EQUIPMENT_TYPES.map((key) => (
                                    <SelectItem key={key} value={key}>
                                        {EQUIPMENT_LABELS[key][locale]}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>
                    <Field label={{ de: 'Notizen', en: 'Notes' }[locale]} className="sm:col-span-2">
                        <Textarea rows={2} value={state.notes} onChange={(e) => setState((s) => ({ ...s, notes: e.target.value }))} />
                    </Field>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={onClose} disabled={submitting}>
                        {{ de: 'Abbrechen', en: 'Cancel' }[locale]}
                    </Button>
                    <Button onClick={submit} disabled={submitting || state.name.trim().length === 0}>
                        {{ de: 'Speichern', en: 'Save' }[locale]}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// --- Shared delete alert ----------------------------------------------------

// One alert body for all five fitness entities — the `mutation` discriminator
// picks which delete document to fire.
function DeleteAlert({
    heading,
    body,
    locale,
    mutation,
    ids,
    onClose,
}: {
    heading: string;
    body: string;
    locale: Locale;
    mutation: 'session' | 'set' | 'routine' | 'exercise';
    ids: string[];
    onClose: () => void;
}) {
    const [, delSession] = useMutation(WorkspaceWorkoutSessionsDeleteDocument);
    const [, delSet] = useMutation(WorkspaceWorkoutSetsDeleteDocument);
    const [, delRoutine] = useMutation(WorkspaceWorkoutRoutinesDeleteDocument);
    const [, delExercise] = useMutation(WorkspaceExercisesDeleteDocument);
    const [submitting, setSubmitting] = useState(false);

    const doDelete = async () => {
        setSubmitting(true);
        try {
            if (mutation === 'session') await delSession({ sessionIds: ids });
            else if (mutation === 'set') await delSet({ setIds: ids });
            else if (mutation === 'routine') await delRoutine({ routineIds: ids });
            else await delExercise({ exerciseIds: ids });
            onClose();
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <AlertDialog open onOpenChange={(open) => (open ? undefined : onClose())}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{heading}</AlertDialogTitle>
                    <AlertDialogDescription>{body}</AlertDialogDescription>
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

// --- Shared bits ------------------------------------------------------------

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

// --- Helpers ----------------------------------------------------------------

function parseIntOrNull(raw: string): number | null {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const n = Number.parseInt(trimmed, 10);
    return Number.isFinite(n) ? n : null;
}

function parseFloatOrNull(raw: string): number | null {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const n = Number.parseFloat(trimmed);
    return Number.isFinite(n) ? n : null;
}

// "100kg × 5" / "5 reps" / "bodyweight" — compact set summary.
function formatSet(set: SetRow, locale: Locale): string {
    const parts: string[] = [];
    if (set.weight != null) parts.push(`${set.weight}kg`);
    if (set.reps != null) parts.push(`× ${set.reps}`);
    let label = parts.join(' ') || { de: '—', en: '—' }[locale];
    if (set.isWarmup) label = `${label} · ${{ de: 'Aufwärmen', en: 'Warmup' }[locale]}`;
    return label;
}

// "3 × 5 @ 100kg" — routine item target summary.
function formatTarget(item: RoutineRow['items'][number], locale: Locale): string {
    const parts: string[] = [];
    if (item.targetSets != null && item.targetReps != null) parts.push(`${item.targetSets} × ${item.targetReps}`);
    else if (item.targetReps != null) parts.push(`× ${item.targetReps}`);
    if (item.targetWeight != null) parts.push(`@ ${item.targetWeight}kg`);
    return parts.join(' ') || { de: '—', en: '—' }[locale];
}

// --- Live user hook ---------------------------------------------------------

function useWorkspaceFitnessLiveUser(
    seed: GqlCWorkspaceFitnessPageUserFragment | null | undefined,
): GqlCWorkspaceFitnessPageUserFragment | null | undefined {
    const [user, setUser] = useState(seed);
    const client = useClient();
    useEffect(() => {
        const request = createRequest(WorkspaceFitnessPageUpdatesDocument, {});
        const operation = client.executeSubscription<GqlCWorkspaceFitnessPageUpdatesSubscription>(request);
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
