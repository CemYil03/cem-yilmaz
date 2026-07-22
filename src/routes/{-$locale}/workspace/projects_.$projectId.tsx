import { createFileRoute, Link, useRouter } from '@tanstack/react-router';
import { format, formatDistanceToNowStrict, parseISO } from 'date-fns';
import {
    ChevronDownIcon,
    CircleDotIcon,
    FileIcon,
    KanbanIcon,
    LayoutDashboardIcon,
    LinkIcon,
    ListIcon,
    ListTodoIcon,
    MailIcon,
    MoreHorizontalIcon,
    PencilIcon,
    PinIcon,
    PinOffIcon,
    PlayIcon,
    PlusIcon,
    SparklesIcon,
    SquareIcon,
    StickyNoteIcon,
    StopCircleIcon,
    TimerIcon,
    Trash2Icon,
    UploadIcon,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createRequest, useClient, useMutation } from 'urql';
import { pipe, subscribe } from 'wonka';
import { z } from 'zod';
import { formatDate } from '../../../shared';
import { uploadFile } from '../../../web/chat/fileUpload';
import { previewKindFor } from '../../../web/chat/chatAttachmentPreview';
import { AssistantMarkdown } from '../../../web/components/AssistantMarkdown';
import { ChatAttachmentPreviewDialog } from '../../../web/components/chat-message/ChatAttachmentPreviewDialog';
import { GlassCard } from '../../../web/components/GlassCard';
import { Reveal } from '../../../web/components/Reveal';
import { WorkspaceUnauthorized } from '../../../web/components/WorkspaceUnauthorized';
import {
    ACTIVITY_KIND_ICONS,
    ACTIVITY_KIND_LABELS,
    activityHeading,
    formatDuration,
} from '../../../web/components/WorkspaceProjectActivityConstants';
import { WorkspaceProjectActivityTimeline } from '../../../web/components/WorkspaceProjectActivityTimeline';
import { Button } from '../../../web/components/base/button';
import { DatePicker } from '../../../web/components/base/date-picker';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '../../../web/components/base/dropdown-menu';
import { Input } from '../../../web/components/base/input';
import { Checkbox } from '../../../web/components/base/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../web/components/base/select';
import { Textarea } from '../../../web/components/base/textarea';
import type {
    GqlCAdminProjectFileKind,
    GqlCAdminProjectLinkKind,
    GqlCAdminProjectStatus,
    GqlCAdminProjectTaskEffort,
    GqlCAdminProjectTaskStatus,
    GqlCAdminProjectTaskWhenBucket,
    GqlCWorkspaceProjectDetailUpdatesSubscription,
    GqlCWorkspaceProjectDetailUserFragment,
} from '../../../web/graphql/generated';
import {
    WorkspaceProjectDetailDeleteProjectDocument,
    WorkspaceProjectDetailDeleteTaskDocument,
    WorkspaceProjectDetailDocument,
    WorkspaceProjectDetailTimerStartDocument,
    WorkspaceProjectDetailTimerStopDocument,
    WorkspaceProjectDetailUpdatesDocument,
    WorkspaceProjectDetailUpsertProjectDocument,
    WorkspaceProjectDetailUpsertTaskDocument,
    WorkspaceProjectFileDeleteDocument,
    WorkspaceProjectFileUpsertDocument,
    WorkspaceProjectLinkDeleteDocument,
    WorkspaceProjectLinkUpsertDocument,
} from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import { useLocale } from '../../../web/hooks/useLocale';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { cn } from '../../../web/utils/cn';
import { DATE_FNS_LOCALE } from '../../../web/utils/dateFnsLocale';
import type { Locale } from '../../../web/utils/locale';
import { localeFromParam } from '../../../web/utils/locale';

// Workspace project detail — one project per URL with its tasks, activity
// feed, pinned-resource rail, and Links / Files surfaces. Reachable from
// the kanban card on `/workspace/projects`. Single-language, admin-only,
// noindex. See `docs/features/projects-workspace.md`.

type WorkspaceProjectDetailAdmin = NonNullable<GqlCWorkspaceProjectDetailUserFragment['admin']>;
type ProjectRow = WorkspaceProjectDetailAdmin['adminProjectFindOne'];
type TaskRow = ProjectRow['tasks'][number];
type ActivityRow = ProjectRow['activities'][number];
type LinkRow = ProjectRow['links'][number];
type FileRow = ProjectRow['files'][number];
type ActiveTimer = WorkspaceProjectDetailAdmin['adminProjectActiveTimerFindOne'];

type DetailTab = 'overview' | 'tasks' | 'activity' | 'notes' | 'links' | 'files';
const TABS = ['overview', 'tasks', 'activity', 'notes', 'links', 'files'] as const satisfies ReadonlyArray<DetailTab>;
const TAB_LABELS: Record<DetailTab, { de: string; en: string }> = {
    overview: { de: 'Übersicht', en: 'Overview' },
    tasks: { de: 'Aufgaben', en: 'Tasks' },
    activity: { de: 'Verlauf', en: 'Activity' },
    notes: { de: 'Notizen', en: 'Notes' },
    links: { de: 'Links', en: 'Links' },
    files: { de: 'Dateien', en: 'Files' },
};
const TAB_ICONS: Record<DetailTab, LucideIcon> = {
    overview: LayoutDashboardIcon,
    tasks: ListTodoIcon,
    activity: TimerIcon,
    notes: StickyNoteIcon,
    links: LinkIcon,
    files: FileIcon,
};

const PROJECT_STATUS_ORDER: ReadonlyArray<GqlCAdminProjectStatus> = ['idea', 'planning', 'active', 'paused', 'done', 'archived'];
const PROJECT_STATUS_LABELS: Record<GqlCAdminProjectStatus, { de: string; en: string }> = {
    idea: { de: 'Idee', en: 'Idea' },
    planning: { de: 'In Planung', en: 'Planning' },
    active: { de: 'Aktiv', en: 'Active' },
    paused: { de: 'Pausiert', en: 'Paused' },
    done: { de: 'Fertig', en: 'Done' },
    archived: { de: 'Archiviert', en: 'Archived' },
};

// Color-coded chip tint per project status. Each entry is a single class string
// covering background + foreground for both themes — the status pill applies it
// directly so the surface reads as a state, not just a label.
const PROJECT_STATUS_TINTS: Record<GqlCAdminProjectStatus, string> = {
    idea: 'bg-muted text-muted-foreground',
    planning: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
    active: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
    paused: 'bg-secondary text-secondary-foreground',
    done: 'bg-primary/15 text-primary',
    archived: 'bg-muted/60 text-muted-foreground/70',
};

const TASK_STATUS_ORDER: ReadonlyArray<GqlCAdminProjectTaskStatus> = ['backlog', 'blocked', 'todo', 'doing', 'done'];
const TASK_STATUS_LABELS: Record<GqlCAdminProjectTaskStatus, { de: string; en: string }> = {
    backlog: { de: 'Backlog', en: 'Backlog' },
    todo: { de: 'Offen', en: 'To do' },
    doing: { de: 'Aktiv', en: 'Doing' },
    blocked: { de: 'Blockiert', en: 'Blocked' },
    done: { de: 'Erledigt', en: 'Done' },
};

// Column tint per task status — background + foreground in one class string,
// mirroring PROJECT_STATUS_TINTS. Drives the kanban column header chip and the
// list-group heading dot so a status reads as a state at a glance.
const TASK_STATUS_TINTS: Record<GqlCAdminProjectTaskStatus, string> = {
    backlog: 'bg-muted text-muted-foreground',
    todo: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
    doing: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
    blocked: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
    done: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
};

// Small status dot color used alongside a column/group label.
const TASK_STATUS_DOTS: Record<GqlCAdminProjectTaskStatus, string> = {
    backlog: 'bg-muted-foreground/50',
    todo: 'bg-sky-500',
    doing: 'bg-amber-500',
    blocked: 'bg-rose-500',
    done: 'bg-emerald-500',
};

// AdminProjectTask effort / when-bucket labels — kept in sync with the standalone
// todos surface so the visual language is identical on both pages.
// See `docs/features/todos-experience.md`.
const TASK_EFFORT_LABELS: Record<GqlCAdminProjectTaskEffort, { de: string; en: string }> = {
    quick: { de: 'schnell', en: 'quick' },
    focused: { de: 'fokussiert', en: 'focused' },
    deep: { de: 'tief', en: 'deep' },
};
const TASK_EFFORT_BAR: Record<GqlCAdminProjectTaskEffort, string> = {
    quick: 'bg-emerald-400',
    focused: 'bg-amber-400',
    deep: 'bg-violet-400',
};
const TASK_WHEN_LABELS: Record<GqlCAdminProjectTaskWhenBucket, { de: string; en: string }> = {
    today: { de: 'heute', en: 'today' },
    week: { de: 'diese Woche', en: 'this week' },
    someday: { de: 'irgendwann', en: 'someday' },
    waiting: { de: 'blockiert', en: 'blocked' },
};

const LINK_KIND_ORDER: ReadonlyArray<GqlCAdminProjectLinkKind> = [
    'github',
    'malt',
    'figma',
    'gdrive',
    'notion',
    'invoice',
    'offer',
    'other',
];
const LINK_KIND_LABELS: Record<GqlCAdminProjectLinkKind, { de: string; en: string }> = {
    github: { de: 'GitHub', en: 'GitHub' },
    malt: { de: 'Malt', en: 'Malt' },
    figma: { de: 'Figma', en: 'Figma' },
    gdrive: { de: 'Google Drive', en: 'Google Drive' },
    notion: { de: 'Notion', en: 'Notion' },
    invoice: { de: 'Rechnung', en: 'Invoice' },
    offer: { de: 'Angebot', en: 'Offer' },
    other: { de: 'Sonstiges', en: 'Other' },
};

