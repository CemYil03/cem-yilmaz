import { createFileRoute, Link } from '@tanstack/react-router';
import { format, parseISO } from 'date-fns';
import {
    BrainIcon,
    CheckIcon,
    Clock9Icon,
    FocusIcon,
    HourglassIcon,
    ListChecksIcon,
    MoonIcon,
    PencilIcon,
    RotateCcwIcon,
    SparklesIcon,
    TargetIcon,
    Trash2Icon,
    ZapIcon,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRequest, useClient, useMutation } from 'urql';
import { pipe, subscribe } from 'wonka';
import { z } from 'zod';
import { Button } from '../../../web/components/base/button';
import { DatePicker } from '../../../web/components/base/date-picker';
import { Input } from '../../../web/components/base/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../web/components/base/select';
import { Textarea } from '../../../web/components/base/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../web/components/base/tooltip';
import { GlassCard } from '../../../web/components/GlassCard';
import { Reveal } from '../../../web/components/Reveal';
import { WorkspaceUnauthorized } from '../../../web/components/WorkspaceUnauthorized';
import type {
    GqlCAdminProjectTaskEffort,
    GqlCAdminProjectTaskStatus,
    GqlCAdminProjectTaskWhenBucket,
    GqlCWorkspaceTodosPageUpdatesSubscription,
    GqlCWorkspaceTodosPageUserFragment,
} from '../../../web/graphql/generated';
import {
    WorkspaceTodoDeleteDocument,
    WorkspaceTodosPageDocument,
    WorkspaceTodosPageUpdatesDocument,
    WorkspaceTodoUpsertDocument,
} from '../../../web/graphql/generated';
import { useHotkeys } from '../../../web/hooks/useHotkeys';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import { useLocale } from '../../../web/hooks/useLocale';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { cn } from '../../../web/utils/cn';
import { DATE_FNS_LOCALE } from '../../../web/utils/dateFnsLocale';
import type { Locale } from '../../../web/utils/locale';
import { localeFromParam } from '../../../web/utils/locale';
import { todayStart } from '../../../web/utils/todoDerive';
import { todoParse } from '../../../web/utils/todoParse';

// Workspace todos — the standalone-tasks surface. Everything with
// `projectId IS NULL` lives here. See `docs/features/todos-experience.md`
// for the full behavior spec; the short version: the page is a ritual, not
// a database view. Each row carries `effort` (quick / focused / deep) and
// `whenBucket` (today / week / someday / waiting) so the user can match
// tasks to the moment they're in. The completion click animates in three
// beats (check draw → row tint → strike-through) and drops the row from
// the open list; the `Erledigt` filter chip shows the archive of all
// completed rows, grouped by day. Milestones at the 3rd / 5th / 10th
// completion of the day trigger a small non-blocking celebration.
//
// Admin-only, single-language on the wire (no *De / *En pairs); the page
// is noindex and reachable only via the hub tile, the header breadcrumb,
// or a chat deep-link (`/workspace/todos?focus=<taskId>`).

const TASK_STATUS_ORDER: ReadonlyArray<GqlCAdminProjectTaskStatus> = ['backlog', 'blocked', 'todo', 'doing', 'done'];
const TASK_STATUS_LABELS: Record<GqlCAdminProjectTaskStatus, { de: string; en: string }> = {
    backlog: { de: 'Backlog', en: 'Backlog' },
    todo: { de: 'Offen', en: 'To do' },
    doing: { de: 'Aktiv', en: 'Doing' },
    blocked: { de: 'Blockiert', en: 'Blocked' },
    done: { de: 'Erledigt', en: 'Done' },
};

const EFFORT_LABELS: Record<GqlCAdminProjectTaskEffort, { de: string; en: string }> = {
    quick: { de: 'schnell', en: 'quick' },
    focused: { de: 'fokussiert', en: 'focused' },
    deep: { de: 'tief', en: 'deep' },
};

// Left-edge strip color per effort. Encoded as a single color-class so we
// can drop it directly into the row card's `<span>` — no runtime object
// spread.
const EFFORT_BAR: Record<GqlCAdminProjectTaskEffort, string> = {
    quick: 'bg-emerald-400',
    focused: 'bg-amber-400',
    deep: 'bg-violet-400',
};

const WHEN_LABELS: Record<GqlCAdminProjectTaskWhenBucket, { de: string; en: string }> = {
    today: { de: 'heute', en: 'today' },
    week: { de: 'diese Woche', en: 'this week' },
    someday: { de: 'irgendwann', en: 'someday' },
    // `waiting` = the GTD "waiting-on-someone-else" bucket: blocked
    // pending an external reply (a quote, a colleague's response, a
    // delivery). Kept out of "someday" because the row is not the user's
    // to move — it's waiting on the world.
    waiting: { de: 'blockiert', en: 'blocked' },
};

type FilterKey = 'today' | 'week' | 'all' | 'waiting' | 'done';

const FILTER_LABELS: Record<FilterKey, { de: string; en: string }> = {
    today: { de: 'Heute', en: 'Today' },
    week: { de: 'Diese Woche', en: 'This week' },
    all: { de: 'Alles', en: 'All' },
    waiting: { de: 'Blockiert', en: 'Blocked' },
    done: { de: 'Erledigt', en: 'Done' },
};

// Deterministic affirmation pool — picked by `count % pool.length` so the
// user gets a bit of variety without server-side randomness.
const AFFIRMATIONS_5: ReadonlyArray<{ de: string; en: string }> = [
    { de: 'Fünf am Stück. Weiter so.', en: 'Five in a row. Keep going.' },
    { de: 'Guter Rhythmus heute.', en: 'Nice cadence today.' },
    { de: 'Du bist im Fluss.', en: 'You’re in the flow.' },
    { de: 'Fünf weniger auf der Liste.', en: 'Five fewer on the list.' },
    { de: 'Solide Serie.', en: 'Solid streak.' },
    { de: 'Momentum.', en: 'Momentum.' },
    { de: 'Nichts hält dich auf.', en: 'Nothing’s stopping you.' },
    { de: 'Wieder eine Handvoll geschafft.', en: 'Another handful done.' },
];

