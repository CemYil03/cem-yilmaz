import { createFileRoute, Link, useRouter } from '@tanstack/react-router';
import { format, parseISO } from 'date-fns';
import {
    ArchiveIcon,
    ArrowRightIcon,
    CheckSquare2Icon,
    CircleDotIcon,
    FolderKanbanIcon,
    InboxIcon,
    ListTodoIcon,
    MailIcon,
    PencilIcon,
    PlayIcon,
    PlusIcon,
    SquareIcon,
    StopCircleIcon,
    TimerIcon,
    Trash2Icon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useMutation } from 'urql';
import { z } from 'zod';
import { Button } from '../../../web/components/base/button';
import { DatePicker } from '../../../web/components/base/date-picker';
import { Input } from '../../../web/components/base/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../web/components/base/select';
import { Textarea } from '../../../web/components/base/textarea';
import { GlassCard } from '../../../web/components/GlassCard';
import type { GqlCProjectStatus, GqlCTaskStatus, GqlCWorkspaceProjectsPageQuery } from '../../../web/graphql/generated';
import {
    WorkspaceProjectDeleteDocument,
    WorkspaceProjectRequestArchiveDocument,
    WorkspaceProjectRequestDeleteDocument,
    WorkspaceProjectTimerStartDocument,
    WorkspaceProjectTimerStopDocument,
    WorkspaceProjectUpsertDocument,
    WorkspaceProjectsPageDocument,
    WorkspaceTaskDeleteDocument,
    WorkspaceTaskUpsertDocument,
} from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import { useLocale } from '../../../web/hooks/useLocale';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { cn } from '../../../web/utils/cn';
import type { Locale } from '../../../web/utils/locale';
import { localeFromParam } from '../../../web/utils/locale';

// Workspace projects hub — three tabs glued to one read query: Inbox
// triages incoming visitor `ProjectRequest`s, Projects is a status-grouped
// board of ongoing personal work, Todos lists standalone tasks (no
// project attached). Convert from inbox → project opens the project
// editor prefilled from the request; on submit `projectUpsert` inserts
// the project and archives the source request in one transaction.
// Admin-only, single-language (no DE/EN pairs); the page itself is
// noindex and reachable only by typing the URL until Phase 2 OAuth.
// See `docs/features/projects-workspace.md`.

type Tab = 'inbox' | 'projects' | 'todos';
const TABS = ['inbox', 'projects', 'todos'] as const satisfies ReadonlyArray<Tab>;
const TAB_LABELS: Record<Tab, { de: string; en: string }> = {
    inbox: { de: 'Eingang', en: 'Inbox' },
    projects: { de: 'Projekte', en: 'Projects' },
    todos: { de: 'Todos', en: 'Todos' },
};
const TAB_ICONS: Record<Tab, typeof InboxIcon> = {
    inbox: InboxIcon,
    projects: FolderKanbanIcon,
    todos: ListTodoIcon,
};

const title = { de: 'Projekte', en: 'Projects' };
const description = {
    de: 'Eingehende Anfragen, laufende Projekte und Todos.',
    en: 'Incoming requests, ongoing projects, and todos.',
};

const PROJECT_STATUS_ORDER: ReadonlyArray<GqlCProjectStatus> = ['idea', 'planning', 'active', 'paused', 'done', 'archived'];
const PROJECT_STATUS_LABELS: Record<GqlCProjectStatus, { de: string; en: string }> = {
    idea: { de: 'Ideen', en: 'Ideas' },
    planning: { de: 'In Planung', en: 'Planning' },
    active: { de: 'Aktiv', en: 'Active' },
    paused: { de: 'Pausiert', en: 'Paused' },
    done: { de: 'Fertig', en: 'Done' },
    archived: { de: 'Archiviert', en: 'Archived' },
};

const TASK_STATUS_ORDER: ReadonlyArray<GqlCTaskStatus> = ['todo', 'doing', 'done'];
const TASK_STATUS_LABELS: Record<GqlCTaskStatus, { de: string; en: string }> = {
    todo: { de: 'Offen', en: 'To do' },
    doing: { de: 'Aktiv', en: 'Doing' },
    done: { de: 'Erledigt', en: 'Done' },
};

const PROJECT_TYPE_LABELS: Record<string, { de: string; en: string }> = {
    webApp: { de: 'Web-App', en: 'Web app' },
    mobile: { de: 'Mobile App', en: 'Mobile app' },
    consulting: { de: 'Beratung', en: 'Consulting' },
    aiIntegration: { de: 'KI-Integration', en: 'AI integration' },
    other: { de: 'Sonstiges', en: 'Other' },
};