const FILE_KIND_ORDER: ReadonlyArray<GqlCAdminProjectFileKind> = ['offer', 'invoice', 'contract', 'screenshot', 'other'];
const FILE_KIND_LABELS: Record<GqlCAdminProjectFileKind, { de: string; en: string }> = {
    offer: { de: 'Angebot', en: 'Offer' },
    invoice: { de: 'Rechnung', en: 'Invoice' },
    contract: { de: 'Vertrag', en: 'Contract' },
    screenshot: { de: 'Screenshot', en: 'Screenshot' },
    other: { de: 'Sonstiges', en: 'Other' },
};

function formatHms(totalSec: number): string {
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// "today" / "vor 3 Tagen" / "Mar 14" — relative when fresh enough to feel
// recent, absolute once the user would rather just see the date. Used in the
// rail's metadata list so timestamps don't shout `2026-06-12T09:14:00Z` at
// the user.
function formatRelative(iso: string, locale: Locale): string {
    const parsed = parseISO(iso);
    const daysAgo = (Date.now() - parsed.getTime()) / 86_400_000;
    if (daysAgo < 7) {
        return formatDistanceToNowStrict(parsed, { addSuffix: true, locale: DATE_FNS_LOCALE[locale] });
    }
    return formatDate(iso, { locale });
}

function formatAbsolute(iso: string, locale: Locale): string {
    return formatDate(iso, { locale });
}

// URL state — `tab` selects the section, `focus` lights up a child row,
// `taskView` picks the Tasks-tab layout (list is the default → key dropped).
const detailSearchSchema = z.object({
    tab: z.enum(TABS).optional(),
    focus: z.string().optional(),
    taskView: z.enum(['kanban', 'list']).optional(),
});

type TaskView = 'kanban' | 'list';

export const Route = createFileRoute('/{-$locale}/workspace/projects_/$projectId')({
    validateSearch: detailSearchSchema,
    loader: ({ params }) => routeLoaderGraphqlClient(WorkspaceProjectDetailDocument, { projectId: params.projectId })(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: { de: 'Projekt', en: 'AdminProject' }[locale],
            description: { de: 'Projekt-Detail', en: 'AdminProject detail' }[locale],
            path: `/workspace/projects/${params.projectId}`,
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component: WorkspaceProjectDetail,
});

function WorkspaceProjectDetail() {
    const locale = useLocale();
    const data = Route.useLoaderData();
    const search = Route.useSearch();
    const navigate = Route.useNavigate();
    const { projectId } = Route.useParams();
    const tab: DetailTab = search.tab ?? 'overview';
    const taskView: TaskView = search.taskView ?? 'list';

    // Server-authoritative state: seed once from the route loader, then let
    // the `userUpdates` subscription replace it on every server push. Every
    // mutation on this page already calls `serverRuntime.publish.userUpdates`
    // server-side, so we never need to re-fetch from the client.
    // See `docs/architecture/state-synchronization.md` — Seed-and-Subscribe.
    const user = useWorkspaceProjectDetailLiveUser(projectId, data.sessionFindOne.user);
    const admin = user?.admin;
    const project = admin?.adminProjectFindOne ?? null;
    const activeTimer = admin?.adminProjectActiveTimerFindOne ?? null;

    // Deep-link focus on a child row, same mechanism as the board page.
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

    const pinnedLinks = useMemo(() => project?.links.filter((l) => l.pinned) ?? [], [project?.links]);
    const pinnedFiles = useMemo(() => project?.files.filter((f) => f.pinned) ?? [], [project?.files]);

    if (!admin) {
        return <WorkspaceUnauthorized locale={locale} />;
    }
    if (!project) {
        return (
            <main className="flex-1 px-6 md:px-10 lg:px-16 max-w-4xl mx-auto w-full pb-20 pt-16">
                <p className="text-sm text-muted-foreground">{{ de: 'Projekt nicht gefunden.', en: 'AdminProject not found.' }[locale]}</p>
            </main>
        );
    }

    return (
        <main
            className={cn(
                'mx-auto w-full max-w-8xl px-4 leading-relaxed md:px-8 lg:px-12',
                // The Activity tab is a fixed-height chat pane that fills the
                // viewport, so it drops the bottom padding (the pane's own
                // `100dvh-…` calc reserves the space) and only keeps a small
                // top gap. Every other tab keeps the normal page rhythm.
                tab === 'activity' ? 'pt-4 pb-0 md:pt-6 lg:pt-6' : 'py-8 md:py-10 lg:py-12',
            )}
        >
            {/* Tab strip at the very top — the page's primary switcher. Title,
             * status, description, and the timer/metadata rail all live inside
             * the Overview tab now, so the section nav is the first thing the
             * user meets. Canonical underlined-tab pattern (see
             * `docs/conventions.md` — "Top-of-page sub-view switcher"). */}
            <nav
                className="flex gap-1 overflow-x-auto overflow-y-hidden border-b border-border/60 no-scrollbar scroll-fade-x"
                aria-label={{ de: 'Bereiche', en: 'Sections' }[locale]}
            >
                {TABS.map((t) => {
                    const Icon = TAB_ICONS[t];
                    const isActive = tab === t;
                    return (
                        <Link
                            key={t}
                            to="/{-$locale}/workspace/projects/$projectId"
                            params={{ projectId: project.projectId }}
                            search={(): { tab?: DetailTab } => (t === 'overview' ? {} : { tab: t })}
                            replace
                            className={cn(
                                '-mb-px flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors',
                                isActive
                                    ? 'border-primary text-foreground'
                                    : 'border-transparent text-muted-foreground hover:text-foreground',
                            )}
                            aria-current={isActive ? 'page' : undefined}
                        >
                            <Icon className="size-4" />
                            {TAB_LABELS[t][locale]}
                        </Link>
                    );
                })}
            </nav>

            <div className={cn(tab === 'activity' ? 'mt-4' : 'mt-6')}>
                {tab === 'overview' ? (
                    <OverviewSection
                        project={project}
                        activeTimer={activeTimer}
                        pinnedLinks={pinnedLinks}
                        pinnedFiles={pinnedFiles}
                        locale={locale}
                    />
                ) : null}
                {tab === 'tasks' ? (
                    <TasksSection tasks={project.tasks} projectId={project.projectId} taskView={taskView} locale={locale} />
                ) : null}
                {tab === 'activity' ? (
                    <WorkspaceProjectActivityTimeline
                        activities={project.activities}
                        tasks={project.tasks}
                        projectId={project.projectId}
                        locale={locale}
                    />
                ) : null}
                {tab === 'notes' ? <NotesSection project={project} locale={locale} /> : null}
                {tab === 'links' ? <LinksSection links={project.links} projectId={project.projectId} locale={locale} /> : null}
                {tab === 'files' ? <FilesSection files={project.files} projectId={project.projectId} locale={locale} /> : null}
            </div>
        </main>
    );
}

// Seed-and-Subscribe: the route loader provides the initial `user`, then the
// `userUpdates` subscription replaces it with the same fragment shape on every
// server push. Imperative URQL — not `useSubscription` — for the same reason
// `useChatLiveUpdates.tsx` does: URQL's declarative hook can deliver each event
// more than once under concurrent React. See `docs/architecture/state-synchronization.md`.
function useWorkspaceProjectDetailLiveUser(
    projectId: string,
    seed: GqlCWorkspaceProjectDetailUserFragment | null | undefined,
): GqlCWorkspaceProjectDetailUserFragment | null | undefined {
    const [user, setUser] = useState(seed);

    // Adopt the fresh seed when navigating between sibling projects — the
    // route loader runs again, but the component instance may survive.
    const lastProjectIdRef = useRef(projectId);
    if (lastProjectIdRef.current !== projectId) {
        lastProjectIdRef.current = projectId;
        queueMicrotask(() => setUser(seed));
    }

    const client = useClient();
    useEffect(() => {
        const request = createRequest(WorkspaceProjectDetailUpdatesDocument, { projectId });
        const operation = client.executeSubscription<GqlCWorkspaceProjectDetailUpdatesSubscription>(request);
        const { unsubscribe } = pipe(
            operation,
            subscribe((result) => {
                if (result.data) setUser(result.data.userUpdates);
            }),
        );
        return unsubscribe;
    }, [client, projectId]);

    return user;
}

// ---------- Title block & rail ----------------------------------------------

function ProjectTitleBlock({ project, locale }: { project: ProjectRow; locale: Locale }) {
    return (
        <header>
            <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">{project.title}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
                <ProjectStatusPill project={project} locale={locale} />
                {project.sourceRequest ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/40 px-2.5 py-1 text-xs text-muted-foreground">
                        <MailIcon className="size-3" />
                        {{ de: 'Anfrage von', en: 'Request from' }[locale]} {project.sourceRequest.name}
                        {project.sourceRequest.company ? ` · ${project.sourceRequest.company}` : ''}
                    </span>
                ) : null}
            </div>
        </header>
    );
}

function ProjectStatusPill({ project, locale }: { project: ProjectRow; locale: Locale }) {
    const [, upsert] = useMutation(WorkspaceProjectDetailUpsertProjectDocument);
    const tint = PROJECT_STATUS_TINTS[project.status];
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    className={cn(
                        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                        tint,
                    )}
                    aria-label={{ de: 'Status ändern', en: 'Change status' }[locale]}
                >
                    <span
                        aria-hidden
                        className={cn(
                            'size-1.5 rounded-full',
                            project.status === 'active'
                                ? 'bg-emerald-600 dark:bg-emerald-400'
                                : project.status === 'planning'
                                  ? 'bg-amber-600 dark:bg-amber-400'
                                  : project.status === 'done'
                                    ? 'bg-primary'
                                    : 'bg-current opacity-60',
                        )}
                    />
                    {PROJECT_STATUS_LABELS[project.status][locale]}
                    <ChevronDownIcon className="size-3 opacity-60" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
                {PROJECT_STATUS_ORDER.map((s) => (
                    <DropdownMenuItem
                        key={s}
                        onSelect={async () => {
                            if (s === project.status) return;
                            await upsert({
                                projectId: project.projectId,
                                title: project.title,
                                description: project.description,
                                notes: project.notes,
                                status: s,
                                position: project.position,
                                startedAt: project.startedAt,
                                completedAt: project.completedAt,
                            });
                        }}
                    >
                        {PROJECT_STATUS_LABELS[s][locale]}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

function ProjectRail({ project, activeTimer, locale }: { project: ProjectRow; activeTimer: ActiveTimer; locale: Locale }) {
    const router = useRouter();
    const [, del] = useMutation(WorkspaceProjectDetailDeleteProjectDocument);

    const tasksDone = project.tasks.filter((t) => t.status === 'done').length;
    const tasksTotal = project.tasks.length;
    const taskPct = tasksTotal === 0 ? 0 : Math.round((tasksDone / tasksTotal) * 100);
    const isOwnTimerRunning = activeTimer?.projectId === project.projectId;

    return (
        <GlassCard className="p-5">
            <RailTimerButton projectId={project.projectId} activeTimer={activeTimer} locale={locale} />

            <div className="mt-3 flex justify-end">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button size="icon-sm" variant="ghost" aria-label={{ de: 'Mehr Aktionen', en: 'More actions' }[locale]}>
                            <MoreHorizontalIcon />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem
                            onSelect={() => {
                                // The description edit affordance lives in-place; this menu item
                                // just deep-links to the Notes tab where free-form editing happens.
                                void router.navigate({
                                    to: '/{-$locale}/workspace/projects/$projectId',
                                    params: { projectId: project.projectId },
                                    search: { tab: 'notes' },
                                    replace: true,
                                });
                            }}
                        >
                            <PencilIcon />
                            {{ de: 'Notizen bearbeiten', en: 'Edit notes' }[locale]}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            variant="destructive"
                            onSelect={async () => {
                                if (!confirm({ de: 'Projekt wirklich löschen?', en: 'Delete this project?' }[locale])) return;
                                await del({ projectId: project.projectId });
                                void router.navigate({ to: '/{-$locale}/workspace/projects' });
                            }}
                        >
                            <Trash2Icon />
                            {{ de: 'Projekt löschen', en: 'Delete project' }[locale]}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <dl className="mt-4 grid gap-3 border-t border-border/40 pt-4 text-xs">
                <RailRow
                    label={{ de: 'Erstellt', en: 'Created' }[locale]}
                    value={formatAbsolute(project.createdAt as unknown as string, locale)}
                />
                <RailRow
                    label={{ de: 'Aktualisiert', en: 'Updated' }[locale]}
                    value={formatRelative(project.updatedAt as unknown as string, locale)}
                />
                {project.startedAt ? (
                    <RailRow
                        label={{ de: 'Gestartet', en: 'Started' }[locale]}
                        value={formatAbsolute(project.startedAt as unknown as string, locale)}
                    />
                ) : null}
                {project.completedAt ? (
                    <RailRow
                        label={{ de: 'Abgeschlossen', en: 'Completed' }[locale]}
                        value={formatAbsolute(project.completedAt as unknown as string, locale)}
                    />
                ) : null}
                <RailRow
                    label={{ de: 'Arbeitszeit', en: 'Work time' }[locale]}
                    value={<TotalWorkLabel totalWorkSec={project.totalWorkSec} activeTimer={isOwnTimerRunning ? activeTimer : null} />}
                />
                <div>
                    <div className="flex items-baseline justify-between gap-2">
                        <dt className="text-muted-foreground">{{ de: 'Aufgaben', en: 'Tasks' }[locale]}</dt>
                        <dd className="font-medium text-foreground">
                            {tasksDone} / {tasksTotal}
                        </dd>
                    </div>
                    {tasksTotal > 0 ? (
                        <div
                            className="mt-1.5 h-1 overflow-hidden rounded-full bg-border/60"
                            role="progressbar"
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={taskPct}
                        >
                            <div className="h-full bg-primary transition-[width] duration-500 ease-out" style={{ width: `${taskPct}%` }} />
                        </div>
                    ) : null}
                </div>
                <RailRow label={{ de: 'Aktivitäten', en: 'Activities' }[locale]} value={String(project.activities.length)} />
            </dl>

            {project.sourceRequest ? <RailSourceRequest sourceRequest={project.sourceRequest} locale={locale} /> : null}
        </GlassCard>
    );
}

function RailRow({ label, value }: { label: string; value: ReactNode }) {
    return (
        <div className="flex items-baseline justify-between gap-2">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="text-right font-medium text-foreground">{value}</dd>
        </div>
    );
}

function RailSourceRequest({ sourceRequest, locale }: { sourceRequest: NonNullable<ProjectRow['sourceRequest']>; locale: Locale }) {
    return (
        <section className="mt-4 border-t border-border/40 pt-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {{ de: 'Anfrage', en: 'Source request' }[locale]}
            </h3>
            <dl className="mt-2 grid gap-2 text-xs">
                <RailRow label={{ de: 'Name', en: 'Name' }[locale]} value={sourceRequest.name} />
                <RailRow
                    label={{ de: 'E-Mail', en: 'Email' }[locale]}
                    value={
                        <a href={`mailto:${sourceRequest.email}`} className="hover:underline">
                            {sourceRequest.email}
                        </a>
                    }
                />
                {sourceRequest.company ? <RailRow label={{ de: 'Firma', en: 'Company' }[locale]} value={sourceRequest.company} /> : null}
                <RailRow label={{ de: 'Typ', en: 'Type' }[locale]} value={sourceRequest.projectType} />
                {sourceRequest.budget ? <RailRow label={{ de: 'Budget', en: 'Budget' }[locale]} value={sourceRequest.budget} /> : null}
                {sourceRequest.timeline ? (
                    <RailRow label={{ de: 'Zeitraum', en: 'Timeline' }[locale]} value={sourceRequest.timeline} />
                ) : null}
            </dl>
        </section>
    );
}

function RailTimerButton({ projectId, activeTimer, locale }: { projectId: string; activeTimer: ActiveTimer; locale: Locale }) {
    const [, start] = useMutation(WorkspaceProjectDetailTimerStartDocument);
    const [, stop] = useMutation(WorkspaceProjectDetailTimerStopDocument);
    const [busy, setBusy] = useState(false);
    const isOwn = activeTimer?.projectId === projectId;

    if (isOwn && activeTimer.startedAt) {
        return (
            <RailLiveTimer
                startedAt={activeTimer.startedAt as unknown as string}
                onStop={async () => {
                    if (busy) return;
                    setBusy(true);
                    await stop({ activityId: activeTimer.activityId });
                    setBusy(false);
                }}
                locale={locale}
            />
        );
    }

    return (
        <Button
            className="w-full"
            disabled={busy}
            onClick={async () => {
                setBusy(true);
                await start({ projectId, taskId: null, title: null });
                setBusy(false);
            }}
        >
            <PlayIcon />
            {activeTimer ? { de: 'Hier weiterarbeiten', en: 'Switch here' }[locale] : { de: 'Arbeit starten', en: 'Start work' }[locale]}
        </Button>
    );
}

function RailLiveTimer({ startedAt, onStop, locale }: { startedAt: string; onStop: () => void; locale: Locale }) {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, []);
    const elapsed = Math.max(0, Math.floor((now - parseISO(startedAt).getTime()) / 1000));
    return (
        <Button
            variant="secondary"
            className="w-full justify-center gap-2 bg-primary/15 text-primary hover:bg-primary/25"
            onClick={onStop}
            aria-label={{ de: 'Timer stoppen', en: 'Stop timer' }[locale]}
        >
            <StopCircleIcon />
            <span className="font-mono text-sm tabular-nums">{formatHms(elapsed)}</span>
            <span className="text-xs opacity-80">·</span>
            <span className="text-xs">{{ de: 'Stopp', en: 'Stop' }[locale]}</span>
        </Button>
    );
}

// ---------- Description -----------------------------------------------------

function ProjectDescription({ project, locale }: { project: ProjectRow; locale: Locale }) {
    const [editing, setEditing] = useState(false);
    if (editing) {
        return (
            <ProjectEditForm
                project={project}
                locale={locale}
                onClose={() => setEditing(false)}
                onSaved={() => {
                    setEditing(false);
                }}
            />
        );
    }
    if (!project.description) {
        return (
            <div className="flex items-center justify-between gap-2 rounded-md border border-dashed border-border/60 px-4 py-3 text-xs text-muted-foreground">
                <span>{{ de: 'Keine Beschreibung.', en: 'No description yet.' }[locale]}</span>
                <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
                    <PencilIcon />
                    {{ de: 'Hinzufügen', en: 'Add one' }[locale]}
                </Button>
            </div>
        );
    }
    return (
        <div className="group relative">
            <AssistantMarkdown text={project.description} />
            <Button
                size="icon-sm"
                variant="ghost"
                className="absolute right-0 top-0 opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
                aria-label={{ de: 'Beschreibung bearbeiten', en: 'Edit description' }[locale]}
                onClick={() => setEditing(true)}
            >
                <PencilIcon />
            </Button>
        </div>
    );
}

// ---------- Empty-state shared helper --------------------------------------

function EmptyState({ icon: Icon, line, cta, onAction }: { icon: LucideIcon; line: string; cta: string; onAction: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-border/50 px-6 py-10 text-center">
            <Icon className="size-8 text-muted-foreground/40" aria-hidden />
            <p className="max-w-sm text-sm text-muted-foreground">{line}</p>
            <Button size="sm" onClick={onAction}>
                <PlusIcon />
                {cta}
            </Button>
        </div>
    );
}

// ---------- Overview tab ---------------------------------------------------

function OverviewSection({
    project,
    activeTimer,
    pinnedLinks,
    pinnedFiles,
    locale,
}: {
    project: ProjectRow;
    activeTimer: ActiveTimer;
    pinnedLinks: ReadonlyArray<LinkRow>;
    pinnedFiles: ReadonlyArray<FileRow>;
    locale: Locale;
}) {
    // Top 3 open tasks — todo first, then doing, dueAt-nulls-last so the rows the user
    // is most likely to act on bubble up. Mirrors the "next concrete step" framing of
    // the Overview tab as a glance, not a chase.
    const upNext = useMemo(() => {
        const open = project.tasks.filter((t) => t.status !== 'done');
        return [...open]
            .sort((a, b) => {
                const aOrder = a.status === 'todo' ? 0 : 1;
                const bOrder = b.status === 'todo' ? 0 : 1;
                if (aOrder !== bOrder) return aOrder - bOrder;
                const aDue = a.dueAt ? parseISO(a.dueAt as unknown as string).getTime() : Number.POSITIVE_INFINITY;
                const bDue = b.dueAt ? parseISO(b.dueAt as unknown as string).getTime() : Number.POSITIVE_INFINITY;
                return aDue - bDue;
            })
            .slice(0, 3);
    }, [project.tasks]);

    const recentActivity = useMemo(() => project.activities.slice(0, 5), [project.activities]);

    const glanceEmpty =
        upNext.length === 0 && recentActivity.length === 0 && pinnedLinks.length === 0 && pinnedFiles.length === 0 && !project.notes;

    // The glance column — "what's the state of this project" at a look. When
    // nothing has been captured yet it's a single welcoming card; otherwise
    // it's the up-next / recent / pinned / notes stack.
    const glance = glanceEmpty ? (
        <div className="rounded-md border border-dashed border-border/50 px-6 py-12 text-center">
            <SparklesIcon className="mx-auto size-8 text-muted-foreground/40" aria-hidden />
            <p className="mx-auto mt-3 max-w-sm text-sm text-muted-foreground">
                {
                    {
                        de: 'Noch nichts zu zeigen. Leg eine erste Aufgabe an oder halte fest, was als nächstes ansteht.',
                        en: "Nothing to show yet. Add a first task or jot down what's next.",
                    }[locale]
                }
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Button asChild size="sm">
                    <Link
                        to="/{-$locale}/workspace/projects/$projectId"
                        params={{ projectId: project.projectId }}
                        search={{ tab: 'tasks' }}
                        replace
                    >
                        <PlusIcon />
                        {{ de: 'Aufgabe anlegen', en: 'Add a task' }[locale]}
                    </Link>
                </Button>
                <Button asChild size="sm" variant="ghost">
                    <Link
                        to="/{-$locale}/workspace/projects/$projectId"
                        params={{ projectId: project.projectId }}
                        search={{ tab: 'activity' }}
                        replace
                    >
                        {{ de: 'Verlauf öffnen', en: 'Open activity' }[locale]}
                    </Link>
                </Button>
            </div>
        </div>
    ) : (
        <div className="flex flex-col gap-6">
            {upNext.length > 0 ? (
                <Reveal as="section">
                    <OverviewSectionHeader
                        title={{ de: 'Als nächstes', en: 'Up next' }[locale]}
                        action={{
                            label: { de: 'Alle Aufgaben', en: 'All tasks' }[locale],
                            tab: 'tasks',
                            projectId: project.projectId,
                        }}
                    />
                    <ul className="mt-3 flex flex-col gap-2">
                        {upNext.map((task) => (
                            <li key={task.taskId}>
                                <OverviewUpNextRow task={task} projectId={project.projectId} locale={locale} />
                            </li>
                        ))}
                    </ul>
                </Reveal>
            ) : null}

            {recentActivity.length > 0 ? (
                <Reveal as="section" index={1}>
                    <OverviewSectionHeader
                        title={{ de: 'Letzte Aktivität', en: 'Recent activity' }[locale]}
                        action={{
                            label: { de: 'Verlauf ansehen', en: 'View activity' }[locale],
                            tab: 'activity',
                            projectId: project.projectId,
                        }}
                    />
                    <ul className="mt-3 flex flex-col gap-2">
                        {recentActivity.map((activity) => (
                            <li key={activity.activityId} className="flex items-start gap-2 text-xs">
                                <OverviewActivityRow activity={activity} locale={locale} />
                            </li>
                        ))}
                    </ul>
                </Reveal>
            ) : null}

            {pinnedLinks.length > 0 || pinnedFiles.length > 0 ? (
                <Reveal as="section" index={2}>
                    <OverviewSectionHeader title={{ de: 'Angepinnt', en: 'Pinned' }[locale]} />
                    <div className="mt-3 flex flex-wrap gap-2">
                        {pinnedLinks.map((link) => (
                            <LinkChip key={link.projectLinkId} link={link} locale={locale} />
                        ))}
                        {pinnedFiles.map((file) => (
                            <FileChip key={file.projectFileId} file={file} locale={locale} />
                        ))}
                    </div>
                </Reveal>
            ) : null}

            {project.notes ? (
                <Reveal as="section" index={3}>
                    <OverviewSectionHeader
                        title={{ de: 'Notizen', en: 'Notes' }[locale]}
                        action={{
                            label: { de: 'Notizen öffnen', en: 'Open notes' }[locale],
                            tab: 'notes',
                            projectId: project.projectId,
                        }}
                    />
                    <div className="mt-3 line-clamp-4 text-sm text-muted-foreground">
                        <AssistantMarkdown text={project.notes.slice(0, 400)} />
                    </div>
                </Reveal>
            ) : null}
        </div>
    );

    // Overview is the project's cockpit: the identity chrome (title, status,
    // description) sits at the top, then the glance column and the timer /
    // metadata rail sit side-by-side on lg+ and stack on smaller widths. The
    // rail lives only here now — the page's other tabs are full-width.
    return (
        <div className="flex flex-col gap-6">
            <ProjectTitleBlock project={project} locale={locale} />
            <ProjectDescription project={project} locale={locale} />
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
                <div className="min-w-0">{glance}</div>
                <div className="lg:sticky lg:top-24">
                    <ProjectRail project={project} activeTimer={activeTimer} locale={locale} />
                </div>
            </div>
        </div>
    );
}

function OverviewSectionHeader({ title, action }: { title: string; action?: { label: string; tab: DetailTab; projectId: string } }) {
    return (
        <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
            {action ? (
                <Link
                    to="/{-$locale}/workspace/projects/$projectId"
                    params={{ projectId: action.projectId }}
                    search={action.tab === 'overview' ? {} : { tab: action.tab }}
                    replace
                    className="text-xs text-muted-foreground hover:text-foreground"
                >
                    {action.label} →
                </Link>
            ) : null}
        </div>
    );
}

function OverviewUpNextRow({ task, projectId, locale }: { task: TaskRow; projectId: string; locale: Locale }) {
    const [, upsert] = useMutation(WorkspaceProjectDetailUpsertTaskDocument);
    const StatusIcon = task.status === 'doing' ? CircleDotIcon : SquareIcon;
    return (
        <div className="flex items-start gap-2 rounded-md border border-border/40 bg-card/20 p-2 text-sm">
            <button
                type="button"
                aria-label={{ de: 'Status wechseln', en: 'Toggle status' }[locale]}
                className="mt-0.5 text-muted-foreground hover:text-foreground"
                onClick={async () => {
                    const next: GqlCAdminProjectTaskStatus = task.status === 'todo' ? 'doing' : 'done';
                    await upsert({
                        taskId: task.taskId,
                        projectId: task.projectId,
                        title: task.title,
                        notes: task.notes,
                        status: next,
                        position: task.position,
                        dueAt: task.dueAt,
                        completedAt: next === 'done' ? new Date().toISOString() : null,
                        effort: task.effort ?? null,
                        whenBucket: task.whenBucket ?? null,
                    });
                }}
            >
                <StatusIcon className="size-4" />
            </button>
            <Link
                to="/{-$locale}/workspace/projects/$projectId"
                params={{ projectId }}
                search={{ tab: 'tasks', focus: task.taskId }}
                replace
                className="min-w-0 flex-1 hover:underline"
            >
                <div className="truncate">{task.title}</div>
                {task.dueAt ? (
                    <div className="text-[11px] text-muted-foreground">
                        {{ de: 'Fällig', en: 'Due' }[locale]} {formatAbsolute(task.dueAt as unknown as string, locale)}
                    </div>
                ) : null}
            </Link>
        </div>
    );
}

function OverviewActivityRow({ activity, locale }: { activity: ActivityRow; locale: Locale }) {
    const Icon = ACTIVITY_KIND_ICONS[activity.kind];
    return (
        <div className="flex w-full items-start gap-2 rounded-md border border-border/30 bg-card/10 p-2">
            <Icon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
                <div className="truncate font-medium text-foreground">{activityHeading(activity, locale)}</div>
                <div className="text-[11px] text-muted-foreground">
                    {ACTIVITY_KIND_LABELS[activity.kind][locale]} · {formatRelative(activity.occurredAt as unknown as string, locale)}
                </div>
            </div>
        </div>
    );
}

function ProjectEditForm({
    project,
    locale,
    onClose,
    onSaved,
}: {
    project: ProjectRow;
    locale: Locale;
    onClose: () => void;
    onSaved: () => void;
}) {
    const [, upsert] = useMutation(WorkspaceProjectDetailUpsertProjectDocument);
    const [title, setTitle] = useState(project.title);
    const [description, setDescription] = useState(project.description ?? '');
    const [busy, setBusy] = useState(false);

    return (
        <form
            className="mt-4 grid gap-3 rounded-md border border-border/60 bg-card/40 p-4"
            onSubmit={async (e) => {
                e.preventDefault();
                if (busy) return;
                setBusy(true);
                await upsert({
                    projectId: project.projectId,
                    title: title.trim(),
                    description: description.trim() || null,
                    notes: project.notes,
                    status: project.status,
                    position: project.position,
                    startedAt: project.startedAt,
                    completedAt: project.completedAt,
                });
                setBusy(false);
                onSaved();
            }}
        >
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={{ de: 'Titel', en: 'Title' }[locale]} required />
            <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={{ de: 'Kurzbeschreibung', en: 'Short description' }[locale]}
                rows={2}
            />
            <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={onClose}>
                    {{ de: 'Abbrechen', en: 'Cancel' }[locale]}
                </Button>
                <Button type="submit" size="sm" disabled={busy}>
                    {{ de: 'Speichern', en: 'Save' }[locale]}
                </Button>
            </div>
        </form>
    );
}

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
    return <span>{formatDuration(totalWorkSec + live)}</span>;
}

function LinkChip({ link, locale }: { link: LinkRow; locale: Locale }) {
    const [, upsert] = useMutation(WorkspaceProjectLinkUpsertDocument);
    const label = link.label || link.url.replace(/^https?:\/\//, '').replace(/\/$/, '');
    return (
        <span
            data-row-id={link.projectLinkId}
            className="group flex items-center gap-1 rounded-md border border-border/60 bg-card/40 px-2 py-1 text-xs"
        >
            <LinkIcon className="size-3 text-muted-foreground" />
            <a href={link.url} target="_blank" rel="noreferrer" className="max-w-[260px] truncate hover:underline">
                {label}
            </a>
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{LINK_KIND_LABELS[link.kind][locale]}</span>
            <Button
                size="icon-sm"
                variant="ghost"
                aria-label={{ de: 'Lösen', en: 'Unpin' }[locale]}
                className="opacity-60 group-hover:opacity-100"
                onClick={async () => {
                    await upsert({
                        projectLinkId: link.projectLinkId,
                        projectId: link.projectId,
                        activityId: link.activityId ?? null,
                        url: link.url,
                        label: link.label ?? null,
                        kind: link.kind,
                        pinned: !link.pinned,
                    });
                }}
            >
                <PinOffIcon />
            </Button>
        </span>
    );
}

function FileChip({ file, locale }: { file: FileRow; locale: Locale }) {
    const [, upsert] = useMutation(WorkspaceProjectFileUpsertDocument);
    const label = file.label || file.fileUpload.filename;
    return (
        <span
            data-row-id={file.projectFileId}
            className="group flex items-center gap-1 rounded-md border border-border/60 bg-card/40 px-2 py-1 text-xs"
        >
            <FileIcon className="size-3 text-muted-foreground" />
            <a href={file.fileUpload.url} target="_blank" rel="noreferrer" className="max-w-[260px] truncate hover:underline">
                {label}
            </a>
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{FILE_KIND_LABELS[file.kind][locale]}</span>
            <Button
                size="icon-sm"
                variant="ghost"
                aria-label={{ de: 'Lösen', en: 'Unpin' }[locale]}
                className="opacity-60 group-hover:opacity-100"
                onClick={async () => {
                    await upsert({
                        projectFileId: file.projectFileId,
                        projectId: file.projectId,
                        activityId: file.activityId ?? null,
                        fileUploadId: file.fileUpload.fileUploadId,
                        label: file.label ?? null,
                        kind: file.kind,
                        pinned: !file.pinned,
                    });
                }}
            >
                <PinOffIcon />
            </Button>
        </span>
    );
}

// --- Tasks tab ---------------------------------------------------------------

function TasksSection({
    tasks,
    projectId,
    taskView,
    locale,
}: {
    tasks: ReadonlyArray<TaskRow>;
    projectId: string;
    taskView: TaskView;
    locale: Locale;
}) {
    const navigate = Route.useNavigate();
    const [adding, setAdding] = useState(false);

    const setView = (view: TaskView) => {
        // List is the default → drop the key so the canonical URL stays clean.
        void navigate({ search: (prev) => ({ ...prev, taskView: view === 'list' ? undefined : view }), replace: true });
    };

    return (
        <section>
            <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold">{{ de: 'Aufgaben', en: 'Tasks' }[locale]}</h2>
                <div className="flex items-center gap-2">
                    {/* In-section view toggle. The top-of-page switcher is reserved for
                     * the tab strip (see docs/conventions.md), so this secondary control
                     * is a compact two-button group, not another underlined <nav>. */}
                    <div
                        className="flex items-center rounded-md border border-border/60 p-0.5"
                        role="group"
                        aria-label={{ de: 'Ansicht', en: 'View' }[locale]}
                    >
                        <Button
                            size="icon-sm"
                            variant={taskView === 'list' ? 'secondary' : 'ghost'}
                            aria-label={{ de: 'Listenansicht', en: 'List view' }[locale]}
                            aria-pressed={taskView === 'list'}
                            onClick={() => setView('list')}
                        >
                            <ListIcon />
                        </Button>
                        <Button
                            size="icon-sm"
                            variant={taskView === 'kanban' ? 'secondary' : 'ghost'}
                            aria-label={{ de: 'Kanban-Ansicht', en: 'Kanban view' }[locale]}
                            aria-pressed={taskView === 'kanban'}
                            onClick={() => setView('kanban')}
                        >
                            <KanbanIcon />
                        </Button>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => setAdding(true)} disabled={adding}>
                        <PlusIcon />
                        {{ de: 'Aufgabe hinzufügen', en: 'Add task' }[locale]}
                    </Button>
                </div>
            </div>
            {adding ? (
                <TaskForm
                    task={null}
                    projectId={projectId}
                    nextPosition={tasks.length}
                    locale={locale}
                    onClose={() => setAdding(false)}
                    onSaved={() => {
                        setAdding(false);
                    }}
                />
            ) : null}

            {tasks.length === 0 && !adding ? (
                <EmptyState
                    icon={ListTodoIcon}
                    line={{ de: 'Was ist der nächste konkrete Schritt?', en: "What's the next concrete step?" }[locale]}
                    cta={{ de: 'Erste Aufgabe', en: 'First task' }[locale]}
                    onAction={() => setAdding(true)}
                />
            ) : taskView === 'kanban' ? (
                <TasksKanban tasks={tasks} projectId={projectId} locale={locale} />
            ) : (
                <TasksList tasks={tasks} projectId={projectId} locale={locale} />
            )}
        </section>
    );
}

// List view — the classic status-grouped stacks. Iterates the full 5-entry
// status order; a bucket renders only when it has rows.
function TasksList({ tasks, projectId, locale }: { tasks: ReadonlyArray<TaskRow>; projectId: string; locale: Locale }) {
    return (
        <>
            {TASK_STATUS_ORDER.map((status) => {
                const bucket = tasks.filter((t) => t.status === status);
                if (bucket.length === 0) return null;
                return (
                    <div key={status} className="mt-4">
                        <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            <span aria-hidden className={cn('size-1.5 rounded-full', TASK_STATUS_DOTS[status])} />
                            {TASK_STATUS_LABELS[status][locale]}
                            <span className="text-muted-foreground/60">· {bucket.length}</span>
                        </h3>
                        <ul className="mt-2 flex flex-col gap-1">
                            {bucket.map((task) => (
                                <li key={task.taskId} data-row-id={task.taskId}>
                                    <TaskRow task={task} projectId={projectId} locale={locale} />
                                </li>
                            ))}
                        </ul>
                    </div>
                );
            })}
        </>
    );
}

// Kanban view — one droppable column per status. Drag a card onto a column to
// move it there; the card appends to the end of the target column (position =
// global max + 1, collision-free with the single-task upsert). Native HTML5
// drag, same primitives as the CV reorder list (`cv.tsx`) — no DnD library.
// Local optimistic state moves the card immediately; the `userUpdates`
// subscription then replaces it, and a signature check re-adopts the server
// ordering.
function TasksKanban({ tasks, projectId, locale }: { tasks: ReadonlyArray<TaskRow>; projectId: string; locale: Locale }) {
    const [, upsert] = useMutation(WorkspaceProjectDetailUpsertTaskDocument);
    const [localTasks, setLocalTasks] = useState<ReadonlyArray<TaskRow>>(tasks);
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [overStatus, setOverStatus] = useState<GqlCAdminProjectTaskStatus | null>(null);

    // Re-adopt the upstream ordering whenever the server's (id, status)
    // signature changes — same cheap-string-compare trick as useReorderableList.
    const signature = tasks.map((t) => `${t.taskId}:${t.status}:${t.position}`).join('|');
    const lastSignatureRef = useRef(signature);
    useEffect(() => {
        if (lastSignatureRef.current !== signature) {
            lastSignatureRef.current = signature;
            setLocalTasks(tasks);
        }
    }, [signature, tasks]);

    const move = (taskId: string, toStatus: GqlCAdminProjectTaskStatus) => {
        const task = localTasks.find((t) => t.taskId === taskId);
        if (!task || task.status === toStatus) return;
        const nextPosition = localTasks.reduce((max, t) => Math.max(max, t.position), 0) + 1;
        const completedAt = toStatus === 'done' ? (task.completedAt ?? new Date().toISOString()) : null;

        // Optimistic move — reflect it locally before the round-trip.
        setLocalTasks((prev) =>
            prev.map((t) => (t.taskId === taskId ? { ...t, status: toStatus, position: nextPosition, completedAt } : t)),
        );

        void upsert({
            taskId: task.taskId,
            projectId: task.projectId,
            title: task.title,
            notes: task.notes,
            status: toStatus,
            position: nextPosition,
            dueAt: task.dueAt,
            completedAt,
            effort: task.effort ?? null,
            whenBucket: task.whenBucket ?? null,
        });
    };

    return (
        <div className="mt-4 flex gap-3 overflow-x-auto px-0.5 py-1 scroll-fade-x">
            {TASK_STATUS_ORDER.map((status) => {
                const bucket = localTasks.filter((t) => t.status === status);
                const isOver = overStatus === status && draggingId !== null;
                return (
                    <div
                        key={status}
                        onDragOver={(event) => {
                            if (!draggingId) return;
                            event.preventDefault();
                            event.dataTransfer.dropEffect = 'move';
                            if (overStatus !== status) setOverStatus(status);
                        }}
                        onDragLeave={(event) => {
                            // Only clear when the cursor actually leaves the column, not when
                            // it crosses a child element.
                            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                                setOverStatus((prev) => (prev === status ? null : prev));
                            }
                        }}
                        onDrop={(event) => {
                            if (!draggingId) return;
                            event.preventDefault();
                            move(draggingId, status);
                            setDraggingId(null);
                            setOverStatus(null);
                        }}
                        className={cn(
                            'flex w-72 shrink-0 flex-col rounded-lg border bg-card/20 transition-colors',
                            isOver ? 'border-primary/60 bg-primary/5 ring-2 ring-primary/40' : 'border-border/50',
                        )}
                    >
                        <div className="flex items-center justify-between gap-2 px-3 py-2">
                            <span
                                className={cn(
                                    'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium',
                                    TASK_STATUS_TINTS[status],
                                )}
                            >
                                {TASK_STATUS_LABELS[status][locale]}
                            </span>
                            <span className="text-xs tabular-nums text-muted-foreground">{bucket.length}</span>
                        </div>
                        <ul className="flex min-h-16 flex-col gap-2 px-2 pb-2">
                            {bucket.map((task) => (
                                <li key={task.taskId} data-row-id={task.taskId}>
                                    <KanbanCard
                                        task={task}
                                        projectId={projectId}
                                        locale={locale}
                                        isDragging={draggingId === task.taskId}
                                        onDragStart={() => setDraggingId(task.taskId)}
                                        onDragEnd={() => {
                                            setDraggingId(null);
                                            setOverStatus(null);
                                        }}
                                    />
                                </li>
                            ))}
                            {bucket.length === 0 ? (
                                <li className="rounded-md border border-dashed border-border/40 px-2 py-4 text-center text-[11px] text-muted-foreground/60">
                                    {{ de: 'Hierher ziehen', en: 'Drop here' }[locale]}
                                </li>
                            ) : null}
                        </ul>
                    </div>
                );
            })}
        </div>
    );
}

// A single kanban card. Draggable as a whole; a grip handle signals the
// affordance (mirrors the CV DraggableItem). Reuses the same edit / delete
// surface as the list row via an inline TaskForm swap, but renders compactly.
function KanbanCard({
    task,
    projectId,
    locale,
    isDragging,
    onDragStart,
    onDragEnd,
}: {
    task: TaskRow;
    projectId: string;
    locale: Locale;
    isDragging: boolean;
    onDragStart: () => void;
    onDragEnd: () => void;
}) {
    const [editing, setEditing] = useState(false);

    if (editing) {
        return (
            <TaskForm
                task={task}
                projectId={projectId}
                nextPosition={task.position}
                locale={locale}
                onClose={() => setEditing(false)}
                onSaved={() => setEditing(false)}
            />
        );
    }

    const effortBar = task.effort ? TASK_EFFORT_BAR[task.effort] : 'bg-muted-foreground/25';
    const done = task.status === 'done';
    const meta = [
        task.effort ? TASK_EFFORT_LABELS[task.effort][locale] : null,
        task.whenBucket ? TASK_WHEN_LABELS[task.whenBucket][locale] : null,
        task.dueAt ? `${{ de: 'fällig', en: 'due' }[locale]} ${format(parseISO(task.dueAt as unknown as string), 'dd.MM.')}` : null,
    ].filter(Boolean);

    // The whole card is the affordance: click (or Enter/Space) opens the edit
    // form; the card itself is draggable to move it between columns. Edit and
    // delete live inside that form, so the kanban surface stays uncluttered.
    return (
        <div
            role="button"
            tabIndex={0}
            draggable
            onClick={() => setEditing(true)}
            onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setEditing(true);
                }
            }}
            onDragStart={(event) => {
                onDragStart();
                event.dataTransfer.effectAllowed = 'move';
                // Firefox refuses to start a drag without payload data.
                event.dataTransfer.setData('text/plain', task.taskId);
            }}
            onDragEnd={onDragEnd}
            aria-grabbed={isDragging}
            aria-label={{ de: 'Aufgabe bearbeiten', en: 'Edit task' }[locale]}
            className={cn(
                'relative cursor-pointer overflow-hidden rounded-lg border border-border/50 bg-background/60 px-2 py-2 shadow-sm transition-[opacity,border-color] hover:border-border',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                isDragging && 'opacity-50',
            )}
        >
            <span aria-hidden className={cn('absolute inset-y-0 left-0 w-0.5', effortBar)} />
            <div className="pl-1.5">
                <div className={cn('text-sm', done && 'text-muted-foreground line-through')}>{task.title}</div>
                {meta.length > 0 || task.notes ? (
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                        {meta.map((m, i) => (
                            <span key={i}>{m}</span>
                        ))}
                        {task.notes ? <span className="line-clamp-1 max-w-full">{task.notes}</span> : null}
                    </div>
                ) : null}
            </div>
        </div>
    );
}