const AFFIRMATIONS_10: ReadonlyArray<{ de: string; en: string }> = [
    { de: 'Zehn heute. Beeindruckend.', en: 'Ten today. Impressive.' },
    { de: 'Ein produktiver Tag.', en: 'A productive day.' },
    { de: 'Der Berg wird kleiner.', en: 'The mountain’s shrinking.' },
    { de: 'Du räumst gerade auf.', en: 'You’re really cleaning up.' },
];

const title = { de: 'Todos', en: 'Todos' };
const description = {
    de: 'Aufgaben, die zu keinem Projekt gehören.',
    en: 'Tasks that don’t belong to any project.',
};

// URL state:
// - `focus`  — the personal-assistant chat's deep-link target (scroll+flash).
// - `view`   — which filter chip is active; omitted when the default `all`.
// - `mode`   — `focus` when the focus-mode overlay is up; omitted otherwise.
// - `edit`   — taskId whose inline edit form is open; omitted otherwise.
//
// Everything the user is looking at lives in the URL so reloads and shared
// links reproduce the exact view.
const todosSearchSchema = z.object({
    focus: z.string().optional(),
    view: z.enum(['today', 'week', 'all', 'waiting', 'done']).optional(),
    mode: z.literal('focus').optional(),
    edit: z.string().optional(),
});

type WorkspaceTodosAdmin = NonNullable<GqlCWorkspaceTodosPageUserFragment['admin']>;
type TaskRow = WorkspaceTodosAdmin['adminStandaloneTaskFindMany'][number];

export const Route = createFileRoute('/{-$locale}/workspace/todos')({
    validateSearch: todosSearchSchema,
    loader: () => routeLoaderGraphqlClient(WorkspaceTodosPageDocument)(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: title[locale],
            description: description[locale],
            path: '/workspace/todos',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component: WorkspaceTodos,
});

function WorkspaceTodos() {
    const locale = useLocale();
    const search = Route.useSearch();
    const navigate = Route.useNavigate();
    const data = Route.useLoaderData();

    // View state lives in the URL so reloads and shared links preserve it.
    // Defaults are omitted from the query string to keep URLs clean.
    const filter: FilterKey = search.view ?? 'all';
    const focusMode = search.mode === 'focus';
    const editingId = search.edit ?? null;

    const setFilter = useCallback(
        (next: FilterKey) => {
            void navigate({
                search: (prev) => ({ ...prev, view: next === 'all' ? undefined : next }),
                replace: true,
            });
        },
        [navigate],
    );

    const setFocusMode = useCallback(
        (next: boolean) => {
            void navigate({
                search: (prev) => ({ ...prev, mode: next ? ('focus' as const) : undefined }),
            });
        },
        [navigate],
    );

    const setEditingId = useCallback(
        (taskId: string | null) => {
            void navigate({
                search: (prev) => ({ ...prev, edit: taskId ?? undefined }),
            });
        },
        [navigate],
    );

    // Server-authoritative state — same seed-and-subscribe pattern the
    // rest of the workspace uses. See
    // `docs/architecture/state-synchronization.md`.
    const user = useWorkspaceTodosPageLiveUser(data.sessionFindOne.user);
    const admin = user?.admin;
    const rows = admin?.adminStandaloneTaskFindMany ?? [];

    // Deep-link focus: the chat assistant emits links like
    // `/workspace/todos?focus=<taskId>`. Same behavior as before —
    // scroll+flash+clear.
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
    }, [search.focus, navigate]);

    if (!admin) return <WorkspaceUnauthorized locale={locale} />;

    return (
        <main className="relative px-6 md:px-10 lg:px-16 max-w-4xl mx-auto w-full py-10 leading-relaxed">
            <TodosExperience
                rows={rows}
                locale={locale}
                filter={filter}
                onFilterChange={setFilter}
                focusMode={focusMode}
                onFocusModeChange={setFocusMode}
                editingId={editingId}
                onEditingIdChange={setEditingId}
            />
        </main>
    );
}

// --- Experience shell -------------------------------------------------------

function TodosExperience({
    rows,
    locale,
    filter,
    onFilterChange,
    focusMode,
    onFocusModeChange,
    editingId,
    onEditingIdChange,
}: {
    rows: ReadonlyArray<TaskRow>;
    locale: Locale;
    filter: FilterKey;
    onFilterChange: (f: FilterKey) => void;
    focusMode: boolean;
    onFocusModeChange: (v: boolean) => void;
    editingId: string | null;
    onEditingIdChange: (id: string | null) => void;
}) {
    const composerRef = useRef<HTMLInputElement>(null);

    // Rows we consider "open" (todo + doing). Filtered per the top chips.
    const openRows = useMemo(() => rows.filter((r) => r.status !== 'done'), [rows]);
    const doneRows = useMemo(
        () =>
            rows
                .filter((r) => r.status === 'done' && r.completedAt)
                .slice()
                .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime()),
        [rows],
    );
    const doneToday = useMemo(() => {
        const start = todayStart();
        return doneRows.filter((r) => new Date(r.completedAt!) >= start);
    }, [doneRows]);

    const filteredOpen = useMemo(() => filterRows(openRows, filter), [openRows, filter]);
    const showingDone = filter === 'done';
    const nextPosition = openRows.length;

    // The celebration layer is a fixed-position sibling of the app tree that
    // lives on `document.body` (see `ensureCelebrationLayer`). Remove it
    // when the page unmounts so navigating away doesn't leave a stray
    // container behind on `body`.
    useEffect(() => {
        return () => {
            document.getElementById('todos-celebrations')?.remove();
        };
    }, []);

    // Global page-level shortcuts. Disabled while the focus-mode overlay
    // owns the screen — that surface has its own key handling (Enter to
    // complete, Esc to exit) so `n` shouldn't try to focus a composer that
    // isn't mounted.
    useHotkeys(
        {
            n: (event) => {
                event.preventDefault();
                composerRef.current?.focus();
            },
            f: () => onFocusModeChange(!focusMode),
        },
        !focusMode,
    );

    if (focusMode && filteredOpen[0]) {
        return <FocusModeView row={filteredOpen[0]} locale={locale} onExit={() => onFocusModeChange(false)} />;
    }

    return (
        <div className="flex flex-col gap-6">
            <Reveal>
                <FilterChips
                    filter={filter}
                    onFilter={onFilterChange}
                    locale={locale}
                    focusMode={focusMode}
                    onToggleFocus={() => onFocusModeChange(!focusMode)}
                    canFocus={filteredOpen.length > 0}
                    doneCount={doneRows.length}
                />
            </Reveal>

            {showingDone ? (
                <Reveal index={1}>
                    <DoneList rows={doneRows} locale={locale} />
                </Reveal>
            ) : (
                <>
                    <Reveal index={1}>
                        <InlineComposer
                            ref={composerRef}
                            locale={locale}
                            nextPosition={nextPosition}
                            filter={filter}
                            onCreated={(created) => {
                                // If the newly-captured row would fall outside the current
                                // filter (e.g. user typed a plain title on the `Blockiert`
                                // chip), silently switch to `Alles` so it doesn't feel
                                // like the row was swallowed.
                                if (!rowMatchesFilter(created, filter)) onFilterChange('all');
                            }}
                        />
                    </Reveal>

                    <Reveal index={2}>
                        <TodoList
                            rows={filteredOpen}
                            locale={locale}
                            totalDoneToday={doneToday.length}
                            editingId={editingId}
                            onEditingIdChange={onEditingIdChange}
                        />
                    </Reveal>

                    {filteredOpen.length === 0 ? (
                        <EmptyReward
                            locale={locale}
                            doneTodayCount={doneToday.length}
                            onFocus={() => {
                                composerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                composerRef.current?.focus();
                            }}
                        />
                    ) : null}
                </>
            )}
        </div>
    );
}