// Renders a seconds total as `Hh Mm` or `Mm Ss` for short stretches. The
// project card's `Total: …` pill uses this.
function formatDuration(totalSec: number): string {
    if (totalSec < 60) return `${totalSec}s`;
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    return `${minutes}m`;
}

// HH:MM:SS — used for the live ticking timer pill, where seconds are
// visible (the static badge above uses `formatDuration` for terse totals).
function formatHms(totalSec: number): string {
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// URL state for this page. `tab` selects the active section; `inboxView`
// toggles the archive/inbox split on the Inbox tab and is absent (= `inbox`)
// when at the default. `focus` deep-links to a single row across any tab —
// the page scrolls it into view and flashes it briefly on land, then drops
// the param so a refresh doesn't re-flash. Emitted by the personal-assistant
// chat (`agentPersonalAssistant`'s system prompt formats every mentioned
// project/task/inbox row as `?focus=<id>`). State that survives reload sits
// here; ephemeral local state (which row is expanded, which form is being
// edited) stays in `useState`.
const projectsSearchSchema = z.object({
    tab: z.enum(TABS).optional(),
    inboxView: z.enum(['archive']).optional(),
    // Free-form id; an unmatched value is a no-op (no row, no flash). We
    // don't validate as `uuid()` so a future non-UUID surface (e.g.
    // `focus=tasks-summary`) doesn't need a schema change.
    focus: z.string().optional(),
});

type ProjectsSearch = z.infer<typeof projectsSearchSchema>;

export const Route = createFileRoute('/{-$locale}/workspace/projects')({
    validateSearch: projectsSearchSchema,
    loader: () => routeLoaderGraphqlClient(WorkspaceProjectsPageDocument)(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: title[locale],
            description: description[locale],
            path: '/workspace/projects',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component: WorkspaceProjects,
});

function WorkspaceProjects() {
    const locale = useLocale();
    const search = Route.useSearch();
    const navigate = Route.useNavigate();
    const tab: Tab = search.tab ?? 'projects';
    const data = Route.useLoaderData();
    const router = useRouter();
    const onChanged = () => router.invalidate();

    const inboxCount = data.admin.projectRequests.filter((r) => r.status === 'emailVerified').length;

    // Deep-link focus: the chat assistant emits links like
    // `/workspace/projects?tab=projects&focus=<id>`. When `focus` is set we
    // find the matching `<li data-row-id>` once the active tab has rendered
    // it, scroll it into view, flash it for ~1500ms, then drop the search
    // param so a refresh doesn't re-flash. If the id doesn't match anything
    // on the active tab (wrong tab, or the row was deleted), no-op silently.
    // See `docs/architecture/agent-delegation.md` ("Deep links").
    useEffect(() => {
        const focusId = search.focus;
        if (!focusId) return;
        // `requestAnimationFrame` lets the active tab's list render before
        // we query the DOM — the user might have navigated straight to the
        // page with `?tab=todos&focus=...` and the Todos list mounts on
        // commit.
        let cancelled = false;
        const frame = requestAnimationFrame(() => {
            if (cancelled) return;
            const el = document.querySelector<HTMLElement>(`[data-row-id="${focusId}"]`);
            if (!el) {
                // Row missing on this tab — clear the param so we don't keep
                // re-running this effect when the user later changes tabs.
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

    return (
        <main className="px-6 md:px-10 lg:px-16 max-w-5xl mx-auto w-full py-12 leading-relaxed">
            <p className="text-sm text-muted-foreground">{description[locale]}</p>

            <nav className="mt-8 flex gap-1 border-b border-border/60" aria-label={{ de: 'Bereiche', en: 'Sections' }[locale]}>
                {TABS.map((t) => {
                    const Icon = TAB_ICONS[t];
                    const isActive = tab === t;
                    return (
                        <Link
                            key={t}
                            to="/{-$locale}/workspace/projects"
                            from="/{-$locale}/workspace/projects"
                            // Default tab (`projects`) drops the key so the canonical
                            // URL for the landing view has no `?tab=`. Switching tabs
                            // also clears `inboxView` so per-tab subfilters don't
                            // leak between tabs.
                            search={() => (t === 'projects' ? {} : { tab: t })}
                            replace
                            className={cn(
                                '-mb-px flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors',
                                isActive
                                    ? 'border-primary text-foreground'
                                    : 'border-transparent text-muted-foreground hover:text-foreground',
                            )}
                            aria-current={isActive ? 'page' : undefined}
                        >
                            <Icon className="size-4" />
                            {TAB_LABELS[t][locale]}
                            {t === 'inbox' && inboxCount > 0 ? (
                                <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                                    {inboxCount}
                                </span>
                            ) : null}
                        </Link>
                    );
                })}
            </nav>

            <div className="mt-8">
                {tab === 'inbox' ? (
                    <InboxSection
                        rows={data.admin.projectRequests}
                        showArchived={search.inboxView === 'archive'}
                        locale={locale}
                        onChanged={onChanged}
                    />
                ) : null}
                {tab === 'projects' ? (
                    <ProjectsBoard
                        rows={data.admin.projects}
                        activeTimer={data.admin.activeTimer ?? null}
                        locale={locale}
                        onChanged={onChanged}
                    />
                ) : null}
                {tab === 'todos' ? <TodosSection rows={data.admin.standaloneTasks} locale={locale} onChanged={onChanged} /> : null}
            </div>
        </main>
    );
}

// --- Inbox ------------------------------------------------------------------

type RequestRow = GqlCWorkspaceProjectsPageQuery['admin']['projectRequests'][number];

function InboxSection({
    rows,
    showArchived,
    locale,
    onChanged,
}: {
    rows: ReadonlyArray<RequestRow>;
    showArchived: boolean;
    locale: Locale;
    onChanged: () => void;
}) {
    const visible = rows.filter((r) => (showArchived ? r.status === 'archived' : r.status === 'emailVerified' && !r.convertedProject));
    const convertedCount = rows.filter((r) => r.convertedProject).length;

    return (
        <section>
            <div className="flex items-center justify-between gap-4">
                <p className="text-sm text-muted-foreground">
                    {showArchived
                        ? { de: 'Archivierte Anfragen.', en: 'Archived requests.' }[locale]
                        : { de: 'Verifizierte Anfragen, die auf eine Antwort warten.', en: 'Verified requests waiting on a reply.' }[
                              locale
                          ]}
                </p>
                <Button asChild variant="outline" size="sm">
                    {/* Inbox-view toggle stays in the URL: `?inboxView=archive`
                     * or absent. Reload preserves the view, and a shared link
                     * to the archive opens straight to it. */}
                    <Link
                        to="/{-$locale}/workspace/projects"
                        from="/{-$locale}/workspace/projects"
                        search={(prev: ProjectsSearch) => ({
                            ...prev,
                            inboxView: showArchived ? undefined : ('archive' as const),
                        })}
                        replace
                    >
                        {showArchived
                            ? { de: 'Eingang anzeigen', en: 'Show inbox' }[locale]
                            : { de: 'Archiv anzeigen', en: 'Show archive' }[locale]}
                    </Link>
                </Button>
            </div>
            {convertedCount > 0 && !showArchived ? (
                <p className="mt-2 text-xs text-muted-foreground">
                    {
                        {
                            de: `${convertedCount} bereits in Projekte umgewandelt.`,
                            en: `${convertedCount} already converted to projects.`,
                        }[locale]
                    }
                </p>
            ) : null}

            {visible.length === 0 ? (
                <GlassCard className="mt-6 px-5 py-8 text-center text-sm text-muted-foreground">
                    {showArchived
                        ? { de: 'Keine archivierten Anfragen.', en: 'No archived requests.' }[locale]
                        : { de: 'Keine offenen Anfragen.', en: 'No open requests.' }[locale]}
                </GlassCard>
            ) : (
                <ul className="mt-6 flex flex-col gap-3">
                    {visible.map((row) => (
                        <li key={row.projectRequestId} data-row-id={row.projectRequestId}>
                            <InboxRow row={row} locale={locale} onChanged={onChanged} />
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}

function InboxRow({ row, locale, onChanged }: { row: RequestRow; locale: Locale; onChanged: () => void }) {
    const [expanded, setExpanded] = useState(false);
    const [converting, setConverting] = useState(false);
    const [, archive] = useMutation(WorkspaceProjectRequestArchiveDocument);
    const [, del] = useMutation(WorkspaceProjectRequestDeleteDocument);
    const [busy, setBusy] = useState(false);

    const typeLabel = PROJECT_TYPE_LABELS[row.projectType]?.[locale] ?? row.projectType;
    const submittedAt = format(parseISO(row.createdAt as unknown as string), 'yyyy-MM-dd');

    return (
        <GlassCard className="px-5 py-4">
            <div className="flex items-start justify-between gap-4">
                <button type="button" onClick={() => setExpanded(!expanded)} className="min-w-0 flex-1 text-left">
                    <div className="flex items-center gap-2 text-sm font-medium">
                        <span className="truncate">{row.company?.trim() ? row.company : row.name}</span>
                        <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] uppercase tracking-wide text-secondary-foreground">
                            {typeLabel}
                        </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                        <MailIcon className="size-3" />
                        <span className="truncate">{row.email}</span>
                        <span>·</span>
                        <span>{submittedAt}</span>
                        {row.convertedProject ? (
                            <>
                                <span>·</span>
                                <span className="text-primary">
                                    {{ de: 'Umgewandelt', en: 'Converted' }[locale]} → {row.convertedProject.title}
                                </span>
                            </>
                        ) : null}
                    </div>
                </button>
                <div className="flex shrink-0 gap-1">
                    {row.status === 'emailVerified' && !row.convertedProject ? (
                        <Button size="sm" onClick={() => setConverting(true)} disabled={busy || converting}>
                            <ArrowRightIcon />
                            {{ de: 'In Projekt umwandeln', en: 'Convert to project' }[locale]}
                        </Button>
                    ) : null}
                    {row.status !== 'archived' ? (
                        <Button
                            size="icon-sm"
                            variant="ghost"
                            aria-label={{ de: 'Archivieren', en: 'Archive' }[locale]}
                            onClick={async () => {
                                setBusy(true);
                                await archive({ projectRequestId: row.projectRequestId });
                                setBusy(false);
                                onChanged();
                            }}
                            disabled={busy}
                        >
                            <ArchiveIcon />
                        </Button>
                    ) : null}
                    <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={{ de: 'Löschen', en: 'Delete' }[locale]}
                        onClick={async () => {
                            setBusy(true);
                            await del({ projectRequestId: row.projectRequestId });
                            setBusy(false);
                            onChanged();
                        }}
                        disabled={busy}
                    >
                        <Trash2Icon />
                    </Button>
                </div>
            </div>
            {expanded ? (
                <div className="mt-3 space-y-2 border-t border-border/40 pt-3 text-sm text-muted-foreground">
                    <p className="whitespace-pre-wrap text-foreground">{row.description}</p>
                    <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        {row.budget ? <Fact label={{ de: 'Budget', en: 'Budget' }[locale]} value={row.budget} /> : null}
                        {row.timeline ? <Fact label={{ de: 'Zeitrahmen', en: 'Timeline' }[locale]} value={row.timeline} /> : null}
                        <Fact label={{ de: 'Name', en: 'Name' }[locale]} value={row.name} />
                        {row.company ? <Fact label={{ de: 'Unternehmen', en: 'Company' }[locale]} value={row.company} /> : null}
                    </dl>
                </div>
            ) : null}
            {converting ? (
                <ProjectForm
                    row={null}
                    locale={locale}
                    nextPosition={null}
                    initialValues={projectDraftFromRequest(row, locale)}
                    sourceRequestId={row.projectRequestId}
                    onClose={() => setConverting(false)}
                    onSaved={() => {
                        setConverting(false);
                        onChanged();
                    }}
                />
            ) : null}
        </GlassCard>
    );
}

// Synthesizes a sensible draft so the inbox can prefill the project
// editor when converting a request: the admin reviews and tweaks before
// the project lands on the board, rather than committing the auto-built
// title/notes blindly. The server-side merge keeps the description and
// notes intact when `projectUpsert` archives the source request.
function projectDraftFromRequest(
    row: RequestRow,
    locale: Locale,
): { title: string; description: string; notes: string; status: GqlCProjectStatus } {
    const typeLabel = PROJECT_TYPE_LABELS[row.projectType]?.[locale] ?? row.projectType;
    const subject = row.company?.trim() ? row.company : row.name;
    const parts: string[] = [];
    if (row.budget) parts.push(`Budget: ${row.budget}`);
    if (row.timeline) parts.push(`Timeline: ${row.timeline}`);
    parts.push(`Contact: ${row.name} <${row.email}>`);
    return {
        title: `${typeLabel}: ${subject}`,
        description: row.description,
        notes: parts.join('\n'),
        status: 'planning',
    };
}

function Fact({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <dt className="font-medium uppercase tracking-wide text-muted-foreground/70">{label}</dt>
            <dd className="text-foreground">{value}</dd>
        </div>
    );
}

// --- Projects board ---------------------------------------------------------

type ProjectRow = GqlCWorkspaceProjectsPageQuery['admin']['projects'][number];
type ActiveTimer = NonNullable<GqlCWorkspaceProjectsPageQuery['admin']['activeTimer']>;

function ProjectsBoard({
    rows,
    activeTimer,
    locale,
    onChanged,
}: {
    rows: ReadonlyArray<ProjectRow>;
    activeTimer: ActiveTimer | null;
    locale: Locale;
    onChanged: () => void;
}) {
    const [editing, setEditing] = useState<ProjectRow | 'new' | null>(null);
    const grouped = PROJECT_STATUS_ORDER.map((status) => ({
        status,
        rows: rows.filter((r) => r.status === status),
    }));

    return (
        <section>
            <div className="flex items-center justify-between gap-4">
                <p className="text-sm text-muted-foreground">
                    {{ de: 'Laufende und geplante persönliche Projekte.', en: 'Ongoing and planned personal projects.' }[locale]}
                </p>
                <Button size="sm" variant="outline" onClick={() => setEditing('new')} disabled={editing !== null}>
                    <PlusIcon />
                    {{ de: 'Projekt hinzufügen', en: 'Add project' }[locale]}
                </Button>
            </div>

            {editing === 'new' ? (
                <ProjectForm
                    row={null}
                    locale={locale}
                    nextPosition={rows.filter((r) => r.status === 'idea').length}
                    onClose={() => setEditing(null)}
                    onSaved={() => {
                        setEditing(null);
                        onChanged();
                    }}
                />
            ) : null}

            <div className="mt-6 flex flex-col gap-8">
                {grouped.map((group) =>
                    group.rows.length === 0 && editing !== 'new' ? null : (
                        <div key={group.status}>
                            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                {PROJECT_STATUS_LABELS[group.status][locale]} · {group.rows.length}
                            </h2>
                            {group.rows.length === 0 ? null : (
                                <ul className="mt-3 flex flex-col gap-3">
                                    {group.rows.map((row) => (
                                        <li key={row.projectId} data-row-id={row.projectId}>
                                            {editing && editing !== 'new' && editing.projectId === row.projectId ? (
                                                <ProjectForm
                                                    row={row}
                                                    locale={locale}
                                                    nextPosition={row.position}
                                                    onClose={() => setEditing(null)}
                                                    onSaved={() => {
                                                        setEditing(null);
                                                        onChanged();
                                                    }}
                                                />
                                            ) : (
                                                <ProjectCard
                                                    row={row}
                                                    activeTimer={activeTimer}
                                                    locale={locale}
                                                    onEdit={() => setEditing(row)}
                                                    onChanged={onChanged}
                                                />
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    ),
                )}
            </div>
        </section>
    );
}

function ProjectCard({
    row,
    activeTimer,
    locale,
    onEdit,
    onChanged,
}: {
    row: ProjectRow;
    activeTimer: ActiveTimer | null;
    locale: Locale;
    onEdit: () => void;
    onChanged: () => void;
}) {
    const [, del] = useMutation(WorkspaceProjectDeleteDocument);

    const doneCount = row.tasks.filter((t) => t.status === 'done').length;
    const totalCount = row.tasks.length;

    // Live total = stored seconds + (now - startedAt) when *this* project's
    // timer is running. Other-project timers don't bleed into this number.
    const isOwnTimerRunning = activeTimer?.projectId === row.projectId;

    // The card itself is a link to the project detail route; the kanban board
    // no longer expands tasks / activity inline (Phase: detail-route refactor).
    // The action buttons in the header still need to stop propagation so a
    // click on the timer / edit / delete doesn't navigate.
    return (
        <GlassCard className="px-5 py-4">
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                    <Link
                        to="/{-$locale}/workspace/projects/$projectId"
                        params={{ projectId: row.projectId }}
                        className="block truncate text-sm font-medium hover:underline"
                    >
                        {row.title}
                    </Link>
                    {row.description ? <div className="mt-0.5 truncate text-xs text-muted-foreground">{row.description}</div> : null}
                    {row.sourceRequest ? (
                        <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                            <MailIcon className="size-3" />
                            {{ de: 'Anfrage von', en: 'Request from' }[locale]} {row.sourceRequest.name}
                            {row.sourceRequest.company ? ` · ${row.sourceRequest.company}` : ''}
                        </div>
                    ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                    <TimerPill
                        projectId={row.projectId}
                        activeTimer={activeTimer}
                        totalWorkSec={row.totalWorkSec}
                        locale={locale}
                        onChanged={onChanged}
                    />
                    {totalCount > 0 ? (
                        <span className="rounded-md bg-secondary px-2 py-0.5 text-[11px] text-secondary-foreground">
                            {doneCount}/{totalCount}
                        </span>
                    ) : null}
                    <Button size="icon-sm" variant="ghost" aria-label={{ de: 'Bearbeiten', en: 'Edit' }[locale]} onClick={onEdit}>
                        <PencilIcon />
                    </Button>
                    <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={{ de: 'Löschen', en: 'Delete' }[locale]}
                        onClick={async () => {
                            await del({ projectId: row.projectId });
                            onChanged();
                        }}
                    >
                        <Trash2Icon />
                    </Button>
                </div>
            </div>
            <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                <Link
                    to="/{-$locale}/workspace/projects/$projectId"
                    params={{ projectId: row.projectId }}
                    className="underline-offset-2 hover:text-foreground hover:underline"
                >
                    {{ de: 'Details öffnen', en: 'Open details' }[locale]} →
                </Link>
                {row.activities.length > 0 ? (
                    <span className="text-[11px] text-muted-foreground">
                        {row.activities.length} {{ de: 'Einträge', en: 'entries' }[locale]}
                    </span>
                ) : null}
                {row.totalWorkSec > 0 || isOwnTimerRunning ? (
                    <span className="ml-auto text-[11px] text-muted-foreground">
                        {{ de: 'Gesamt', en: 'Total' }[locale]}:{' '}
                        <TotalWorkLabel totalWorkSec={row.totalWorkSec} activeTimer={isOwnTimerRunning ? activeTimer : null} />
                    </span>
                ) : null}
            </div>
        </GlassCard>
    );
}

// --- Timer & activity --------------------------------------------------------

// Per-card timer button. Three states:
// - This project's timer is running   → ticking HH:MM:SS pill with a stop button
// - Another project has the timer     → muted "Timer on …" hint with a switch action
// - No timer is running                → "Start timer" button
function TimerPill({
    projectId,
    activeTimer,
    locale,
    onChanged,
}: {
    projectId: string;
    activeTimer: ActiveTimer | null;
    totalWorkSec: number;
    locale: Locale;
    onChanged: () => void;
}) {
    const [, start] = useMutation(WorkspaceProjectTimerStartDocument);
    const [, stop] = useMutation(WorkspaceProjectTimerStopDocument);
    const [busy, setBusy] = useState(false);

    const isOwn = activeTimer?.projectId === projectId;
    const isOther = activeTimer && !isOwn;

    if (isOwn && activeTimer.startedAt) {
        return (
            <LiveTimerPill
                startedAt={activeTimer.startedAt as unknown as string}
                onStop={async () => {
                    if (busy) return;
                    setBusy(true);
                    await stop({ activityId: activeTimer.activityId });
                    onChanged();
                    setBusy(false);
                }}
                locale={locale}
            />
        );
    }

    if (isOther) {
        return (
            <Button
                size="sm"
                variant="ghost"
                disabled={busy}
                className="text-[11px] text-muted-foreground"
                onClick={async () => {
                    setBusy(true);
                    await start({ projectId, taskId: null, title: null });
                    onChanged();
                    setBusy(false);
                }}
                aria-label={{ de: 'Timer hierher wechseln', en: 'Switch timer here' }[locale]}
                title={{ de: 'Anderer Timer läuft. Klicken zum Wechseln.', en: 'Another timer is running. Click to switch.' }[locale]}
            >
                <TimerIcon className="size-3 opacity-60" />
                <span className="ml-1">{{ de: 'Wechseln', en: 'Switch' }[locale]}</span>
            </Button>
        );
    }

    return (
        <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={async () => {
                setBusy(true);
                await start({ projectId, taskId: null, title: null });
                onChanged();
                setBusy(false);
            }}
            aria-label={{ de: 'Timer starten', en: 'Start timer' }[locale]}
        >
            <PlayIcon className="size-3" />
            <span className="ml-1 text-[11px]">{{ de: 'Start', en: 'Start' }[locale]}</span>
        </Button>
    );
}

// Live ticker. Runs a 1s interval against `startedAt` so the parent's
// query state stays cached — the seconds display updates without
// re-fetching.
function LiveTimerPill({ startedAt, onStop, locale }: { startedAt: string; onStop: () => void; locale: Locale }) {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, []);
    const elapsed = Math.max(0, Math.floor((now - parseISO(startedAt).getTime()) / 1000));
    return (
        <button
            type="button"
            onClick={onStop}
            className="flex items-center gap-1 rounded-md bg-primary/15 px-2 py-1 font-mono text-[11px] text-primary hover:bg-primary/25"
            aria-label={{ de: 'Timer stoppen', en: 'Stop timer' }[locale]}
        >
            <StopCircleIcon className="size-3" />
            <span>{formatHms(elapsed)}</span>
        </button>
    );
}

// "Total: 4h 32m" — adds the running seconds when this project's timer
// is the active one, so the total ticks visibly during work.
function TotalWorkLabel({ totalWorkSec, activeTimer }: { totalWorkSec: number; activeTimer: ActiveTimer | null }) {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        if (!activeTimer?.startedAt) return;
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, [activeTimer?.startedAt]);
    const live = activeTimer?.startedAt
        ? Math.max(0, Math.floor((now - parseISO(activeTimer.startedAt as unknown as string).getTime()) / 1000))
        : 0;
    return <span className="font-medium text-foreground">{formatDuration(totalWorkSec + live)}</span>;
}

function ProjectForm({
    row,
    locale,
    nextPosition,
    initialValues,
    sourceRequestId,
    onClose,
    onSaved,
}: {
    row: ProjectRow | null;
    locale: Locale;
    nextPosition: number | null;
    initialValues?: { title?: string; description?: string; notes?: string; status?: GqlCProjectStatus };
    sourceRequestId?: string | null;
    onClose: () => void;
    onSaved: () => void;
}) {
    const [, upsert] = useMutation(WorkspaceProjectUpsertDocument);
    const [form, setForm] = useState({
        title: row?.title ?? initialValues?.title ?? '',
        description: row?.description ?? initialValues?.description ?? '',
        notes: row?.notes ?? initialValues?.notes ?? '',
        status: row?.status ?? initialValues?.status ?? ('idea' as GqlCProjectStatus),
    });
    const [busy, setBusy] = useState(false);

    return (
        <form
            onSubmit={async (event) => {
                event.preventDefault();
                setBusy(true);
                await upsert({
                    projectId: row?.projectId ?? null,
                    title: form.title,
                    description: form.description || null,
                    notes: form.notes || null,
                    status: form.status,
                    // Updates pass the existing position; new hand-authored rows
                    // fall back to nextPosition; conversions from a request omit
                    // it entirely (server appends to `planning`).
                    position: row?.position ?? nextPosition ?? null,
                    sourceRequestId: sourceRequestId ?? null,
                    startedAt: row?.startedAt ?? null,
                    completedAt: row?.completedAt ?? null,
                });
                setBusy(false);
                onSaved();
            }}
            className="mt-4"
        >
            <GlassCard className="px-5 py-5">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <Field label={{ de: 'Titel', en: 'Title' }[locale]} fullWidth>
                        <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                    </Field>
                    <Field label={{ de: 'Kurzbeschreibung', en: 'Short description' }[locale]} fullWidth>
                        <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                    </Field>
                    <Field label={{ de: 'Status', en: 'Status' }[locale]}>
                        <Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value as GqlCProjectStatus })}>
                            <SelectTrigger className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {PROJECT_STATUS_ORDER.map((s) => (
                                    <SelectItem key={s} value={s}>
                                        {PROJECT_STATUS_LABELS[s][locale]}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>
                    <Field label={{ de: 'Notizen (Markdown)', en: 'Notes (markdown)' }[locale]} fullWidth>
                        <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={6} />
                    </Field>
                </div>
                <div className="mt-4 flex justify-end gap-2">
                    <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
                        {{ de: 'Abbrechen', en: 'Cancel' }[locale]}
                    </Button>
                    <Button type="submit" disabled={busy}>
                        {{ de: 'Speichern', en: 'Save' }[locale]}
                    </Button>
                </div>
            </GlassCard>
        </form>
    );
}

// --- Tasks (inside a project, or standalone) --------------------------------

type TaskRow = GqlCWorkspaceProjectsPageQuery['admin']['standaloneTasks'][number];

function TaskItem({ task, locale, onChanged }: { task: TaskRow; locale: Locale; onChanged: () => void }) {
    const [, upsert] = useMutation(WorkspaceTaskUpsertDocument);
    const [, del] = useMutation(WorkspaceTaskDeleteDocument);
    const [editing, setEditing] = useState(false);

    const nextStatus: Record<GqlCTaskStatus, GqlCTaskStatus> = { todo: 'doing', doing: 'done', done: 'todo' };
    const StatusIcon = task.status === 'done' ? CheckSquare2Icon : task.status === 'doing' ? CircleDotIcon : SquareIcon;

    const onToggle = async () => {
        const target = nextStatus[task.status];
        await upsert({
            taskId: task.taskId,
            projectId: task.projectId ?? null,
            title: task.title,
            notes: task.notes ?? null,
            status: target,
            position: task.position,
            dueAt: task.dueAt ?? null,
            completedAt: target === 'done' ? new Date().toISOString() : null,
        });
        onChanged();
    };

    if (editing) {
        return (
            <li>
                <TaskForm
                    task={task}
                    projectId={task.projectId ?? null}
                    locale={locale}
                    nextPosition={task.position}
                    onClose={() => setEditing(false)}
                    onSaved={() => {
                        setEditing(false);
                        onChanged();
                    }}
                />
            </li>
        );
    }

    return (
        <li data-row-id={task.taskId} className="group flex items-center gap-2 rounded-md px-1 py-1 hover:bg-background/40">
            <button
                type="button"
                onClick={onToggle}
                className={cn(
                    'shrink-0 transition-colors',
                    task.status === 'done' ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                )}
                aria-label={{ de: 'Status wechseln', en: 'Cycle status' }[locale]}
            >
                <StatusIcon className="size-4" />
            </button>
            <span className={cn('min-w-0 flex-1 truncate text-sm', task.status === 'done' && 'line-through text-muted-foreground')}>
                {task.title}
            </span>
            {task.dueAt ? (
                <span className="shrink-0 text-[10px] text-muted-foreground">
                    {format(parseISO(task.dueAt as unknown as string), 'yyyy-MM-dd')}
                </span>
            ) : null}
            <span className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
                <Button
                    size="icon-xs"
                    variant="ghost"
                    aria-label={{ de: 'Bearbeiten', en: 'Edit' }[locale]}
                    onClick={() => setEditing(true)}
                >
                    <PencilIcon />
                </Button>
                <Button
                    size="icon-xs"
                    variant="ghost"
                    aria-label={{ de: 'Löschen', en: 'Delete' }[locale]}
                    onClick={async () => {
                        await del({ taskId: task.taskId });
                        onChanged();
                    }}
                >
                    <Trash2Icon />
                </Button>
            </span>
        </li>
    );
}

function TaskForm({
    task,
    projectId,
    locale,
    nextPosition,
    onClose,
    onSaved,
}: {
    task: TaskRow | null;
    projectId: string | null;
    locale: Locale;
    nextPosition: number;
    onClose: () => void;
    onSaved: () => void;
}) {
    const [, upsert] = useMutation(WorkspaceTaskUpsertDocument);
    const [form, setForm] = useState({
        title: task?.title ?? '',
        notes: task?.notes ?? '',
        status: task?.status ?? ('todo' as GqlCTaskStatus),
        dueAt: task?.dueAt ? format(parseISO(task.dueAt as unknown as string), 'yyyy-MM-dd') : '',
    });
    const [busy, setBusy] = useState(false);

    return (
        <form
            onSubmit={async (event) => {
                event.preventDefault();
                setBusy(true);
                await upsert({
                    taskId: task?.taskId ?? null,
                    projectId,
                    title: form.title,
                    notes: form.notes || null,
                    status: form.status,
                    position: task?.position ?? nextPosition,
                    dueAt: form.dueAt ? new Date(`${form.dueAt}T00:00:00Z`).toISOString() : null,
                    completedAt: form.status === 'done' ? (task?.completedAt ?? new Date().toISOString()) : null,
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
                        <Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value as GqlCTaskStatus })}>
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
                        />
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

// --- Standalone todos -------------------------------------------------------

function TodosSection({ rows, locale, onChanged }: { rows: ReadonlyArray<TaskRow>; locale: Locale; onChanged: () => void }) {
    const [adding, setAdding] = useState(false);
    return (
        <section>
            <div className="flex items-center justify-between gap-4">
                <p className="text-sm text-muted-foreground">
                    {{ de: 'Todos, die zu keinem Projekt gehören.', en: 'Todos that don’t belong to any project.' }[locale]}
                </p>
                <Button size="sm" variant="outline" onClick={() => setAdding(true)} disabled={adding}>
                    <PlusIcon />
                    {{ de: 'Todo hinzufügen', en: 'Add todo' }[locale]}
                </Button>
            </div>
            {adding ? (
                <TaskForm
                    task={null}
                    projectId={null}
                    locale={locale}
                    nextPosition={rows.filter((t) => t.status === 'todo').length}
                    onClose={() => setAdding(false)}
                    onSaved={() => {
                        setAdding(false);
                        onChanged();
                    }}
                />
            ) : null}
            <div className="mt-6 flex flex-col gap-4">
                {TASK_STATUS_ORDER.map((status) => {
                    const bucket = rows.filter((t) => t.status === status);
                    if (bucket.length === 0) return null;
                    return (
                        <div key={status}>
                            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                {TASK_STATUS_LABELS[status][locale]} · {bucket.length}
                            </h2>
                            <ul className="mt-2 flex flex-col gap-1">
                                {bucket.map((task) => (
                                    <TaskItem key={task.taskId} task={task} locale={locale} onChanged={onChanged} />
                                ))}
                            </ul>
                        </div>
                    );
                })}
                {rows.length === 0 && !adding ? (
                    <GlassCard className="px-5 py-8 text-center text-sm text-muted-foreground">
                        {{ de: 'Keine Todos.', en: 'No todos.' }[locale]}
                    </GlassCard>
                ) : null}
            </div>
        </section>
    );
}

// --- Shared form bits -------------------------------------------------------

function Field({ label, children, fullWidth }: { label: string; children: React.ReactNode; fullWidth?: boolean }) {
    return (
        <label className={fullWidth ? 'flex flex-col gap-1 md:col-span-2' : 'flex flex-col gap-1'}>
            <span className="text-xs font-medium text-muted-foreground">{label}</span>
            {children}
        </label>
    );
}