function TaskRow({ task, projectId, locale }: { task: TaskRow; projectId: string; locale: Locale }) {
    const [, upsert] = useMutation(WorkspaceProjectDetailUpsertTaskDocument);
    const [, del] = useMutation(WorkspaceProjectDetailDeleteTaskDocument);
    const [editing, setEditing] = useState(false);
    const [completing, setCompleting] = useState(false);

    if (editing) {
        return (
            <TaskForm
                task={task}
                projectId={projectId}
                nextPosition={task.position}
                locale={locale}
                onClose={() => setEditing(false)}
                onSaved={() => {
                    setEditing(false);
                }}
            />
        );
    }

    const effortBar = task.effort ? TASK_EFFORT_BAR[task.effort] : 'bg-muted-foreground/25';
    const done = task.status === 'done';
    const doing = task.status === 'doing';
    const meta = [
        task.effort ? TASK_EFFORT_LABELS[task.effort][locale] : null,
        task.whenBucket ? TASK_WHEN_LABELS[task.whenBucket][locale] : null,
        task.dueAt ? `${{ de: 'fällig', en: 'due' }[locale]} ${format(parseISO(task.dueAt as unknown as string), 'dd.MM.')}` : null,
    ].filter(Boolean);

    const toggle = async () => {
        // Checkbox advances the row: todo → doing → done → todo. Any other
        // status (backlog / blocked) advances to todo — clicking "commits" or
        // "unblocks" it. Landing on done fires the completion ritual.
        const next: GqlCAdminProjectTaskStatus = task.status === 'todo' ? 'doing' : task.status === 'doing' ? 'done' : 'todo';
        if (next === 'done') setCompleting(true);
        await upsert({
            taskId: task.taskId,
            projectId: task.projectId,
            title: task.title,
            notes: task.notes,
            status: next,
            position: task.position,
            dueAt: task.dueAt,
            completedAt: next === 'done' ? new Date().toISOString() : null,
            effort: task.effort ?? null,
            whenBucket: task.whenBucket ?? null,
        });
    };

    return (
        <div
            data-completing={completing || undefined}
            className={cn(
                'group relative overflow-hidden rounded-lg border border-border/50 bg-background/40 px-3 py-2',
                'transition-all duration-500',
                'data-[completing]:motion-safe:bg-emerald-100/50 dark:data-[completing]:motion-safe:bg-emerald-900/30',
                'data-[completing]:opacity-40',
            )}
        >
            <span aria-hidden className={cn('absolute inset-y-0 left-0 w-0.5', effortBar)} />
            <div className="flex items-start gap-2 pl-2 text-sm">
                <button
                    type="button"
                    aria-label={{ de: 'Status wechseln', en: 'Toggle status' }[locale]}
                    title={{ de: 'Status wechseln (Offen → Aktiv → Erledigt)', en: 'Cycle status (To do → Doing → Done)' }[locale]}
                    className={cn(
                        'mt-0.5 grid size-4 shrink-0 cursor-pointer place-items-center rounded-sm border-2 transition-colors',
                        done
                            ? 'border-emerald-500 bg-emerald-500 text-white'
                            : doing
                              ? 'border-primary/70'
                              : 'border-muted-foreground/60 hover:border-emerald-500',
                    )}
                    onClick={toggle}
                >
                    {done ? (
                        <svg
                            viewBox="0 0 20 20"
                            className="size-2.5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={3}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden
                        >
                            <path d="M4 10l4 4 8-8" />
                        </svg>
                    ) : doing ? (
                        <span className="size-1.5 rounded-full bg-primary" />
                    ) : null}
                </button>
                <div className="min-w-0 flex-1">
                    <div className={cn('text-sm', done && 'text-muted-foreground line-through')}>{task.title}</div>
                    {meta.length > 0 || task.notes ? (
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                            {meta.map((m, i) => (
                                <span key={i}>{m}</span>
                            ))}
                            {task.notes ? <span className="line-clamp-1 max-w-full">{task.notes}</span> : null}
                        </div>
                    ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                    <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={{ de: 'Bearbeiten', en: 'Edit' }[locale]}
                        onClick={() => setEditing(true)}
                    >
                        <PencilIcon />
                    </Button>
                    <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={{ de: 'Löschen', en: 'Delete' }[locale]}
                        onClick={async () => {
                            await del({ taskId: task.taskId });
                        }}
                    >
                        <Trash2Icon />
                    </Button>
                </div>
            </div>
        </div>
    );
}

function TaskForm({
    task,
    projectId,
    nextPosition,
    locale,
    onClose,
    onSaved,
}: {
    task: TaskRow | null;
    projectId: string;
    nextPosition: number;
    locale: Locale;
    onClose: () => void;
    onSaved: () => void;
}) {
    const [, upsert] = useMutation(WorkspaceProjectDetailUpsertTaskDocument);
    const [title, setTitle] = useState(task?.title ?? '');
    const [notes, setNotes] = useState(task?.notes ?? '');
    const [status, setStatus] = useState<GqlCAdminProjectTaskStatus>(task?.status ?? 'todo');
    const [dueAt, setDueAt] = useState<Date | null>(task?.dueAt ? parseISO(task.dueAt as unknown as string) : null);
    const [effort, setEffort] = useState<GqlCAdminProjectTaskEffort | null>(task?.effort ?? null);
    const [whenBucket, setWhenBucket] = useState<GqlCAdminProjectTaskWhenBucket | null>(task?.whenBucket ?? null);
    const [busy, setBusy] = useState(false);

    return (
        <form
            className="mt-2 grid gap-2 rounded-md border border-border/60 bg-card/40 p-3"
            onSubmit={async (e) => {
                e.preventDefault();
                if (busy) return;
                setBusy(true);
                await upsert({
                    taskId: task?.taskId ?? null,
                    projectId,
                    title: title.trim(),
                    notes: notes.trim() || null,
                    status,
                    position: task?.position ?? nextPosition,
                    dueAt: dueAt ? dueAt.toISOString() : null,
                    completedAt: status === 'done' ? (task?.completedAt ?? new Date().toISOString()) : null,
                    effort,
                    whenBucket,
                });
                setBusy(false);
                onSaved();
            }}
        >
            <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={{ de: 'Aufgabe', en: 'AdminProjectTask' }[locale]}
                required
            />
            <div className="flex flex-wrap gap-2">
                <Select value={status} onValueChange={(v: GqlCAdminProjectTaskStatus) => setStatus(v)}>
                    <SelectTrigger className="h-8 w-[140px] text-xs">
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
                <Select value={effort ?? 'none'} onValueChange={(v) => setEffort(v === 'none' ? null : (v as GqlCAdminProjectTaskEffort))}>
                    <SelectTrigger className="h-8 w-[140px] text-xs">
                        <SelectValue placeholder={{ de: 'Aufwand', en: 'Effort' }[locale]} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">{{ de: 'Aufwand —', en: 'Effort —' }[locale]}</SelectItem>
                        <SelectItem value="quick">{TASK_EFFORT_LABELS.quick[locale]}</SelectItem>
                        <SelectItem value="focused">{TASK_EFFORT_LABELS.focused[locale]}</SelectItem>
                        <SelectItem value="deep">{TASK_EFFORT_LABELS.deep[locale]}</SelectItem>
                    </SelectContent>
                </Select>
                <Select
                    value={whenBucket ?? 'none'}
                    onValueChange={(v) => setWhenBucket(v === 'none' ? null : (v as GqlCAdminProjectTaskWhenBucket))}
                >
                    <SelectTrigger className="h-8 w-[140px] text-xs">
                        <SelectValue placeholder={{ de: 'Wann', en: 'When' }[locale]} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">{{ de: 'Wann —', en: 'When —' }[locale]}</SelectItem>
                        <SelectItem value="today">{TASK_WHEN_LABELS.today[locale]}</SelectItem>
                        <SelectItem value="week">{TASK_WHEN_LABELS.week[locale]}</SelectItem>
                        <SelectItem value="someday">{TASK_WHEN_LABELS.someday[locale]}</SelectItem>
                        <SelectItem value="waiting">{TASK_WHEN_LABELS.waiting[locale]}</SelectItem>
                    </SelectContent>
                </Select>
                <DatePicker
                    value={dueAt ?? undefined}
                    onValueChange={(d) => setDueAt(d ?? null)}
                    placeholder={{ de: 'Fällig am', en: 'Due date' }[locale]}
                    locale={DATE_FNS_LOCALE[locale]}
                />
            </div>
            <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={{ de: 'Notizen', en: 'Notes' }[locale]}
                rows={2}
            />
            <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={onClose}>
                    {{ de: 'Abbrechen', en: 'Cancel' }[locale]}
                </Button>
                <Button type="submit" size="sm" disabled={busy}>
                    {{ de: 'Speichern', en: 'Save' }[locale]}
                </Button>
            </div>
        </form>
    );
}

// --- Notes tab ---------------------------------------------------------------

function NotesSection({ project, locale }: { project: ProjectRow; locale: Locale }) {
    const [, upsert] = useMutation(WorkspaceProjectDetailUpsertProjectDocument);
    const [notes, setNotes] = useState(project.notes ?? '');
    const [saving, setSaving] = useState(false);
    return (
        <section className="space-y-3">
            <h2 className="text-sm font-semibold">{{ de: 'Notizen', en: 'Notes' }[locale]}</h2>
            <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={16}
                placeholder={
                    {
                        de: 'Ein Ort für Gedanken, Skizzen, Entscheidungen. Markdown wird unterstützt.',
                        en: 'A place for thoughts, sketches, decisions. Markdown supported.',
                    }[locale]
                }
            />
            <div className="flex justify-end">
                <Button
                    size="sm"
                    disabled={saving || notes === (project.notes ?? '')}
                    onClick={async () => {
                        setSaving(true);
                        await upsert({
                            projectId: project.projectId,
                            title: project.title,
                            description: project.description,
                            notes: notes.trim() || null,
                            status: project.status,
                            position: project.position,
                            startedAt: project.startedAt,
                            completedAt: project.completedAt,
                        });
                        setSaving(false);
                    }}
                >
                    {{ de: 'Speichern', en: 'Save' }[locale]}
                </Button>
            </div>
        </section>
    );
}

// --- Links tab ---------------------------------------------------------------

function LinksSection({ links, projectId, locale }: { links: ReadonlyArray<LinkRow>; projectId: string; locale: Locale }) {
    const [adding, setAdding] = useState(false);
    return (
        <section>
            <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">{{ de: 'Links', en: 'Links' }[locale]}</h2>
                <Button size="sm" variant="ghost" onClick={() => setAdding(true)} disabled={adding}>
                    <PlusIcon />
                    {{ de: 'Link hinzufügen', en: 'Add link' }[locale]}
                </Button>
            </div>
            {adding ? (
                <LinkForm
                    link={null}
                    projectId={projectId}
                    locale={locale}
                    onClose={() => setAdding(false)}
                    onSaved={() => {
                        setAdding(false);
                    }}
                />
            ) : null}
            {links.length === 0 && !adding ? (
                <EmptyState
                    icon={LinkIcon}
                    line={
                        {
                            de: 'Repository, Malt-Mission, Figma — alles, was du oft öffnest.',
                            en: 'Repository, Malt mission, Figma — anything you open often.',
                        }[locale]
                    }
                    cta={{ de: 'Ersten Link', en: 'First link' }[locale]}
                    onAction={() => setAdding(true)}
                />
            ) : (
                <ul className="mt-3 flex flex-col gap-2">
                    {links.map((link) => (
                        <li key={link.projectLinkId} data-row-id={link.projectLinkId}>
                            <LinkCard link={link} projectId={projectId} locale={locale} />
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}

function LinkCard({ link, projectId, locale }: { link: LinkRow; projectId: string; locale: Locale }) {
    const [, upsert] = useMutation(WorkspaceProjectLinkUpsertDocument);
    const [, del] = useMutation(WorkspaceProjectLinkDeleteDocument);
    const [editing, setEditing] = useState(false);
    if (editing) {
        return (
            <LinkForm
                link={link}
                projectId={projectId}
                locale={locale}
                onClose={() => setEditing(false)}
                onSaved={() => {
                    setEditing(false);
                }}
            />
        );
    }
    const label = link.label || link.url.replace(/^https?:\/\//, '').replace(/\/$/, '');
    return (
        <div className="flex items-start gap-2 rounded-md border border-border/40 bg-card/20 p-2 text-sm">
            <LinkIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
                <a href={link.url} target="_blank" rel="noreferrer" className="font-medium hover:underline">
                    {label}
                </a>
                <div className="text-[11px] text-muted-foreground">
                    {LINK_KIND_LABELS[link.kind][locale]}
                    {link.activityId ? <> · {{ de: 'aus Eintrag', en: 'from entry' }[locale]}</> : null}
                </div>
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
                <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={link.pinned ? { de: 'Lösen', en: 'Unpin' }[locale] : { de: 'Anpinnen', en: 'Pin' }[locale]}
                    onClick={async () => {
                        await upsert({
                            projectLinkId: link.projectLinkId,
                            projectId: link.projectId,
                            activityId: link.activityId ?? null,
                            url: link.url,
                            label: link.label ?? null,
                            kind: link.kind,
                            pinned: !link.pinned,
                        });
                    }}
                >
                    {link.pinned ? <PinOffIcon /> : <PinIcon />}
                </Button>
                <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={{ de: 'Bearbeiten', en: 'Edit' }[locale]}
                    onClick={() => setEditing(true)}
                >
                    <PencilIcon />
                </Button>
                <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={{ de: 'Löschen', en: 'Delete' }[locale]}
                    onClick={async () => {
                        await del({ projectLinkId: link.projectLinkId });
                    }}
                >
                    <Trash2Icon />
                </Button>
            </div>
        </div>
    );
}

function LinkForm({
    link,
    projectId,
    locale,
    onClose,
    onSaved,
}: {
    link: LinkRow | null;
    projectId: string;
    locale: Locale;
    onClose: () => void;
    onSaved: () => void;
}) {
    const [, upsert] = useMutation(WorkspaceProjectLinkUpsertDocument);
    const [url, setUrl] = useState(link?.url ?? '');
    const [label, setLabel] = useState(link?.label ?? '');
    const [kind, setKind] = useState<GqlCAdminProjectLinkKind>(link?.kind ?? 'other');
    const [pinned, setPinned] = useState(link?.pinned ?? false);
    const [busy, setBusy] = useState(false);
    return (
        <form
            className="mt-2 grid gap-2 rounded-md border border-border/60 bg-card/40 p-3 text-xs"
            onSubmit={async (e) => {
                e.preventDefault();
                if (busy) return;
                setBusy(true);
                await upsert({
                    projectLinkId: link?.projectLinkId ?? null,
                    projectId,
                    activityId: null,
                    url: url.trim(),
                    label: label.trim() || null,
                    kind,
                    pinned,
                });
                setBusy(false);
                onSaved();
            }}
        >
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" required />
            <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder={{ de: 'Label (optional)', en: 'Label (optional)' }[locale]}
            />
            <div className="flex items-center gap-2">
                <Select value={kind} onValueChange={(v: GqlCAdminProjectLinkKind) => setKind(v)}>
                    <SelectTrigger className="h-8 w-[140px] text-xs">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {LINK_KIND_ORDER.map((k) => (
                            <SelectItem key={k} value={k}>
                                {LINK_KIND_LABELS[k][locale]}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <label className="flex items-center gap-1.5 text-xs">
                    <Checkbox checked={pinned} onCheckedChange={(checked) => setPinned(checked === true)} />
                    {{ de: 'Angepinnt', en: 'Pinned' }[locale]}
                </label>
            </div>
            <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={onClose}>
                    {{ de: 'Abbrechen', en: 'Cancel' }[locale]}
                </Button>
                <Button type="submit" size="sm" disabled={busy}>
                    {{ de: 'Speichern', en: 'Save' }[locale]}
                </Button>
            </div>
        </form>
    );
}

// --- Files tab ---------------------------------------------------------------

function FilesSection({ files, projectId, locale }: { files: ReadonlyArray<FileRow>; projectId: string; locale: Locale }) {
    const [adding, setAdding] = useState(false);
    // Single dialog instance + open/index lifted here so arrow-key navigation
    // walks every file on the tab, mirroring how `ChatMessageUser` hosts the
    // dialog for its bubble's attachments. The dialog itself decides per-MIME
    // whether to render an image, the markdown view, a `<pre>`, or the
    // generic info card — see `ChatAttachmentPreviewDialog.tsx`.
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewIndex, setPreviewIndex] = useState(0);
    // Build the attachment list the dialog navigates in one pass — the
    // ordering matches the rendered `<ul>` below so the index handed to
    // `onOpenPreview` points at the right row.
    const attachments = useMemo(() => files.map((f) => f.fileUpload), [files]);
    return (
        <section>
            <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">{{ de: 'Dateien', en: 'Files' }[locale]}</h2>
                <Button size="sm" variant="ghost" onClick={() => setAdding(true)} disabled={adding}>
                    <PlusIcon />
                    {{ de: 'Datei hochladen', en: 'Upload file' }[locale]}
                </Button>
            </div>
            {adding ? (
                <FileUploadForm
                    projectId={projectId}
                    locale={locale}
                    onClose={() => setAdding(false)}
                    onSaved={() => {
                        setAdding(false);
                    }}
                />
            ) : null}
            {files.length === 0 && !adding ? (
                <EmptyState
                    icon={FileIcon}
                    line={
                        {
                            de: 'Verträge, Angebote, Screenshots — leg deine Dateien ab.',
                            en: 'Contracts, offers, screenshots — drop your files in.',
                        }[locale]
                    }
                    cta={{ de: 'Erste Datei', en: 'First file' }[locale]}
                    onAction={() => setAdding(true)}
                />
            ) : (
                <ul className="mt-3 flex flex-col gap-2">
                    {files.map((file, index) => (
                        <li key={file.projectFileId} data-row-id={file.projectFileId}>
                            <FileCard
                                file={file}
                                locale={locale}
                                onOpenPreview={() => {
                                    setPreviewIndex(index);
                                    setPreviewOpen(true);
                                }}
                            />
                        </li>
                    ))}
                </ul>
            )}
            {attachments.length > 0 ? (
                <ChatAttachmentPreviewDialog
                    open={previewOpen}
                    onOpenChange={setPreviewOpen}
                    attachments={attachments}
                    index={previewIndex}
                    onIndexChange={setPreviewIndex}
                />
            ) : null}
        </section>
    );
}

function FileCard({ file, locale, onOpenPreview }: { file: FileRow; locale: Locale; onOpenPreview: () => void }) {
    const [, upsert] = useMutation(WorkspaceProjectFileUpsertDocument);
    const [, del] = useMutation(WorkspaceProjectFileDeleteDocument);
    // Image / markdown / text formats get an inline preview (same dialog the
    // chat surface uses). PDFs and archives fall back to a plain link that
    // opens in a new tab — the dialog's "other" branch would just show a
    // download card, so the anchor saves a click.
    const previewKind = previewKindFor(file.fileUpload.mediaType);
    const supportsInlinePreview = previewKind === 'image' || previewKind === 'markdown' || previewKind === 'text';
    const label = file.label || file.fileUpload.filename;
    return (
        <div className="flex items-start gap-2 rounded-md border border-border/40 bg-card/20 p-2 text-sm">
            <FileIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
                {supportsInlinePreview ? (
                    <button type="button" onClick={onOpenPreview} className="text-left font-medium hover:underline">
                        {label}
                    </button>
                ) : (
                    <a href={file.fileUpload.url} target="_blank" rel="noreferrer" className="font-medium hover:underline">
                        {label}
                    </a>
                )}
                <div className="text-[11px] text-muted-foreground">
                    {FILE_KIND_LABELS[file.kind][locale]} · {file.fileUpload.mediaType} · {Math.round(file.fileUpload.size / 1024)} KB
                    {file.activityId ? <> · {{ de: 'aus Eintrag', en: 'from entry' }[locale]}</> : null}
                </div>
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
                <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={file.pinned ? { de: 'Lösen', en: 'Unpin' }[locale] : { de: 'Anpinnen', en: 'Pin' }[locale]}
                    onClick={async () => {
                        await upsert({
                            projectFileId: file.projectFileId,
                            projectId: file.projectId,
                            activityId: file.activityId ?? null,
                            fileUploadId: file.fileUpload.fileUploadId,
                            label: file.label ?? null,
                            kind: file.kind,
                            pinned: !file.pinned,
                        });
                    }}
                >
                    {file.pinned ? <PinOffIcon /> : <PinIcon />}
                </Button>
                <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={{ de: 'Löschen', en: 'Delete' }[locale]}
                    onClick={async () => {
                        await del({ projectFileId: file.projectFileId });
                    }}
                >
                    <Trash2Icon />
                </Button>
            </div>
        </div>
    );
}

function FileUploadForm({
    projectId,
    locale,
    onClose,
    onSaved,
}: {
    projectId: string;
    locale: Locale;
    onClose: () => void;
    onSaved: () => void;
}) {
    const [, upsert] = useMutation(WorkspaceProjectFileUpsertDocument);
    const [kind, setKind] = useState<GqlCAdminProjectFileKind>('other');
    const [pinned, setPinned] = useState(false);
    const [busy, setBusy] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    // Drag events fire on children too, so a simple boolean flickers as the
    // cursor crosses the icon/text — mirror the composer's depth counter
    // (`MessageComposer.tsx`) to keep the highlight stable.
    const dragDepthRef = useRef(0);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [error, setError] = useState<string | null>(null);

    const isFileDrag = (event: DragEvent) => event.dataTransfer?.types.includes('Files') ?? false;

    return (
        <form
            className="mt-2 grid gap-2 rounded-md border border-border/60 bg-card/40 p-3 text-xs"
            onSubmit={async (e) => {
                e.preventDefault();
                if (!file) {
                    setError({ de: 'Bitte eine Datei wählen.', en: 'Pick a file.' }[locale]);
                    return;
                }
                if (busy) return;
                setBusy(true);
                setError(null);
                try {
                    const uploaded = await uploadFile(file);
                    await upsert({
                        projectFileId: null,
                        projectId,
                        activityId: null,
                        fileUploadId: uploaded.fileUploadId,
                        label: file.name,
                        kind,
                        pinned,
                    });
                    onSaved();
                } catch (err) {
                    setError(err instanceof Error ? err.message : String(err));
                } finally {
                    setBusy(false);
                }
            }}
        >
            <input
                ref={fileInputRef}
                type="file"
                className="sr-only"
                onChange={(e) => {
                    const picked = e.target.files?.[0] ?? null;
                    if (picked) {
                        setFile(picked);
                        setError(null);
                    }
                    // Reset so picking the same file twice still fires `change`.
                    e.target.value = '';
                }}
            />
            <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                onDragEnter={(event) => {
                    if (!isFileDrag(event.nativeEvent)) return;
                    event.preventDefault();
                    dragDepthRef.current += 1;
                    setIsDragOver(true);
                }}
                onDragOver={(event) => {
                    if (!isFileDrag(event.nativeEvent)) return;
                    // preventDefault on dragover is required for drop to fire.
                    event.preventDefault();
                    event.dataTransfer.dropEffect = 'copy';
                }}
                onDragLeave={() => {
                    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
                    if (dragDepthRef.current === 0) setIsDragOver(false);
                }}
                onDrop={(event) => {
                    if (!isFileDrag(event.nativeEvent)) return;
                    event.preventDefault();
                    dragDepthRef.current = 0;
                    setIsDragOver(false);
                    const dropped = event.dataTransfer.files[0];
                    if (dropped) {
                        setFile(dropped);
                        setError(null);
                    }
                }}
                className={cn(
                    'flex flex-col items-center justify-center gap-1.5 rounded-md border border-dashed px-4 py-6 text-center transition-colors',
                    'border-border/70 bg-background/40 hover:border-brand/60 hover:bg-background/70',
                    'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand/30 focus-visible:border-brand',
                    isDragOver && 'border-brand bg-brand/5 ring-[3px] ring-brand/30',
                )}
            >
                <UploadIcon className={cn('size-5', isDragOver ? 'text-brand' : 'text-muted-foreground')} />
                {file ? (
                    <>
                        <span className="max-w-full truncate text-xs font-medium">{file.name}</span>
                        <span className="text-[10px] text-muted-foreground">
                            {Math.max(1, Math.round(file.size / 1024))} KB ·{' '}
                            {{ de: 'Klicken oder ziehen zum Ersetzen', en: 'Click or drop to replace' }[locale]}
                        </span>
                    </>
                ) : (
                    <>
                        <span className="text-xs font-medium">{{ de: 'Datei hier ablegen', en: 'Drop file here' }[locale]}</span>
                        <span className="text-[10px] text-muted-foreground">
                            {{ de: 'oder klicken, um zu wählen', en: 'or click to browse' }[locale]}
                        </span>
                    </>
                )}
            </button>
            <div className="flex items-center gap-2">
                <Select value={kind} onValueChange={(v: GqlCAdminProjectFileKind) => setKind(v)}>
                    <SelectTrigger className="h-8 w-[140px] text-xs">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {FILE_KIND_ORDER.map((k) => (
                            <SelectItem key={k} value={k}>
                                {FILE_KIND_LABELS[k][locale]}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <label className="flex items-center gap-1.5 text-xs">
                    <Checkbox checked={pinned} onCheckedChange={(checked) => setPinned(checked === true)} />
                    {{ de: 'Angepinnt', en: 'Pinned' }[locale]}
                </label>
            </div>
            {error ? <p className="text-xs text-red-500">{error}</p> : null}
            <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={onClose}>
                    {{ de: 'Abbrechen', en: 'Cancel' }[locale]}
                </Button>
                <Button type="submit" size="sm" disabled={busy || !file}>
                    {busy ? { de: 'Lädt…', en: 'Uploading…' }[locale] : { de: 'Hochladen', en: 'Upload' }[locale]}
                </Button>
            </div>
        </form>
    );
}