// --- Filter chips -----------------------------------------------------------

// Canonical top-of-page sub-view switcher — underlined section tabs.
// The buckets are section-shaped views over the same list rather than a
// search dropdown, so they share the same visual language as
// `projects.tsx`, `compass.tsx`, and every other workspace switcher. See
// `docs/conventions.md` — "Top-of-page sub-view switcher".
//
// The right-aligned focus-mode toggle rides on the same row: it's a
// section-level action, not a tab, so it sits outside the `<nav>` in a
// flex sibling that pushes it to the right edge while the tabs claim the
// underline.
function FilterChips({
    filter,
    onFilter,
    locale,
    focusMode,
    onToggleFocus,
    canFocus,
    doneCount,
}: {
    filter: FilterKey;
    onFilter: (f: FilterKey) => void;
    locale: Locale;
    focusMode: boolean;
    onToggleFocus: () => void;
    canFocus: boolean;
    doneCount: number;
}) {
    const options: ReadonlyArray<FilterKey> = ['today', 'week', 'all', 'waiting', 'done'];
    const icons: Record<FilterKey, LucideIcon> = {
        today: TargetIcon,
        week: Clock9Icon,
        all: ListChecksIcon,
        waiting: HourglassIcon,
        done: CheckIcon,
    };
    const hints: Record<FilterKey, { de: string; en: string }> = {
        today: {
            de: 'Nur Todos für heute — Bucket „heute" oder überfällig',
            en: 'Only today’s todos — "today" bucket or overdue',
        },
        week: {
            de: 'Diese Woche — heute und alles innerhalb von 7 Tagen',
            en: 'This week — today plus anything within 7 days',
        },
        all: {
            de: 'Alle offenen Todos',
            en: 'All open todos',
        },
        waiting: {
            de: 'Blockiert — wartet auf jemand anderen',
            en: 'Blocked — waiting on someone else',
        },
        done: {
            de: 'Erledigt — alle abgeschlossenen Todos, nach Tag gruppiert',
            en: 'Done — all completed todos, grouped by day',
        },
    };
    return (
        <div className="flex flex-wrap items-end justify-between gap-2 border-b border-border/60">
            <nav className="flex flex-wrap gap-1" aria-label={{ de: 'Filter', en: 'Filters' }[locale]}>
                {options.map((key) => {
                    const active = filter === key;
                    const Icon = icons[key];
                    return (
                        <Tooltip key={key}>
                            <TooltipTrigger asChild>
                                <Link
                                    to="/{-$locale}/workspace/todos"
                                    from="/{-$locale}/workspace/todos"
                                    search={(prev) => ({ ...prev, view: key === 'all' ? undefined : key })}
                                    replace
                                    onClick={() => onFilter(key)}
                                    className={cn(
                                        '-mb-px flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors',
                                        active
                                            ? 'border-primary text-foreground'
                                            : 'border-transparent text-muted-foreground hover:text-foreground',
                                    )}
                                    aria-current={active ? 'page' : undefined}
                                >
                                    <Icon className="size-4" />
                                    {FILTER_LABELS[key][locale]}
                                    {key === 'done' && doneCount > 0 ? (
                                        <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                                            {doneCount}
                                        </span>
                                    ) : null}
                                </Link>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">{hints[key][locale]}</TooltipContent>
                        </Tooltip>
                    );
                })}
            </nav>

            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        size="icon-sm"
                        variant={focusMode ? 'default' : 'ghost'}
                        onClick={onToggleFocus}
                        disabled={!canFocus}
                        aria-label={{ de: 'Fokus-Modus', en: 'Focus mode' }[locale]}
                        aria-pressed={focusMode}
                        className="mb-1"
                    >
                        <FocusIcon />
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                    {
                        {
                            de: 'Fokus-Modus — zeigt nur das oberste Todo (f)',
                            en: 'Focus mode — show only the top todo (f)',
                        }[locale]
                    }
                </TooltipContent>
            </Tooltip>
        </div>
    );
}

