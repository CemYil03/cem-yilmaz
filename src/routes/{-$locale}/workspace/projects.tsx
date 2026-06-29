import { createFileRoute } from '@tanstack/react-router';
import { format, parseISO } from 'date-fns';
import {
    ArchiveIcon,
    ArrowRightIcon,
    CheckSquare2Icon,
    CircleDotIcon,
    FlagIcon,
    FolderKanbanIcon,
    HandshakeIcon,
    InboxIcon,
    ListTodoIcon,
    MailIcon,
    PencilIcon,
    PhoneCallIcon,
    PlayIcon,
    PlusIcon,
    SquareIcon,
    StickyNoteIcon,
    StopCircleIcon,
    TimerIcon,
    Trash2Icon,
    VideoIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useMutation, useQuery } from 'urql';
import { Button } from '../../../web/components/base/button';
import { DatePicker } from '../../../web/components/base/date-picker';
import { Input } from '../../../web/components/base/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../web/components/base/select';
import { Textarea } from '../../../web/components/base/textarea';
import { GlassCard } from '../../../web/components/GlassCard';
import type {
    GqlCProjectActivityChannel,
    GqlCProjectActivityKind,
    GqlCProjectStatus,
    GqlCTaskStatus,
    GqlCWorkspaceProjectsPageQuery,
} from '../../../web/graphql/generated';
import {
    WorkspaceProjectActivityDeleteDocument,
    WorkspaceProjectActivityUpsertDocument,
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
const TABS: ReadonlyArray<Tab> = ['inbox', 'projects', 'todos'];
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

const ACTIVITY_KIND_ORDER: ReadonlyArray<GqlCProjectActivityKind> = ['clientContact', 'meeting', 'work', 'offer', 'milestone', 'note'];
const ACTIVITY_KIND_LABELS: Record<GqlCProjectActivityKind, { de: string; en: string }> = {
    clientContact: { de: 'Kundenkontakt', en: 'Client contact' },
    meeting: { de: 'Meeting', en: 'Meeting' },
    work: { de: 'Arbeit', en: 'Work' },
    offer: { de: 'Angebot', en: 'Offer' },
    milestone: { de: 'Meilenstein', en: 'Milestone' },
    note: { de: 'Notiz', en: 'Note' },
};
const ACTIVITY_KIND_ICONS: Record<GqlCProjectActivityKind, typeof PhoneCallIcon> = {
    clientContact: PhoneCallIcon,
    meeting: VideoIcon,
    work: TimerIcon,
    offer: HandshakeIcon,
    milestone: FlagIcon,
    note: StickyNoteIcon,
};
const ACTIVITY_CHANNEL_ORDER: ReadonlyArray<GqlCProjectActivityChannel> = [
    'malt',
    'email',
    'phone',
    'videoCall',
    'inPerson',
    'aiAssistant',
    'other',
];
const ACTIVITY_CHANNEL_LABELS: Record<GqlCProjectActivityChannel, { de: string; en: string }> = {
    malt: { de: 'Malt', en: 'Malt' },
    email: { de: 'E-Mail', en: 'Email' },
    phone: { de: 'Telefon', en: 'Phone' },
    videoCall: { de: 'Videoanruf', en: 'Video call' },
    inPerson: { de: 'Vor Ort', en: 'In person' },
    aiAssistant: { de: 'KI-Assistent', en: 'AI assistant' },
    other: { de: 'Sonstiges', en: 'Other' },
};

// Renders a seconds total as `Hh Mm` or `Mm Ss` for short stretches. The
// activity timeline and the project's `Total: …` pill both use this.
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

export const Route = createFileRoute('/{-$locale}/workspace/projects')({
    validateSearch: (search: Record<string, unknown>) => {
        const raw = typeof search.tab === 'string' ? (search.tab as Tab) : undefined;
        const tab: Tab = raw && (TABS as ReadonlyArray<string>).includes(raw) ? raw : 'projects';
        return { tab };
    },
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
    const { tab } = Route.useSearch();
    const navigate = Route.useNavigate();
    const [{ data, fetching, error }, refetch] = useQuery({ query: WorkspaceProjectsPageDocument, requestPolicy: 'cache-and-network' });
    const onChanged = () => refetch({ requestPolicy: 'network-only' });

    const inboxCount = data?.admin.projectRequests.filter((r) => r.status === 'emailVerified').length ?? 0;

    return (
        <main className="px-6 md:px-10 lg:px-16 max-w-5xl mx-auto w-full py-12 leading-relaxed">
            <div className="flex items-center gap-3 text-primary">
                <FolderKanbanIcon className="size-6" />
                <h1 className="text-3xl font-bold tracking-tight text-foreground">{title[locale]}</h1>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{description[locale]}</p>

            <nav className="mt-8 flex gap-1 border-b border-border/60" aria-label={{ de: 'Bereiche', en: 'Sections' }[locale]}>
                {TABS.map((t) => {
                    const Icon = TAB_ICONS[t];
                    const isActive = tab === t;
                    return (
                        <button
                            key={t}
                            type="button"
                            onClick={() => void navigate({ search: { tab: t }, replace: true })}
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
                        </button>
                    );
                })}
            </nav>

            {fetching && !data ? <p className="mt-8 text-sm text-muted-foreground">…</p> : null}
            {error ? <p className="mt-8 text-sm text-destructive">{error.message}</p> : null}

            {data ? (
                <div className="mt-8">
                    {tab === 'inbox' ? <InboxSection rows={data.admin.projectRequests} locale={locale} onChanged={onChanged} /> : null}
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
            ) : null}
        </main>
    );
}

// --- Inbox ------------------------------------------------------------------

type RequestRow = GqlCWorkspaceProjectsPageQuery['admin']['projectRequests'][number];

function InboxSection({ rows, locale, onChanged }: { rows: ReadonlyArray<RequestRow>; locale: Locale; onChanged: () => void }) {
    const [showArchived, setShowArchived] = useState(false);
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
                <Button variant="outline" size="sm" onClick={() => setShowArchived(!showArchived)}>
                    {showArchived
                        ? { de: 'Eingang anzeigen', en: 'Show inbox' }[locale]
                        : { de: 'Archiv anzeigen', en: 'Show archive' }[locale]}
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
                        <li key={row.projectRequestId}>
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
type ActivityRow = ProjectRow['activities'][number];
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
                                        <li key={row.projectId}>
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
    const [tasksOpen, setTasksOpen] = useState(false);
    const [activityOpen, setActivityOpen] = useState(false);

    const doneCount = row.tasks.filter((t) => t.status === 'done').length;
    const totalCount = row.tasks.length;

    // Live total = stored seconds + (now - startedAt) when *this* project's
    // timer is running. Other-project timers don't bleed into this number.
    const isOwnTimerRunning = activeTimer?.projectId === row.projectId;

    return (
        <GlassCard className="px-5 py-4">
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{row.title}</div>
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
                <button
                    type="button"
                    onClick={() => setTasksOpen(!tasksOpen)}
                    className="underline-offset-2 hover:text-foreground hover:underline"
                >
                    {tasksOpen
                        ? { de: 'Aufgaben ausblenden', en: 'Hide tasks' }[locale]
                        : { de: 'Aufgaben anzeigen', en: 'Show tasks' }[locale]}
                </button>
                <button
                    type="button"
                    onClick={() => setActivityOpen(!activityOpen)}
                    className="underline-offset-2 hover:text-foreground hover:underline"
                >
                    {activityOpen
                        ? { de: 'Verlauf ausblenden', en: 'Hide timeline' }[locale]
                        : {
                              de: `Verlauf anzeigen (${row.activities.length})`,
                              en: `Show timeline (${row.activities.length})`,
                          }[locale]}
                </button>
                {row.totalWorkSec > 0 || isOwnTimerRunning ? (
                    <span className="ml-auto text-[11px] text-muted-foreground">
                        {{ de: 'Gesamt', en: 'Total' }[locale]}:{' '}
                        <TotalWorkLabel totalWorkSec={row.totalWorkSec} activeTimer={isOwnTimerRunning ? activeTimer : null} />
                    </span>
                ) : null}
            </div>
            {tasksOpen ? <TaskList tasks={row.tasks} projectId={row.projectId} locale={locale} onChanged={onChanged} /> : null}
            {activityOpen ? (
                <ActivityTimeline
                    activities={row.activities}
                    projectId={row.projectId}
                    tasks={row.tasks}
                    locale={locale}
                    onChanged={onChanged}
                />
            ) : null}
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

function ActivityTimeline({
    activities,
    projectId,
    tasks,
    locale,
    onChanged,
}: {
    activities: ReadonlyArray<ActivityRow>;
    projectId: string;
    tasks: ReadonlyArray<TaskRow>;
    locale: Locale;
    onChanged: () => void;
}) {
    const [adding, setAdding] = useState(false);
    const [editing, setEditing] = useState<ActivityRow | null>(null);
    const [, del] = useMutation(WorkspaceProjectActivityDeleteDocument);

    return (
        <div className="mt-3 border-t border-border/40 pt-3">
            <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {{ de: 'Verlauf', en: 'Timeline' }[locale]}
                </h3>
                <Button size="sm" variant="ghost" onClick={() => setAdding(true)} disabled={adding || editing !== null}>
                    <PlusIcon />
                    {{ de: 'Eintrag hinzufügen', en: 'Add entry' }[locale]}
                </Button>
            </div>

            {adding ? (
                <ActivityForm
                    activity={null}
                    projectId={projectId}
                    tasks={tasks}
                    locale={locale}
                    onClose={() => setAdding(false)}
                    onSaved={() => {
                        setAdding(false);
                        onChanged();
                    }}
                />
            ) : null}

            {activities.length === 0 && !adding ? (
                <p className="mt-3 text-xs text-muted-foreground">{{ de: 'Noch keine Einträge.', en: 'No entries yet.' }[locale]}</p>
            ) : (
                <ul className="mt-3 flex flex-col gap-2">
                    {activities.map((activity) => (
                        <li key={activity.activityId}>
                            {editing?.activityId === activity.activityId ? (
                                <ActivityForm
                                    activity={activity}
                                    projectId={projectId}
                                    tasks={tasks}
                                    locale={locale}
                                    onClose={() => setEditing(null)}
                                    onSaved={() => {
                                        setEditing(null);
                                        onChanged();
                                    }}
                                />
                            ) : (
                                <ActivityRowView
                                    activity={activity}
                                    locale={locale}
                                    onEdit={() => setEditing(activity)}
                                    onDelete={async () => {
                                        await del({ activityId: activity.activityId });
                                        onChanged();
                                    }}
                                />
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

function ActivityRowView({
    activity,
    locale,
    onEdit,
    onDelete,
}: {
    activity: ActivityRow;
    locale: Locale;
    onEdit: () => void;
    onDelete: () => void;
}) {
    const Icon = ACTIVITY_KIND_ICONS[activity.kind];
    const occurredAt = format(parseISO(activity.occurredAt as unknown as string), 'yyyy-MM-dd HH:mm');
    const isRunning = activity.kind === 'work' && activity.endedAt === null;
    // Work rows can't be hand-edited via the activity form — the timer
    // mutations own them. The delete button still applies (removes the
    // session from the total).
    return (
        <div className="flex items-start gap-2 text-xs">
            <Icon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="font-medium">{activity.title}</span>
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        {ACTIVITY_KIND_LABELS[activity.kind][locale]}
                    </span>
                    {activity.channel ? (
                        <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[10px] text-secondary-foreground">
                            {ACTIVITY_CHANNEL_LABELS[activity.channel][locale]}
                        </span>
                    ) : null}
                    {activity.durationSec ? (
                        <span className="text-[10px] text-muted-foreground">· {formatDuration(activity.durationSec)}</span>
                    ) : null}
                    {isRunning ? (
                        <span className="rounded-md bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                            {{ de: 'läuft', en: 'running' }[locale]}
                        </span>
                    ) : null}
                </div>
                {activity.notes ? <div className="mt-0.5 whitespace-pre-line text-muted-foreground">{activity.notes}</div> : null}
                <div className="mt-0.5 text-[10px] text-muted-foreground">{occurredAt}</div>
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
                {activity.kind === 'work' ? null : (
                    <Button size="icon-sm" variant="ghost" aria-label={{ de: 'Bearbeiten', en: 'Edit' }[locale]} onClick={onEdit}>
                        <PencilIcon />
                    </Button>
                )}
                <Button size="icon-sm" variant="ghost" aria-label={{ de: 'Löschen', en: 'Delete' }[locale]} onClick={onDelete}>
                    <Trash2Icon />
                </Button>
            </div>
        </div>
    );
}

function ActivityForm({
    activity,
    projectId,
    tasks,
    locale,
    onClose,
    onSaved,
}: {
    activity: ActivityRow | null;
    projectId: string;
    tasks: ReadonlyArray<TaskRow>;
    locale: Locale;
    onClose: () => void;
    onSaved: () => void;
}) {
    const [, upsert] = useMutation(WorkspaceProjectActivityUpsertDocument);
    // The default `occurredAt` for a new entry is "now, rounded to the
    // minute" — what Cem would type if asked.
    const defaultOccurredAt = () => {
        const d = new Date();
        d.setSeconds(0, 0);
        return d.toISOString().slice(0, 16);
    };
    const [form, setForm] = useState({
        kind: (activity?.kind ?? 'clientContact') as Exclude<GqlCProjectActivityKind, 'work'>,
        channel: activity?.channel ?? null,
        title: activity?.title ?? '',
        notes: activity?.notes ?? '',
        occurredAt: activity?.occurredAt
            ? format(parseISO(activity.occurredAt as unknown as string), "yyyy-MM-dd'T'HH:mm")
            : defaultOccurredAt(),
        taskId: activity?.taskId ?? null,
        durationMin: activity?.durationSec ? Math.round(activity.durationSec / 60).toString() : '',
    });
    const [busy, setBusy] = useState(false);

    // Channel is only meaningful for contact / meeting kinds; clear it on
    // any other selection so the server-side guard never fires on user
    // input.
    const channelRelevant = form.kind === 'clientContact' || form.kind === 'meeting';

    return (
        <form
            onSubmit={async (event) => {
                event.preventDefault();
                setBusy(true);
                const durationSec = form.durationMin ? Math.max(0, Math.round(Number(form.durationMin) * 60)) : null;
                await upsert({
                    activityId: activity?.activityId ?? null,
                    projectId,
                    taskId: form.taskId,
                    kind: form.kind,
                    channel: channelRelevant ? form.channel : null,
                    title: form.title,
                    notes: form.notes || null,
                    occurredAt: new Date(form.occurredAt).toISOString(),
                    durationSec,
                });
                setBusy(false);
                onSaved();
            }}
            className="mt-3"
        >
            <GlassCard className="px-4 py-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <Field label={{ de: 'Art', en: 'Kind' }[locale]}>
                        <Select value={form.kind} onValueChange={(value) => setForm({ ...form, kind: value as typeof form.kind })}>
                            <SelectTrigger className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {ACTIVITY_KIND_ORDER.filter((k) => k !== 'work').map((k) => (
                                    <SelectItem key={k} value={k}>
                                        {ACTIVITY_KIND_LABELS[k][locale]}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>
                    {channelRelevant ? (
                        <Field label={{ de: 'Kanal', en: 'Channel' }[locale]}>
                            <Select
                                value={form.channel ?? ''}
                                onValueChange={(value) =>
                                    setForm({ ...form, channel: (value || null) as GqlCProjectActivityChannel | null })
                                }
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder={{ de: 'Bitte wählen', en: 'Pick one' }[locale]} />
                                </SelectTrigger>
                                <SelectContent>
                                    {ACTIVITY_CHANNEL_ORDER.map((c) => (
                                        <SelectItem key={c} value={c}>
                                            {ACTIVITY_CHANNEL_LABELS[c][locale]}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </Field>
                    ) : (
                        <div />
                    )}
                    <Field label={{ de: 'Titel', en: 'Title' }[locale]} fullWidth>
                        <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                    </Field>
                    <Field label={{ de: 'Wann', en: 'When' }[locale]}>
                        <Input
                            type="datetime-local"
                            value={form.occurredAt}
                            onChange={(e) => setForm({ ...form, occurredAt: e.target.value })}
                            required
                        />
                    </Field>
                    <Field label={{ de: 'Dauer (Minuten)', en: 'Duration (min)' }[locale]}>
                        <Input
                            type="number"
                            min="0"
                            value={form.durationMin}
                            onChange={(e) => setForm({ ...form, durationMin: e.target.value })}
                            placeholder={{ de: 'optional', en: 'optional' }[locale]}
                        />
                    </Field>
                    {tasks.length > 0 ? (
                        <Field label={{ de: 'Aufgabe', en: 'Task' }[locale]} fullWidth>
                            <Select value={form.taskId ?? ''} onValueChange={(value) => setForm({ ...form, taskId: value || null })}>
                                <SelectTrigger className="w-full">
                                    <SelectValue
                                        placeholder={{ de: 'Optional: an Aufgabe binden', en: 'Optional: attach to task' }[locale]}
                                    />
                                </SelectTrigger>
                                <SelectContent>
                                    {tasks.map((t) => (
                                        <SelectItem key={t.taskId} value={t.taskId}>
                                            {t.title}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </Field>
                    ) : null}
                    <Field label={{ de: 'Notizen', en: 'Notes' }[locale]} fullWidth>
                        <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
                    </Field>
                </div>
                <div className="mt-3 flex justify-end gap-2">
                    <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={busy}>
                        {{ de: 'Abbrechen', en: 'Cancel' }[locale]}
                    </Button>
                    <Button type="submit" size="sm" disabled={busy || !form.title.trim()}>
                        {{ de: 'Speichern', en: 'Save' }[locale]}
                    </Button>
                </div>
            </GlassCard>
        </form>
    );
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

function TaskList({
    tasks,
    projectId,
    locale,
    onChanged,
}: {
    tasks: ReadonlyArray<TaskRow>;
    projectId: string | null;
    locale: Locale;
    onChanged: () => void;
}) {
    const [adding, setAdding] = useState(false);
    const grouped = TASK_STATUS_ORDER.map((status) => ({
        status,
        rows: tasks.filter((t) => t.status === status),
    }));

    return (
        <div className="mt-3 border-t border-border/40 pt-3">
            <div className="flex flex-col gap-3">
                {grouped.map((group) =>
                    group.rows.length === 0 ? null : (
                        <div key={group.status}>
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                {TASK_STATUS_LABELS[group.status][locale]}
                            </p>
                            <ul className="mt-1 flex flex-col gap-1">
                                {group.rows.map((task) => (
                                    <TaskItem key={task.taskId} task={task} locale={locale} onChanged={onChanged} />
                                ))}
                            </ul>
                        </div>
                    ),
                )}
            </div>
            {adding ? (
                <TaskForm
                    task={null}
                    projectId={projectId}
                    locale={locale}
                    nextPosition={tasks.filter((t) => t.status === 'todo').length}
                    onClose={() => setAdding(false)}
                    onSaved={() => {
                        setAdding(false);
                        onChanged();
                    }}
                />
            ) : (
                <Button variant="ghost" size="sm" onClick={() => setAdding(true)} className="mt-2 -ml-2 text-xs">
                    <PlusIcon />
                    {{ de: 'Aufgabe hinzufügen', en: 'Add task' }[locale]}
                </Button>
            )}
        </div>
    );
}

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
        <li className="group flex items-center gap-2 rounded-md px-1 py-1 hover:bg-background/40">
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
