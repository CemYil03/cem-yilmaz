import { createFileRoute, Link } from '@tanstack/react-router';
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
    PlusIcon,
    SquareIcon,
    Trash2Icon,
} from 'lucide-react';
import { useState } from 'react';
import { useMutation, useQuery } from 'urql';
import { Button } from '../../../web/components/base/button';
import { DatePicker } from '../../../web/components/base/date-picker';
import { Input } from '../../../web/components/base/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../web/components/base/select';
import { Textarea } from '../../../web/components/base/textarea';
import { GlassCard } from '../../../web/components/GlassCard';
import type { GqlCProjectStatus, GqlCTaskStatus, GqlCWorkspaceProjectsPageQuery } from '../../../web/graphql/generated';
import {
    WorkspaceProjectDeleteDocument,
    WorkspaceProjectFromRequestDocument,
    WorkspaceProjectRequestArchiveDocument,
    WorkspaceProjectRequestDeleteDocument,
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
// project attached). Convert from inbox → project is one mutation that
// archives the request and creates a `planning` project linked back.
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
            <Link to="/{-$locale}/workspace" className="text-sm text-muted-foreground hover:text-foreground">
                {{ de: '← Workspace', en: '← Workspace' }[locale]}
            </Link>
            <div className="mt-6 flex items-center gap-3 text-primary">
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
                    {tab === 'projects' ? <ProjectsBoard rows={data.admin.projects} locale={locale} onChanged={onChanged} /> : null}
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
    const [, archive] = useMutation(WorkspaceProjectRequestArchiveDocument);
    const [, del] = useMutation(WorkspaceProjectRequestDeleteDocument);
    const [, convert] = useMutation(WorkspaceProjectFromRequestDocument);
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
                        <Button
                            size="sm"
                            onClick={async () => {
                                setBusy(true);
                                await convert({ projectRequestId: row.projectRequestId });
                                setBusy(false);
                                onChanged();
                            }}
                            disabled={busy}
                        >
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
        </GlassCard>
    );
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

function ProjectsBoard({ rows, locale, onChanged }: { rows: ReadonlyArray<ProjectRow>; locale: Locale; onChanged: () => void }) {
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

function ProjectCard({ row, locale, onEdit, onChanged }: { row: ProjectRow; locale: Locale; onEdit: () => void; onChanged: () => void }) {
    const [, del] = useMutation(WorkspaceProjectDeleteDocument);
    const [tasksOpen, setTasksOpen] = useState(false);

    const doneCount = row.tasks.filter((t) => t.status === 'done').length;
    const totalCount = row.tasks.length;

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
            <button
                type="button"
                onClick={() => setTasksOpen(!tasksOpen)}
                className="mt-2 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
                {tasksOpen
                    ? { de: 'Aufgaben ausblenden', en: 'Hide tasks' }[locale]
                    : { de: 'Aufgaben anzeigen', en: 'Show tasks' }[locale]}
            </button>
            {tasksOpen ? <TaskList tasks={row.tasks} projectId={row.projectId} locale={locale} onChanged={onChanged} /> : null}
        </GlassCard>
    );
}

function ProjectForm({
    row,
    locale,
    nextPosition,
    onClose,
    onSaved,
}: {
    row: ProjectRow | null;
    locale: Locale;
    nextPosition: number;
    onClose: () => void;
    onSaved: () => void;
}) {
    const [, upsert] = useMutation(WorkspaceProjectUpsertDocument);
    const [form, setForm] = useState({
        title: row?.title ?? '',
        description: row?.description ?? '',
        notes: row?.notes ?? '',
        status: row?.status ?? ('idea' as GqlCProjectStatus),
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
                    position: row?.position ?? nextPosition,
                    sourceRequestId: null,
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