function filterRows(rows: ReadonlyArray<TaskRow>, filter: FilterKey): TaskRow[] {
    if (filter === 'all') return rows.slice();
    if (filter === 'done') return []; // Done rows are rendered separately; keep `filteredOpen` empty.
    const nowDay = todayStart();
    const weekEnd = new Date(nowDay);
    weekEnd.setDate(weekEnd.getDate() + 7);
    return rows.filter((r) => {
        const due = r.dueAt ? new Date(r.dueAt) : null;
        if (filter === 'today') {
            if (r.whenBucket === 'today') return true;
            if (due && due <= endOfDay(nowDay)) return true; // overdue counts
            return false;
        }
        if (filter === 'week') {
            if (r.whenBucket === 'today' || r.whenBucket === 'week') return true;
            if (due && due <= weekEnd) return true;
            return false;
        }
        // filter === 'waiting'
        return r.whenBucket === 'waiting';
    });
}

function endOfDay(d: Date): Date {
    const e = new Date(d);
    e.setHours(23, 59, 59, 999);
    return e;
}

// Bucket a fresh, untagged todo lands in based on which filter chip the user
// is currently viewing. `all` returns null so the row stays unclassified.
function filterDefaultWhenBucket(filter: FilterKey): GqlCAdminProjectTaskWhenBucket | null {
    if (filter === 'today') return 'today';
    if (filter === 'week') return 'week';
    if (filter === 'waiting') return 'waiting';
    return null;
}

// Would a newly-composed row show up under the active filter? Mirrors the
// rules in `filterRows` but only for the fields the composer sets.
function rowMatchesFilter(created: { whenBucket: GqlCAdminProjectTaskWhenBucket | null }, filter: FilterKey): boolean {
    if (filter === 'all') return true;
    if (filter === 'today') return created.whenBucket === 'today';
    if (filter === 'week') return created.whenBucket === 'today' || created.whenBucket === 'week';
    return created.whenBucket === 'waiting';
}

// --- Inline composer --------------------------------------------------------

// Forward-ref so the page can focus() the input from a keyboard shortcut.
function InlineComposer({
    ref,
    locale,
    nextPosition,
    filter,
    onCreated,
}: {
    ref: React.RefObject<HTMLInputElement | null>;
    locale: Locale;
    nextPosition: number;
    filter: FilterKey;
    onCreated: (created: { whenBucket: GqlCAdminProjectTaskWhenBucket | null }) => void;
}) {
    const [, upsert] = useMutation(WorkspaceTodoUpsertDocument);
    const [value, setValue] = useState('');
    const [effortPick, setEffortPick] = useState<GqlCAdminProjectTaskEffort | null>(null);
    const [busy, setBusy] = useState(false);

    const submit = async () => {
        const raw = value.trim();
        if (!raw) return;
        setBusy(true);
        const parsed = todoParse(raw);
        if (!parsed.title) {
            setBusy(false);
            return;
        }
        // Filter-aware default: if the user is looking at "Heute" / "Diese Woche"
        // / "Blockiert" and hasn't specified a bucket via NL, plant it in the
        // bucket they're currently viewing so the row shows up on screen.
        const whenBucket = parsed.whenBucket ?? filterDefaultWhenBucket(filter);
        await upsert({
            taskId: null,
            title: parsed.title,
            notes: null,
            status: 'todo',
            position: nextPosition,
            dueAt: parsed.dueAt ? parsed.dueAt.toISOString() : null,
            completedAt: null,
            effort: parsed.effort ?? effortPick,
            whenBucket,
        });
        setValue('');
        setBusy(false);
        onCreated({ whenBucket });
        ref.current?.focus();
    };

    return (
        <GlassCard className="px-3 py-2 transition-shadow focus-within:ring-2 focus-within:ring-primary/40">
            <form
                className="flex items-center gap-2"
                onSubmit={(e) => {
                    e.preventDefault();
                    void submit();
                }}
            >
                <Input
                    ref={ref}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder={
                        {
                            de: 'Was noch? Tipp: !heute, !woche, ~30min',
                            en: 'What next? Tip: !today, !week, ~30min',
                        }[locale]
                    }
                    className="border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:border-transparent"
                    disabled={busy}
                />
                <div className="flex items-center gap-0.5">
                    <EffortPickerButton
                        picked={effortPick}
                        value="quick"
                        onPick={setEffortPick}
                        icon={ZapIcon}
                        label={{ de: 'Schnell (≤15 min) als Standard', en: 'Quick (≤15 min) as default' }[locale]}
                    />
                    <EffortPickerButton
                        picked={effortPick}
                        value="focused"
                        onPick={setEffortPick}
                        icon={TargetIcon}
                        label={{ de: 'Fokussiert (30–90 min) als Standard', en: 'Focused (30–90 min) as default' }[locale]}
                    />
                    <EffortPickerButton
                        picked={effortPick}
                        value="deep"
                        onPick={setEffortPick}
                        icon={BrainIcon}
                        label={{ de: 'Tief (>90 min) als Standard', en: 'Deep (>90 min) as default' }[locale]}
                    />
                </div>
                <Button type="submit" size="sm" disabled={busy || !value.trim()}>
                    {{ de: 'Hinzufügen', en: 'Add' }[locale]}
                </Button>
            </form>
        </GlassCard>
    );
}

function EffortPickerButton({
    picked,
    value,
    onPick,
    icon: Icon,
    label,
}: {
    picked: GqlCAdminProjectTaskEffort | null;
    value: GqlCAdminProjectTaskEffort;
    onPick: (v: GqlCAdminProjectTaskEffort | null) => void;
    icon: React.ComponentType<{ className?: string }>;
    label: string;
}) {
    const active = picked === value;
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    type="button"
                    size="icon-sm"
                    variant={active ? 'secondary' : 'ghost'}
                    onClick={() => onPick(active ? null : value)}
                    aria-label={label}
                    aria-pressed={active}
                    className={cn(active && 'ring-1 ring-offset-1 ring-offset-transparent')}
                >
                    <Icon />
                </Button>
            </TooltipTrigger>
            <TooltipContent side="top">{label}</TooltipContent>
        </Tooltip>
    );
}

// --- Todo list + rows -------------------------------------------------------

function TodoList({
    rows,
    locale,
    totalDoneToday,
    editingId,
    onEditingIdChange,
}: {
    rows: ReadonlyArray<TaskRow>;
    locale: Locale;
    totalDoneToday: number;
    editingId: string | null;
    onEditingIdChange: (id: string | null) => void;
}) {
    if (rows.length === 0) return null;
    return (
        <ul className="flex flex-col gap-2">
            {rows.map((task, idx) => (
                <TodoRow
                    key={task.taskId}
                    task={task}
                    locale={locale}
                    completionRank={totalDoneToday + 1}
                    stagger={Math.min(idx, 3)}
                    editing={editingId === task.taskId}
                    onEditingChange={(open) => onEditingIdChange(open ? task.taskId : null)}
                />
            ))}
        </ul>
    );
}

function TodoRow({
    task,
    locale,
    completionRank,
    stagger,
    editing,
    onEditingChange,
}: {
    task: TaskRow;
    locale: Locale;
    completionRank: number;
    stagger: number;
    editing: boolean;
    onEditingChange: (open: boolean) => void;
}) {
    const [, upsert] = useMutation(WorkspaceTodoUpsertDocument);
    const [, del] = useMutation(WorkspaceTodoDeleteDocument);
    const [completing, setCompleting] = useState(false);

    const complete = useCallback(async () => {
        if (completing || task.status === 'done') return;
        setCompleting(true);
        // Fire the mutation in parallel with the ritual — the server call
        // doesn't have to finish before the animation plays.
        void upsert({
            taskId: task.taskId,
            title: task.title,
            notes: task.notes ?? null,
            status: 'done',
            position: task.position,
            dueAt: task.dueAt ?? null,
            completedAt: new Date().toISOString(),
            effort: task.effort ?? null,
            whenBucket: task.whenBucket ?? null,
        });
        // The server pushes an updated fragment which unmounts this row,
        // so we don't need to reset `completing`.
        maybeCelebrate(completionRank, locale);
    }, [completing, task, upsert, completionRank, locale]);

    if (editing) {
        return (
            <li>
                <TaskForm
                    task={task}
                    locale={locale}
                    nextPosition={task.position}
                    onClose={() => onEditingChange(false)}
                    onSaved={() => onEditingChange(false)}
                />
            </li>
        );
    }

    const effortBar = task.effort ? EFFORT_BAR[task.effort] : 'bg-muted-foreground/30';
    const meta = [
        task.effort ? EFFORT_LABELS[task.effort][locale] : null,
        task.whenBucket ? WHEN_LABELS[task.whenBucket][locale] : null,
        task.dueAt ? `${{ de: 'fällig', en: 'due' }[locale]} ${format(new Date(task.dueAt), 'dd.MM.')}` : null,
    ].filter(Boolean);

    return (
        <li
            data-row-id={task.taskId}
            data-completing={completing || undefined}
            className={cn(
                'group relative overflow-hidden rounded-xl border border-white/50 bg-white/40 px-4 py-3',
                'backdrop-blur-sm shadow-[0_1px_0_0_oklch(1_0_0/0.5)_inset,0_1px_2px_0_oklch(0_0_0/0.03)]',
                'dark:border-white/10 dark:bg-white/5',
                'transition-[opacity,transform,background-color] duration-500 ease-out',
                // Hover: lift 1px + brighten border. The transition on
                // `bg-white/50` shows through the backdrop blur, so the
                // effect reads even on light backgrounds.
                'hover:-translate-y-px hover:border-white/80 dark:hover:border-white/20',
                // Row-in animation (staggered inline via animation-delay).
                'motion-safe:animate-todo-row-in',
                // Completion state.
                'data-[completing]:motion-safe:bg-emerald-100/50 dark:data-[completing]:motion-safe:bg-emerald-900/30',
                'data-[completing]:opacity-40 data-[completing]:translate-y-1',
                // Deep-link focus flash.
                'data-[focused=true]:ring-2 data-[focused=true]:ring-primary/60 data-[focused=true]:ring-offset-2',
            )}
            style={{ animationDelay: `${stagger * 60}ms` }}
        >
            <span aria-hidden className={cn('absolute inset-y-0 left-0 w-1 rounded-l-xl', effortBar)} />
            <div className="flex items-start gap-3 pl-2">
                <RitualCheckbox onComplete={complete} completing={completing} locale={locale} />
                <div className="min-w-0 flex-1">
                    <span
                        data-completing={completing || undefined}
                        className={cn(
                            'block text-sm text-foreground',
                            'relative inline-block bg-linear-to-r from-current to-current bg-no-repeat',
                            'bg-[length:0%_1px] bg-[position:0_92%]',
                            'motion-safe:transition-[background-size] motion-safe:duration-300',
                            'data-[completing]:bg-[length:100%_1px] data-[completing]:text-muted-foreground',
                        )}
                    >
                        {task.title}
                    </span>
                    {meta.length > 0 || task.notes ? (
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                            {meta.map((m, i) => (
                                <span key={i}>{m}</span>
                            ))}
                            {task.notes ? <span className="line-clamp-1 max-w-full">{task.notes}</span> : null}
                        </div>
                    ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                size="icon-xs"
                                variant="ghost"
                                aria-label={{ de: 'Später', en: 'Snooze' }[locale]}
                                onClick={async () => {
                                    // A `waiting` row is blocked by an external party, not by the
                                    // user — snoozing it to `someday` would misrepresent the state.
                                    // Keep the bucket, just clear the due date.
                                    const nextBucket = task.whenBucket === 'waiting' ? 'waiting' : 'someday';
                                    await upsert({
                                        taskId: task.taskId,
                                        title: task.title,
                                        notes: task.notes ?? null,
                                        status: task.status,
                                        position: task.position,
                                        dueAt: null,
                                        completedAt: null,
                                        effort: task.effort ?? null,
                                        whenBucket: nextBucket,
                                    });
                                }}
                            >
                                <Clock9Icon />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                            {{ de: 'Später — in "Irgendwann" verschieben', en: 'Snooze — move to "someday"' }[locale]}
                        </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                size="icon-xs"
                                variant="ghost"
                                aria-label={{ de: 'Bearbeiten', en: 'Edit' }[locale]}
                                onClick={() => onEditingChange(true)}
                            >
                                <PencilIcon />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">{{ de: 'Bearbeiten', en: 'Edit' }[locale]}</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                size="icon-xs"
                                variant="ghost"
                                aria-label={{ de: 'Löschen', en: 'Delete' }[locale]}
                                onClick={async () => {
                                    await del({ taskId: task.taskId });
                                }}
                            >
                                <Trash2Icon />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">{{ de: 'Löschen', en: 'Delete' }[locale]}</TooltipContent>
                    </Tooltip>
                </div>
            </div>
        </li>
    );
}

// The centerpiece — a checkbox that draws a check-path when clicked.
// Reduced motion: the path shows instantly, no spring, no timing.
function RitualCheckbox({ onComplete, completing, locale }: { onComplete: () => void; completing: boolean; locale: Locale }) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    type="button"
                    onClick={onComplete}
                    aria-label={{ de: 'Erledigt', en: 'Complete' }[locale]}
                    className={cn(
                        'mt-0.5 grid size-5 shrink-0 cursor-pointer place-items-center rounded-md border-2 border-muted-foreground/60',
                        'transition-colors',
                        'hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30',
                        completing && 'border-emerald-500 bg-emerald-500',
                    )}
                >
                    <svg
                        viewBox="0 0 20 20"
                        className={cn('size-3 text-white transition-opacity', completing ? 'opacity-100' : 'opacity-0')}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={3}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden
                    >
                        <path
                            d="M4 10l4 4 8-8"
                            style={{
                                strokeDasharray: 24,
                                strokeDashoffset: completing ? 0 : 24,
                                transition: 'stroke-dashoffset 260ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                            }}
                        />
                    </svg>
                </button>
            </TooltipTrigger>
            <TooltipContent side="left">{{ de: 'Als erledigt markieren', en: 'Mark done' }[locale]}</TooltipContent>
        </Tooltip>
    );
}

// --- AdminProjectTask edit form (kept from the previous design; extended for effort/when)

function TaskForm({
    task,
    locale,
    nextPosition,
    onClose,
    onSaved,
}: {
    task: TaskRow | null;
    locale: Locale;
    nextPosition: number;
    onClose: () => void;
    onSaved: () => void;
}) {
    const [, upsert] = useMutation(WorkspaceTodoUpsertDocument);
    const [form, setForm] = useState({
        title: task?.title ?? '',
        notes: task?.notes ?? '',
        status: task?.status ?? ('todo' as GqlCAdminProjectTaskStatus),
        dueAt: task?.dueAt ? format(parseISO(task.dueAt as unknown as string), 'yyyy-MM-dd') : '',
        effort: task?.effort ?? null,
        whenBucket: task?.whenBucket ?? null,
    });
    const [busy, setBusy] = useState(false);

    return (
        <form
            onSubmit={async (event) => {
                event.preventDefault();
                setBusy(true);
                await upsert({
                    taskId: task?.taskId ?? null,
                    title: form.title,
                    notes: form.notes || null,
                    status: form.status,
                    position: task?.position ?? nextPosition,
                    dueAt: form.dueAt ? new Date(`${form.dueAt}T00:00:00Z`).toISOString() : null,
                    completedAt: form.status === 'done' ? (task?.completedAt ?? new Date().toISOString()) : null,
                    effort: form.effort,
                    whenBucket: form.whenBucket,
                });
                setBusy(false);
                onSaved();
            }}
            className="mt-2"
        >
            <GlassCard className="px-4 py-3">
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    <Field label={{ de: 'Titel', en: 'Title' }[locale]} fullWidth>
                        <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                    </Field>
                    <Field label={{ de: 'Status', en: 'Status' }[locale]}>
                        <Select
                            value={form.status}
                            onValueChange={(value) => setForm({ ...form, status: value as GqlCAdminProjectTaskStatus })}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {TASK_STATUS_ORDER.map((s) => (
                                    <SelectItem key={s} value={s}>
                                        {TASK_STATUS_LABELS[s][locale]}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>
                    <Field label={{ de: 'Fällig am', en: 'Due date' }[locale]}>
                        <DatePicker
                            value={form.dueAt ? parseISO(form.dueAt) : undefined}
                            onValueChange={(next) => setForm({ ...form, dueAt: next ? format(next, 'yyyy-MM-dd') : '' })}
                            className="w-full"
                            locale={DATE_FNS_LOCALE[locale]}
                        />
                    </Field>
                    <Field label={{ de: 'Aufwand', en: 'Effort' }[locale]}>
                        <Select
                            value={form.effort ?? 'none'}
                            onValueChange={(value) =>
                                setForm({ ...form, effort: value === 'none' ? null : (value as GqlCAdminProjectTaskEffort) })
                            }
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">{{ de: '—', en: '—' }[locale]}</SelectItem>
                                <SelectItem value="quick">{EFFORT_LABELS.quick[locale]}</SelectItem>
                                <SelectItem value="focused">{EFFORT_LABELS.focused[locale]}</SelectItem>
                                <SelectItem value="deep">{EFFORT_LABELS.deep[locale]}</SelectItem>
                            </SelectContent>
                        </Select>
                    </Field>
                    <Field label={{ de: 'Wann', en: 'When' }[locale]}>
                        <Select
                            value={form.whenBucket ?? 'none'}
                            onValueChange={(value) =>
                                setForm({ ...form, whenBucket: value === 'none' ? null : (value as GqlCAdminProjectTaskWhenBucket) })
                            }
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">{{ de: '—', en: '—' }[locale]}</SelectItem>
                                <SelectItem value="today">{WHEN_LABELS.today[locale]}</SelectItem>
                                <SelectItem value="week">{WHEN_LABELS.week[locale]}</SelectItem>
                                <SelectItem value="someday">{WHEN_LABELS.someday[locale]}</SelectItem>
                                <SelectItem value="waiting">{WHEN_LABELS.waiting[locale]}</SelectItem>
                            </SelectContent>
                        </Select>
                    </Field>
                    <Field label={{ de: 'Notizen', en: 'Notes' }[locale]} fullWidth>
                        <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
                    </Field>
                </div>
                <div className="mt-3 flex justify-end gap-2">
                    <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={busy}>
                        {{ de: 'Abbrechen', en: 'Cancel' }[locale]}
                    </Button>
                    <Button type="submit" size="sm" disabled={busy}>
                        {{ de: 'Speichern', en: 'Save' }[locale]}
                    </Button>
                </div>
            </GlassCard>
        </form>
    );
}

function Field({ label, children, fullWidth }: { label: string; children: React.ReactNode; fullWidth?: boolean }) {
    return (
        <label className={fullWidth ? 'flex flex-col gap-1 md:col-span-2' : 'flex flex-col gap-1'}>
            <span className="text-xs font-medium text-muted-foreground">{label}</span>
            {children}
        </label>
    );
}

// --- Done list -------------------------------------------------------------

// Groups all completed rows by day (Heute / Gestern / earlier days as
// `dd.MM.yyyy`). Rendered when the `Erledigt` filter chip is active.
function DoneList({ rows, locale }: { rows: ReadonlyArray<TaskRow>; locale: Locale }) {
    const [, upsert] = useMutation(WorkspaceTodoUpsertDocument);
    const [, del] = useMutation(WorkspaceTodoDeleteDocument);

    const groups = useMemo(() => groupDoneByDay(rows, locale), [rows, locale]);

    if (rows.length === 0) {
        return (
            <div className="mt-2 flex flex-col items-center gap-3 py-10 text-center">
                <ListChecksIcon className="size-10 text-muted-foreground/60" />
                <p className="text-sm text-muted-foreground">
                    {{ de: 'Noch nichts abgeschlossen.', en: 'Nothing completed yet.' }[locale]}
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            {groups.map((group) => (
                <section key={group.key} className="flex flex-col gap-2">
                    <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        <ListChecksIcon className="size-3.5" />
                        {group.label} · {group.rows.length}
                    </h3>
                    <ul className="flex flex-col gap-1">
                        {group.rows.map((task) => (
                            <li
                                key={task.taskId}
                                className="group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-background/40"
                            >
                                <CheckIcon className="size-3.5 shrink-0 text-emerald-500" />
                                <span className="min-w-0 flex-1 truncate line-through decoration-muted-foreground/40">{task.title}</span>
                                {task.completedAt ? (
                                    <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground/70">
                                        {format(new Date(task.completedAt), 'HH:mm')}
                                    </span>
                                ) : null}
                                <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                size="icon-xs"
                                                variant="ghost"
                                                aria-label={{ de: 'Wiederherstellen', en: 'Restore' }[locale]}
                                                onClick={async () => {
                                                    await upsert({
                                                        taskId: task.taskId,
                                                        title: task.title,
                                                        notes: task.notes ?? null,
                                                        status: 'todo',
                                                        position: task.position,
                                                        dueAt: task.dueAt ?? null,
                                                        completedAt: null,
                                                        effort: task.effort ?? null,
                                                        whenBucket: task.whenBucket ?? null,
                                                    });
                                                }}
                                            >
                                                <RotateCcwIcon />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="top">{{ de: 'Wiederherstellen', en: 'Restore' }[locale]}</TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                size="icon-xs"
                                                variant="ghost"
                                                aria-label={{ de: 'Löschen', en: 'Delete' }[locale]}
                                                onClick={async () => {
                                                    await del({ taskId: task.taskId });
                                                }}
                                            >
                                                <Trash2Icon />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="top">{{ de: 'Löschen', en: 'Delete' }[locale]}</TooltipContent>
                                    </Tooltip>
                                </div>
                            </li>
                        ))}
                    </ul>
                </section>
            ))}
        </div>
    );
}

type DoneGroup = { key: string; label: string; rows: TaskRow[] };

// Bucket done rows into `Heute` / `Gestern` / `<date>` groups. Rows arrive
// pre-sorted by `completedAt` desc, so the groups come out in that order too.
function groupDoneByDay(rows: ReadonlyArray<TaskRow>, locale: Locale): DoneGroup[] {
    const today = todayStart();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const groupsByKey = new Map<string, DoneGroup>();
    for (const row of rows) {
        if (!row.completedAt) continue;
        const completedAt = new Date(row.completedAt);
        const dayStart = new Date(completedAt);
        dayStart.setHours(0, 0, 0, 0);
        const key = dayStart.toISOString();
        let group = groupsByKey.get(key);
        if (!group) {
            const label =
                dayStart.getTime() === today.getTime()
                    ? { de: 'Heute', en: 'Today' }[locale]
                    : dayStart.getTime() === yesterday.getTime()
                      ? { de: 'Gestern', en: 'Yesterday' }[locale]
                      : format(dayStart, 'EEEE, dd.MM.yyyy', { locale: DATE_FNS_LOCALE[locale] });
            group = { key, label, rows: [] };
            groupsByKey.set(key, group);
        }
        group.rows.push(row);
    }
    return Array.from(groupsByKey.values());
}

// --- Empty state (as a reward) ---------------------------------------------

function EmptyReward({ locale, doneTodayCount, onFocus }: { locale: Locale; doneTodayCount: number; onFocus: () => void }) {
    return (
        <div className="mt-2 flex flex-col items-center gap-3 py-10 text-center">
            <SparklesIcon className="size-12 text-emerald-400/70" />
            <p className="text-lg font-medium text-foreground">{{ de: 'Alles erledigt.', en: 'All done.' }[locale]}</p>
            {doneTodayCount >= 5 ? (
                <p className="text-sm text-muted-foreground">
                    {
                        {
                            de: `Du warst heute fleißig — ${doneTodayCount} erledigt.`,
                            en: `You’ve been productive today — ${doneTodayCount} done.`,
                        }[locale]
                    }
                </p>
            ) : (
                <p className="text-sm text-muted-foreground">{{ de: 'Zeit für was Neues?', en: 'Time for something new?' }[locale]}</p>
            )}
            <Button size="sm" variant="outline" onClick={onFocus}>
                {{ de: 'Neues Todo', en: 'New todo' }[locale]}
            </Button>
        </div>
    );
}

// --- Focus mode -------------------------------------------------------------

function FocusModeView({ row, locale, onExit }: { row: TaskRow; locale: Locale; onExit: () => void }) {
    const [, upsert] = useMutation(WorkspaceTodoUpsertDocument);
    const [completing, setCompleting] = useState(false);

    const complete = useCallback(async () => {
        if (completing) return;
        setCompleting(true);
        try {
            await upsert({
                taskId: row.taskId,
                title: row.title,
                notes: row.notes ?? null,
                status: 'done',
                position: row.position,
                dueAt: row.dueAt ?? null,
                completedAt: new Date().toISOString(),
                effort: row.effort ?? null,
                whenBucket: row.whenBucket ?? null,
            });
        } finally {
            // Even if the mutation rejects, drop the overlay — otherwise the
            // user is stranded on a `completing` state with no way out.
            setCompleting(false);
            onExit();
        }
    }, [completing, row, upsert, onExit]);

    // Overlay-scoped keys: Enter completes and exits, Esc exits without
    // completing. Bound directly rather than via `useHotkeys` so they fire
    // even when Radix has moved focus onto a button inside the overlay.
    useEffect(() => {
        const listener = (event: KeyboardEvent) => {
            if (event.ctrlKey || event.metaKey || event.altKey) return;
            if (event.key === 'Escape') {
                event.preventDefault();
                onExit();
                return;
            }
            if (event.key === 'Enter') {
                event.preventDefault();
                void complete();
            }
        };
        window.addEventListener('keydown', listener);
        return () => window.removeEventListener('keydown', listener);
    }, [complete, onExit]);

    const focusMeta = [
        row.effort ? EFFORT_LABELS[row.effort][locale] : null,
        row.whenBucket ? WHEN_LABELS[row.whenBucket][locale] : null,
        row.dueAt ? `${{ de: 'fällig', en: 'due' }[locale]} ${format(new Date(row.dueAt), 'dd.MM.yyyy')}` : null,
    ].filter(Boolean);

    return (
        <div className="fixed inset-0 z-40 flex flex-col items-center bg-background/70 px-6 py-16 backdrop-blur-xl overflow-y-auto">
            <div className="my-auto flex w-full max-w-3xl flex-col items-center gap-6">
                <span className="text-xs uppercase tracking-widest text-muted-foreground">
                    <MoonIcon className="mr-1 inline size-3" />
                    {{ de: 'Fokus', en: 'Focus' }[locale]}
                </span>
                <h2 className="text-center text-3xl font-semibold text-foreground md:text-4xl">{row.title}</h2>
                {focusMeta.length > 0 ? <p className="text-sm text-muted-foreground">{focusMeta.join(' · ')}</p> : null}
                {row.notes ? (
                    <p className="max-w-2xl whitespace-pre-wrap text-base leading-relaxed text-muted-foreground">{row.notes}</p>
                ) : null}
                <div className="mt-6 flex gap-3">
                    <Button size="lg" variant="default" onClick={() => void complete()} disabled={completing}>
                        <CheckIcon />
                        {{ de: 'Erledigt (Enter)', en: 'Done (Enter)' }[locale]}
                    </Button>
                    <Button size="lg" variant="ghost" onClick={onExit}>
                        {{ de: 'Zurück (Esc)', en: 'Back (Esc)' }[locale]}
                    </Button>
                </div>
            </div>
        </div>
    );
}

// --- Celebration side-effect -----------------------------------------------

// Fires a soft glow + optional affirmation at milestone completion counts.
// Renders directly into a portal-like fixed layer so it never affects
// layout. Auto-cleans after 2s.
function maybeCelebrate(rank: number, locale: Locale): void {
    if (typeof document === 'undefined') return;
    if (rank !== 3 && rank !== 5 && rank !== 10 && !(rank > 10 && rank % 10 === 0)) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const layer = ensureCelebrationLayer();

    const glow = document.createElement('div');
    glow.className =
        'pointer-events-none absolute left-1/2 top-1/2 size-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-400/20 blur-3xl';
    if (!reduce) {
        glow.style.transition = 'opacity 900ms ease-out, transform 900ms ease-out';
        glow.style.opacity = '1';
        requestAnimationFrame(() => {
            glow.style.opacity = '0';
            glow.style.transform = 'translate(-50%, -50%) scale(1.6)';
        });
    }
    layer.appendChild(glow);
    window.setTimeout(() => glow.remove(), 1000);

    if (rank >= 5) {
        const pool = rank >= 10 ? AFFIRMATIONS_10 : AFFIRMATIONS_5;
        const msg = pool[rank % pool.length]!;
        const chip = document.createElement('div');
        chip.textContent = msg[locale];
        chip.className =
            'pointer-events-none fixed right-6 top-24 rounded-full bg-foreground/90 px-4 py-2 text-xs font-medium text-background shadow-lg';
        chip.style.opacity = '0';
        chip.style.transform = 'translateY(-8px)';
        if (!reduce) chip.style.transition = 'opacity 250ms ease-out, transform 250ms ease-out';
        document.body.appendChild(chip);
        requestAnimationFrame(() => {
            chip.style.opacity = '1';
            chip.style.transform = 'translateY(0)';
        });
        window.setTimeout(() => {
            chip.style.opacity = '0';
        }, 1800);
        window.setTimeout(() => chip.remove(), 2200);
    }
}

function ensureCelebrationLayer(): HTMLElement {
    let layer = document.getElementById('todos-celebrations');
    if (!layer) {
        layer = document.createElement('div');
        layer.id = 'todos-celebrations';
        layer.className = 'pointer-events-none fixed inset-0 z-30';
        document.body.appendChild(layer);
    }
    return layer;
}

// --- Live subscription (unchanged from previous design) ---------------------

function useWorkspaceTodosPageLiveUser(
    seed: GqlCWorkspaceTodosPageUserFragment | null | undefined,
): GqlCWorkspaceTodosPageUserFragment | null | undefined {
    const [user, setUser] = useState(seed);

    const client = useClient();
    useEffect(() => {
        const request = createRequest(WorkspaceTodosPageUpdatesDocument, {});
        const operation = client.executeSubscription<GqlCWorkspaceTodosPageUpdatesSubscription>(request);
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
