import { createFileRoute, Link, useRouter } from '@tanstack/react-router';
import { format, formatDistanceToNowStrict, parseISO } from 'date-fns';
import { de as deLocale, enUS } from 'date-fns/locale';
import {
    CheckSquare2Icon,
    ChevronDownIcon,
    CircleDotIcon,
    ExternalLinkIcon,
    FileIcon,
    FlagIcon,
    HandshakeIcon,
    LayoutDashboardIcon,
    LinkIcon,
    ListTodoIcon,
    MailIcon,
    MoreHorizontalIcon,
    PaperclipIcon,
    PencilIcon,
    PhoneCallIcon,
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
    VideoIcon,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useMutation } from 'urql';
import { z } from 'zod';
import { uploadFile } from '../../../web/chat/fileUpload';
import { AssistantMarkdown } from '../../../web/components/AssistantMarkdown';
import { GlassCard } from '../../../web/components/GlassCard';
import { Reveal } from '../../../web/components/Reveal';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../web/components/base/select';
import { Textarea } from '../../../web/components/base/textarea';
import type {
    GqlCProjectActivityChannel,
    GqlCProjectActivityKind,
    GqlCProjectFileKind,
    GqlCProjectLinkKind,
    GqlCProjectOfferStatus,
    GqlCProjectStatus,
    GqlCTaskStatus,
    GqlCWorkspaceProjectDetailQuery,
} from '../../../web/graphql/generated';
import {
    WorkspaceProjectDetailDeleteActivityDocument,
    WorkspaceProjectDetailDeleteProjectDocument,
    WorkspaceProjectDetailDeleteTaskDocument,
    WorkspaceProjectDetailDocument,
    WorkspaceProjectDetailTimerStartDocument,
    WorkspaceProjectDetailTimerStopDocument,
    WorkspaceProjectDetailUpsertActivityDocument,
    WorkspaceProjectDetailUpsertProjectDocument,
    WorkspaceProjectDetailUpsertTaskDocument,
    WorkspaceProjectFileDeleteDocument,
    WorkspaceProjectFileTogglePinDocument,
    WorkspaceProjectFileUpsertDocument,
    WorkspaceProjectLinkDeleteDocument,
    WorkspaceProjectLinkTogglePinDocument,
    WorkspaceProjectLinkUpsertDocument,
} from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import { useLocale } from '../../../web/hooks/useLocale';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { cn } from '../../../web/utils/cn';
import type { Locale } from '../../../web/utils/locale';
import { localeFromParam } from '../../../web/utils/locale';

// Workspace project detail — one project per URL with its tasks, activity
// feed, pinned-resource rail, and Links / Files surfaces. Reachable from
// the kanban card on `/workspace/projects`. Single-language, admin-only,
// noindex. See `docs/features/projects-workspace.md`.

type ProjectRow = GqlCWorkspaceProjectDetailQuery['admin']['project'];
type TaskRow = ProjectRow['tasks'][number];
type ActivityRow = ProjectRow['activities'][number];
type LinkRow = ProjectRow['links'][number];
type FileRow = ProjectRow['files'][number];
type ActiveTimer = GqlCWorkspaceProjectDetailQuery['admin']['activeTimer'];

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

const PROJECT_STATUS_ORDER: ReadonlyArray<GqlCProjectStatus> = ['idea', 'planning', 'active', 'paused', 'done', 'archived'];
const PROJECT_STATUS_LABELS: Record<GqlCProjectStatus, { de: string; en: string }> = {
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
const PROJECT_STATUS_TINTS: Record<GqlCProjectStatus, string> = {
    idea: 'bg-muted text-muted-foreground',
    planning: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
    active: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
    paused: 'bg-secondary text-secondary-foreground',
    done: 'bg-primary/15 text-primary',
    archived: 'bg-muted/60 text-muted-foreground/70',
};

const TASK_STATUS_ORDER: ReadonlyArray<GqlCTaskStatus> = ['todo', 'doing', 'done'];
const TASK_STATUS_LABELS: Record<GqlCTaskStatus, { de: string; en: string }> = {
    todo: { de: 'Offen', en: 'To do' },
    doing: { de: 'Aktiv', en: 'Doing' },
    done: { de: 'Erledigt', en: 'Done' },
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
const ACTIVITY_KIND_ICONS: Record<GqlCProjectActivityKind, LucideIcon> = {
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

const LINK_KIND_ORDER: ReadonlyArray<GqlCProjectLinkKind> = ['github', 'malt', 'figma', 'gdrive', 'notion', 'invoice', 'offer', 'other'];
const LINK_KIND_LABELS: Record<GqlCProjectLinkKind, { de: string; en: string }> = {
    github: { de: 'GitHub', en: 'GitHub' },
    malt: { de: 'Malt', en: 'Malt' },
    figma: { de: 'Figma', en: 'Figma' },
    gdrive: { de: 'Google Drive', en: 'Google Drive' },
    notion: { de: 'Notion', en: 'Notion' },
    invoice: { de: 'Rechnung', en: 'Invoice' },
    offer: { de: 'Angebot', en: 'Offer' },
    other: { de: 'Sonstiges', en: 'Other' },
};

const FILE_KIND_ORDER: ReadonlyArray<GqlCProjectFileKind> = ['offer', 'invoice', 'contract', 'screenshot', 'other'];
const FILE_KIND_LABELS: Record<GqlCProjectFileKind, { de: string; en: string }> = {
    offer: { de: 'Angebot', en: 'Offer' },
    invoice: { de: 'Rechnung', en: 'Invoice' },
    contract: { de: 'Vertrag', en: 'Contract' },
    screenshot: { de: 'Screenshot', en: 'Screenshot' },
    other: { de: 'Sonstiges', en: 'Other' },
};

const OFFER_STATUS_ORDER: ReadonlyArray<GqlCProjectOfferStatus> = ['sent', 'accepted', 'rejected', 'withdrawn'];
const OFFER_STATUS_LABELS: Record<GqlCProjectOfferStatus, { de: string; en: string }> = {
    sent: { de: 'Gesendet', en: 'Sent' },
    accepted: { de: 'Angenommen', en: 'Accepted' },
    rejected: { de: 'Abgelehnt', en: 'Rejected' },
    withdrawn: { de: 'Zurückgezogen', en: 'Withdrawn' },
};

function formatDuration(totalSec: number): string {
    if (totalSec < 60) return `${totalSec}s`;
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    return `${minutes}m`;
}

function formatHms(totalSec: number): string {
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function formatEur(cents: number | null | undefined): string {
    if (cents == null) return '';
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

function dateFnsLocale(locale: Locale) {
    return locale === 'de' ? deLocale : enUS;
}

// "today" / "vor 3 Tagen" / "Mar 14" — relative when fresh enough to feel
// recent, absolute once the user would rather just see the date. Used in the
// rail's metadata list so timestamps don't shout `2026-06-12T09:14:00Z` at
// the user.
function formatRelative(iso: string, locale: Locale): string {
    const parsed = parseISO(iso);
    const daysAgo = (Date.now() - parsed.getTime()) / 86_400_000;
    if (daysAgo < 7) {
        return formatDistanceToNowStrict(parsed, { addSuffix: true, locale: dateFnsLocale(locale) });
    }
    return format(parsed, locale === 'de' ? 'd. MMM yyyy' : 'd MMM yyyy', { locale: dateFnsLocale(locale) });
}

function formatAbsolute(iso: string, locale: Locale): string {
    return format(parseISO(iso), locale === 'de' ? 'd. MMM yyyy' : 'd MMM yyyy', { locale: dateFnsLocale(locale) });
}

// URL state — `tab` selects the section, `focus` lights up a child row.
const detailSearchSchema = z.object({
    tab: z.enum(TABS).optional(),
    focus: z.string().optional(),
});

export const Route = createFileRoute('/{-$locale}/workspace/projects_/$projectId')({
    validateSearch: detailSearchSchema,
    loader: ({ params }) => routeLoaderGraphqlClient(WorkspaceProjectDetailDocument, { projectId: params.projectId })(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: { de: 'Projekt', en: 'Project' }[locale],
            description: { de: 'Projekt-Detail', en: 'Project detail' }[locale],
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
    const router = useRouter();
    const tab: DetailTab = search.tab ?? 'overview';
    const onChanged = () => router.invalidate();

    const project = data.admin.project;
    const activeTimer = data.admin.activeTimer ?? null;

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

    const pinnedLinks = useMemo(() => project.links.filter((l) => l.pinned), [project.links]);
    const pinnedFiles = useMemo(() => project.files.filter((f) => f.pinned), [project.files]);

    return (
        <main className="mx-auto w-full max-w-6xl px-4 py-8 leading-relaxed md:px-8 md:py-10 lg:px-12 lg:py-12">
            <ProjectTitleBlock project={project} locale={locale} onChanged={onChanged} />

            <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
                {/* Main content column */}
                <GlassCard className="p-5 sm:p-6 lg:p-8">
                    <ProjectDescription project={project} locale={locale} onChanged={onChanged} />

                    <nav
                        className="mt-6 flex flex-wrap gap-x-1 gap-y-1 border-b border-border/60"
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
                                        '-mb-px flex items-center gap-2 border-b-2 px-3 py-2 text-sm transition-colors',
                                        isActive
                                            ? 'border-primary font-medium text-foreground'
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

                    <div className="mt-6">
                        {tab === 'overview' ? (
                            <OverviewSection
                                project={project}
                                pinnedLinks={pinnedLinks}
                                pinnedFiles={pinnedFiles}
                                locale={locale}
                                onChanged={onChanged}
                            />
                        ) : null}
                        {tab === 'tasks' ? (
                            <TasksSection tasks={project.tasks} projectId={project.projectId} locale={locale} onChanged={onChanged} />
                        ) : null}
                        {tab === 'activity' ? (
                            <ActivitySection
                                activities={project.activities}
                                tasks={project.tasks}
                                projectId={project.projectId}
                                locale={locale}
                                onChanged={onChanged}
                            />
                        ) : null}
                        {tab === 'notes' ? <NotesSection project={project} locale={locale} onChanged={onChanged} /> : null}
                        {tab === 'links' ? (
                            <LinksSection links={project.links} projectId={project.projectId} locale={locale} onChanged={onChanged} />
                        ) : null}
                        {tab === 'files' ? (
                            <FilesSection files={project.files} projectId={project.projectId} locale={locale} onChanged={onChanged} />
                        ) : null}
                    </div>
                </GlassCard>

                {/* Right rail — sticky on lg+, stacks under content on mobile (grid handles
                    the stacking; the rail itself doesn't try to be sticky on mobile). */}
                <div className="lg:sticky lg:top-24">
                    <ProjectRail project={project} activeTimer={activeTimer} locale={locale} onChanged={onChanged} />
                </div>
            </div>
        </main>
    );
}

// ---------- Title block & rail ----------------------------------------------

function ProjectTitleBlock({ project, locale, onChanged }: { project: ProjectRow; locale: Locale; onChanged: () => void }) {
    return (
        <header>
            <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">{project.title}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
                <ProjectStatusPill project={project} locale={locale} onChanged={onChanged} />
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

function ProjectStatusPill({ project, locale, onChanged }: { project: ProjectRow; locale: Locale; onChanged: () => void }) {
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
                            onChanged();
                        }}
                    >
                        {PROJECT_STATUS_LABELS[s][locale]}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

function ProjectRail({
    project,
    activeTimer,
    locale,
    onChanged,
}: {
    project: ProjectRow;
    activeTimer: ActiveTimer;
    locale: Locale;
    onChanged: () => void;
}) {
    const router = useRouter();
    const [, del] = useMutation(WorkspaceProjectDetailDeleteProjectDocument);

    const tasksDone = project.tasks.filter((t) => t.status === 'done').length;
    const tasksTotal = project.tasks.length;
    const taskPct = tasksTotal === 0 ? 0 : Math.round((tasksDone / tasksTotal) * 100);
    const isOwnTimerRunning = activeTimer?.projectId === project.projectId;

    return (
        <GlassCard className="p-5">
            <RailTimerButton projectId={project.projectId} activeTimer={activeTimer} locale={locale} onChanged={onChanged} />

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

function RailTimerButton({
    projectId,
    activeTimer,
    locale,
    onChanged,
}: {
    projectId: string;
    activeTimer: ActiveTimer;
    locale: Locale;
    onChanged: () => void;
}) {
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
                    onChanged();
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
                onChanged();
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

function ProjectDescription({ project, locale, onChanged }: { project: ProjectRow; locale: Locale; onChanged: () => void }) {
    const [editing, setEditing] = useState(false);
    if (editing) {
        return (
            <ProjectEditForm
                project={project}
                locale={locale}
                onClose={() => setEditing(false)}
                onSaved={() => {
                    setEditing(false);
                    onChanged();
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
    pinnedLinks,
    pinnedFiles,
    locale,
    onChanged,
}: {
    project: ProjectRow;
    pinnedLinks: ReadonlyArray<LinkRow>;
    pinnedFiles: ReadonlyArray<FileRow>;
    locale: Locale;
    onChanged: () => void;
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

    const isEmpty =
        upNext.length === 0 && recentActivity.length === 0 && pinnedLinks.length === 0 && pinnedFiles.length === 0 && !project.notes;

    if (isEmpty) {
        return (
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
        );
    }

    return (
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
                                <OverviewUpNextRow task={task} projectId={project.projectId} locale={locale} onChanged={onChanged} />
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
                            <LinkChip key={link.projectLinkId} link={link} locale={locale} onChanged={onChanged} />
                        ))}
                        {pinnedFiles.map((file) => (
                            <FileChip key={file.projectFileId} file={file} locale={locale} onChanged={onChanged} />
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

function OverviewUpNextRow({
    task,
    projectId,
    locale,
    onChanged,
}: {
    task: TaskRow;
    projectId: string;
    locale: Locale;
    onChanged: () => void;
}) {
    const [, upsert] = useMutation(WorkspaceProjectDetailUpsertTaskDocument);
    const StatusIcon = task.status === 'doing' ? CircleDotIcon : SquareIcon;
    return (
        <div className="flex items-start gap-2 rounded-md border border-border/40 bg-card/20 p-2 text-sm">
            <button
                type="button"
                aria-label={{ de: 'Status wechseln', en: 'Toggle status' }[locale]}
                className="mt-0.5 text-muted-foreground hover:text-foreground"
                onClick={async () => {
                    const next: GqlCTaskStatus = task.status === 'todo' ? 'doing' : 'done';
                    await upsert({
                        taskId: task.taskId,
                        projectId: task.projectId,
                        title: task.title,
                        notes: task.notes,
                        status: next,
                        position: task.position,
                        dueAt: task.dueAt,
                        completedAt: next === 'done' ? new Date().toISOString() : null,
                    });
                    onChanged();
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
                <div className="truncate font-medium text-foreground">{activity.title}</div>
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

function LinkChip({ link, locale, onChanged }: { link: LinkRow; locale: Locale; onChanged: () => void }) {
    const [, togglePin] = useMutation(WorkspaceProjectLinkTogglePinDocument);
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
                    await togglePin({ projectLinkId: link.projectLinkId });
                    onChanged();
                }}
            >
                <PinOffIcon />
            </Button>
        </span>
    );
}

function FileChip({ file, locale, onChanged }: { file: FileRow; locale: Locale; onChanged: () => void }) {
    const [, togglePin] = useMutation(WorkspaceProjectFileTogglePinDocument);
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
                    await togglePin({ projectFileId: file.projectFileId });
                    onChanged();
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
    locale,
    onChanged,
}: {
    tasks: ReadonlyArray<TaskRow>;
    projectId: string;
    locale: Locale;
    onChanged: () => void;
}) {
    const [adding, setAdding] = useState(false);
    return (
        <section>
            <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">{{ de: 'Aufgaben', en: 'Tasks' }[locale]}</h2>
                <Button size="sm" variant="ghost" onClick={() => setAdding(true)} disabled={adding}>
                    <PlusIcon />
                    {{ de: 'Aufgabe hinzufügen', en: 'Add task' }[locale]}
                </Button>
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
                        onChanged();
                    }}
                />
            ) : null}
            {TASK_STATUS_ORDER.map((status) => {
                const bucket = tasks.filter((t) => t.status === status);
                if (bucket.length === 0) return null;
                return (
                    <div key={status} className="mt-4">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            {TASK_STATUS_LABELS[status][locale]}
                        </h3>
                        <ul className="mt-2 flex flex-col gap-1">
                            {bucket.map((task) => (
                                <li key={task.taskId} data-row-id={task.taskId}>
                                    <TaskRow task={task} projectId={projectId} locale={locale} onChanged={onChanged} />
                                </li>
                            ))}
                        </ul>
                    </div>
                );
            })}
            {tasks.length === 0 && !adding ? (
                <EmptyState
                    icon={ListTodoIcon}
                    line={{ de: 'Was ist der nächste konkrete Schritt?', en: "What's the next concrete step?" }[locale]}
                    cta={{ de: 'Erste Aufgabe', en: 'First task' }[locale]}
                    onAction={() => setAdding(true)}
                />
            ) : null}
        </section>
    );
}

function TaskRow({ task, projectId, locale, onChanged }: { task: TaskRow; projectId: string; locale: Locale; onChanged: () => void }) {
    const [, upsert] = useMutation(WorkspaceProjectDetailUpsertTaskDocument);
    const [, del] = useMutation(WorkspaceProjectDetailDeleteTaskDocument);
    const [editing, setEditing] = useState(false);

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
                    onChanged();
                }}
            />
        );
    }

    const StatusIcon = task.status === 'done' ? CheckSquare2Icon : task.status === 'doing' ? CircleDotIcon : SquareIcon;
    return (
        <div className="flex items-start gap-2 text-sm">
            <button
                type="button"
                aria-label={{ de: 'Status wechseln', en: 'Toggle status' }[locale]}
                className="mt-0.5 text-muted-foreground hover:text-foreground"
                onClick={async () => {
                    const next: GqlCTaskStatus = task.status === 'todo' ? 'doing' : task.status === 'doing' ? 'done' : 'todo';
                    await upsert({
                        taskId: task.taskId,
                        projectId: task.projectId,
                        title: task.title,
                        notes: task.notes,
                        status: next,
                        position: task.position,
                        dueAt: task.dueAt,
                        completedAt: next === 'done' ? new Date().toISOString() : null,
                    });
                    onChanged();
                }}
            >
                <StatusIcon className="size-4" />
            </button>
            <div className="min-w-0 flex-1">
                <div className={cn('text-sm', task.status === 'done' && 'text-muted-foreground line-through')}>{task.title}</div>
                {task.dueAt ? (
                    <div className="text-[11px] text-muted-foreground">
                        {{ de: 'Fällig', en: 'Due' }[locale]}: {format(parseISO(task.dueAt as unknown as string), 'yyyy-MM-dd')}
                    </div>
                ) : null}
                {task.notes ? <div className="text-[11px] text-muted-foreground">{task.notes}</div> : null}
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
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
                        onChanged();
                    }}
                >
                    <Trash2Icon />
                </Button>
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
    const [status, setStatus] = useState<GqlCTaskStatus>(task?.status ?? 'todo');
    const [dueAt, setDueAt] = useState<Date | null>(task?.dueAt ? parseISO(task.dueAt as unknown as string) : null);
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
                });
                setBusy(false);
                onSaved();
            }}
        >
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={{ de: 'Aufgabe', en: 'Task' }[locale]} required />
            <div className="flex gap-2">
                <Select value={status} onValueChange={(v: GqlCTaskStatus) => setStatus(v)}>
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
                <DatePicker
                    value={dueAt ?? undefined}
                    onValueChange={(d) => setDueAt(d ?? null)}
                    placeholder={{ de: 'Fällig am', en: 'Due date' }[locale]}
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

// --- Activity tab ------------------------------------------------------------

function ActivitySection({
    activities,
    tasks,
    projectId,
    locale,
    onChanged,
}: {
    activities: ReadonlyArray<ActivityRow>;
    tasks: ReadonlyArray<TaskRow>;
    projectId: string;
    locale: Locale;
    onChanged: () => void;
}) {
    const [adding, setAdding] = useState(false);
    const [editing, setEditing] = useState<ActivityRow | null>(null);
    const [, del] = useMutation(WorkspaceProjectDetailDeleteActivityDocument);

    return (
        <section>
            <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">{{ de: 'Verlauf', en: 'Activity' }[locale]}</h2>
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
                <EmptyState
                    icon={TimerIcon}
                    line={
                        {
                            de: 'Festhalten, was du gemacht hast — auch kleine Schritte zählen.',
                            en: 'Capture what you did — small steps count too.',
                        }[locale]
                    }
                    cta={{ de: 'Ersten Eintrag', en: 'First entry' }[locale]}
                    onAction={() => setAdding(true)}
                />
            ) : (
                <ul className="mt-3 flex flex-col gap-2">
                    {activities.map((a) => (
                        <li key={a.activityId} data-row-id={a.activityId}>
                            {editing?.activityId === a.activityId ? (
                                <ActivityForm
                                    activity={a}
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
                                <ActivityCard
                                    activity={a}
                                    locale={locale}
                                    onEdit={() => setEditing(a)}
                                    onDelete={async () => {
                                        await del({ activityId: a.activityId });
                                        onChanged();
                                    }}
                                />
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}

function ActivityCard({
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
    return (
        <div className="flex items-start gap-2 rounded-md border border-border/40 bg-card/20 p-2 text-xs">
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
                    {activity.kind === 'offer' && activity.amountCents != null ? (
                        <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                            {formatEur(activity.amountCents)}
                        </span>
                    ) : null}
                    {activity.kind === 'offer' && activity.offerStatus ? (
                        <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[10px] text-secondary-foreground">
                            {OFFER_STATUS_LABELS[activity.offerStatus][locale]}
                        </span>
                    ) : null}
                    {isRunning ? (
                        <span className="rounded-md bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                            {{ de: 'läuft', en: 'running' }[locale]}
                        </span>
                    ) : null}
                </div>
                {activity.notes ? <div className="mt-0.5 whitespace-pre-line text-muted-foreground">{activity.notes}</div> : null}
                {(activity.links.length > 0 || activity.files.length > 0) && (
                    <div className="mt-1 flex flex-wrap gap-1">
                        {activity.links.map((link) => (
                            <a
                                key={link.projectLinkId}
                                href={link.url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 rounded border border-border/60 px-1.5 py-0.5 text-[10px] hover:bg-muted"
                            >
                                <ExternalLinkIcon className="size-2.5" />
                                {link.label || link.url.replace(/^https?:\/\//, '').slice(0, 40)}
                            </a>
                        ))}
                        {activity.files.map((file) => (
                            <a
                                key={file.projectFileId}
                                href={file.fileUpload.url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 rounded border border-border/60 px-1.5 py-0.5 text-[10px] hover:bg-muted"
                            >
                                <PaperclipIcon className="size-2.5" />
                                {file.label || file.fileUpload.filename}
                            </a>
                        ))}
                    </div>
                )}
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
    const [, upsert] = useMutation(WorkspaceProjectDetailUpsertActivityDocument);
    const [kind, setKind] = useState<GqlCProjectActivityKind>(activity?.kind === 'work' ? 'note' : (activity?.kind ?? 'note'));
    const [channel, setChannel] = useState<GqlCProjectActivityChannel | null>(activity?.channel ?? null);
    const [title, setTitle] = useState(activity?.title ?? '');
    const [notes, setNotes] = useState(activity?.notes ?? '');
    const [occurredAt, setOccurredAt] = useState<Date>(activity ? parseISO(activity.occurredAt as unknown as string) : new Date());
    const [durationMin, setDurationMin] = useState<string>(activity?.durationSec ? String(Math.round(activity.durationSec / 60)) : '');
    const [taskId, setTaskId] = useState<string | null>(activity?.taskId ?? null);
    const [amountEur, setAmountEur] = useState<string>(activity?.amountCents != null ? String(activity.amountCents / 100) : '');
    const [offerStatus, setOfferStatus] = useState<GqlCProjectOfferStatus | null>(activity?.offerStatus ?? null);
    const [attachLinkUrl, setAttachLinkUrl] = useState('');
    const [attachLinkKind, setAttachLinkKind] = useState<GqlCProjectLinkKind>('other');
    const [attachFile, setAttachFile] = useState<{ fileUploadId: string; filename: string } | null>(null);
    const [attachFileKind, setAttachFileKind] = useState<GqlCProjectFileKind>('other');
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [busy, setBusy] = useState(false);

    const channelEnabled = kind === 'clientContact' || kind === 'meeting';
    const offerFieldsEnabled = kind === 'offer';

    return (
        <form
            className="mt-2 grid gap-2 rounded-md border border-border/60 bg-card/40 p-3 text-xs"
            onSubmit={async (e) => {
                e.preventDefault();
                if (busy) return;
                setBusy(true);
                const durationSec = durationMin ? Math.max(0, Math.round(Number(durationMin) * 60)) : null;
                const amountCents = offerFieldsEnabled && amountEur ? Math.round(Number(amountEur) * 100) : null;
                await upsert({
                    activityId: activity?.activityId ?? null,
                    projectId,
                    taskId,
                    kind,
                    channel: channelEnabled ? channel : null,
                    title: title.trim(),
                    notes: notes.trim() || null,
                    occurredAt: occurredAt.toISOString(),
                    durationSec,
                    amountCents: offerFieldsEnabled ? amountCents : null,
                    offerStatus: offerFieldsEnabled ? offerStatus : null,
                    attachLinkUrl: !activity && attachLinkUrl.trim() ? attachLinkUrl.trim() : null,
                    attachLinkKind: !activity && attachLinkUrl.trim() ? attachLinkKind : null,
                    attachLinkLabel: null,
                    attachLinkPinned: false,
                    attachFileUploadId: !activity && attachFile ? attachFile.fileUploadId : null,
                    attachFileKind: !activity && attachFile ? attachFileKind : null,
                    attachFileLabel: !activity && attachFile ? attachFile.filename : null,
                    attachFilePinned: false,
                });
                setBusy(false);
                onSaved();
            }}
        >
            <div className="flex flex-wrap gap-2">
                <Select value={kind} onValueChange={(v: GqlCProjectActivityKind) => setKind(v)}>
                    <SelectTrigger className="h-8 w-[160px] text-xs">
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
                {channelEnabled ? (
                    <Select
                        value={channel ?? '__none'}
                        onValueChange={(v) => setChannel(v === '__none' ? null : (v as GqlCProjectActivityChannel))}
                    >
                        <SelectTrigger className="h-8 w-[140px] text-xs">
                            <SelectValue placeholder={{ de: 'Kanal', en: 'Channel' }[locale]} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="__none">{{ de: 'Kein Kanal', en: 'No channel' }[locale]}</SelectItem>
                            {ACTIVITY_CHANNEL_ORDER.map((c) => (
                                <SelectItem key={c} value={c}>
                                    {ACTIVITY_CHANNEL_LABELS[c][locale]}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                ) : null}
                {tasks.length > 0 ? (
                    <Select value={taskId ?? '__none'} onValueChange={(v) => setTaskId(v === '__none' ? null : v)}>
                        <SelectTrigger className="h-8 w-[200px] text-xs">
                            <SelectValue placeholder={{ de: 'Aufgabe (optional)', en: 'Task (optional)' }[locale]} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="__none">{{ de: 'Keine Aufgabe', en: 'No task' }[locale]}</SelectItem>
                            {tasks.map((t) => (
                                <SelectItem key={t.taskId} value={t.taskId}>
                                    {t.title}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                ) : null}
            </div>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={{ de: 'Titel', en: 'Title' }[locale]} required />
            <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={{ de: 'Notizen', en: 'Notes' }[locale]}
                rows={2}
            />
            <div className="flex flex-wrap gap-2">
                <DatePicker value={occurredAt} onValueChange={(d) => setOccurredAt(d ?? new Date())} />
                <Input
                    type="number"
                    min="0"
                    step="1"
                    value={durationMin}
                    onChange={(e) => setDurationMin(e.target.value)}
                    placeholder={{ de: 'Dauer (min)', en: 'Duration (min)' }[locale]}
                    className="w-32"
                />
            </div>
            {offerFieldsEnabled ? (
                <div className="flex flex-wrap gap-2">
                    <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={amountEur}
                        onChange={(e) => setAmountEur(e.target.value)}
                        placeholder={{ de: 'Betrag (€)', en: 'Amount (€)' }[locale]}
                        className="w-40"
                    />
                    <Select
                        value={offerStatus ?? '__none'}
                        onValueChange={(v) => setOfferStatus(v === '__none' ? null : (v as GqlCProjectOfferStatus))}
                    >
                        <SelectTrigger className="h-8 w-[160px] text-xs">
                            <SelectValue placeholder={{ de: 'Status', en: 'Status' }[locale]} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="__none">{{ de: 'Kein Status', en: 'No status' }[locale]}</SelectItem>
                            {OFFER_STATUS_ORDER.map((s) => (
                                <SelectItem key={s} value={s}>
                                    {OFFER_STATUS_LABELS[s][locale]}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            ) : null}
            {!activity ? (
                <>
                    <div className="flex flex-wrap items-center gap-2 border-t border-border/40 pt-2">
                        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                            {{ de: 'Link anhängen (optional)', en: 'Attach link (optional)' }[locale]}
                        </span>
                        <Input
                            value={attachLinkUrl}
                            onChange={(e) => setAttachLinkUrl(e.target.value)}
                            placeholder="https://…"
                            className="flex-1 min-w-[200px]"
                        />
                        <Select value={attachLinkKind} onValueChange={(v: GqlCProjectLinkKind) => setAttachLinkKind(v)}>
                            <SelectTrigger className="h-8 w-[120px] text-xs">
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
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                            {{ de: 'Datei anhängen (optional)', en: 'Attach file (optional)' }[locale]}
                        </span>
                        <input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                setUploading(true);
                                try {
                                    const uploaded = await uploadFile(file);
                                    setAttachFile({ fileUploadId: uploaded.fileUploadId, filename: uploaded.filename });
                                } catch (err) {
                                    console.error(err);
                                } finally {
                                    setUploading(false);
                                    if (fileInputRef.current) fileInputRef.current.value = '';
                                }
                            }}
                        />
                        <Button type="button" size="sm" variant="ghost" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
                            <UploadIcon />
                            {uploading
                                ? { de: 'Lädt…', en: 'Uploading…' }[locale]
                                : attachFile
                                  ? attachFile.filename
                                  : { de: 'Datei wählen', en: 'Choose file' }[locale]}
                        </Button>
                        {attachFile ? (
                            <Select value={attachFileKind} onValueChange={(v: GqlCProjectFileKind) => setAttachFileKind(v)}>
                                <SelectTrigger className="h-8 w-[120px] text-xs">
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
                        ) : null}
                    </div>
                </>
            ) : null}
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

function NotesSection({ project, locale, onChanged }: { project: ProjectRow; locale: Locale; onChanged: () => void }) {
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
                        onChanged();
                    }}
                >
                    {{ de: 'Speichern', en: 'Save' }[locale]}
                </Button>
            </div>
        </section>
    );
}

// --- Links tab ---------------------------------------------------------------

function LinksSection({
    links,
    projectId,
    locale,
    onChanged,
}: {
    links: ReadonlyArray<LinkRow>;
    projectId: string;
    locale: Locale;
    onChanged: () => void;
}) {
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
                        onChanged();
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
                            <LinkCard link={link} projectId={projectId} locale={locale} onChanged={onChanged} />
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}

function LinkCard({ link, projectId, locale, onChanged }: { link: LinkRow; projectId: string; locale: Locale; onChanged: () => void }) {
    const [, togglePin] = useMutation(WorkspaceProjectLinkTogglePinDocument);
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
                    onChanged();
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
                        await togglePin({ projectLinkId: link.projectLinkId });
                        onChanged();
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
                        onChanged();
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
    const [kind, setKind] = useState<GqlCProjectLinkKind>(link?.kind ?? 'other');
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
                <Select value={kind} onValueChange={(v: GqlCProjectLinkKind) => setKind(v)}>
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
                <label className="flex items-center gap-1 text-xs">
                    <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
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

function FilesSection({
    files,
    projectId,
    locale,
    onChanged,
}: {
    files: ReadonlyArray<FileRow>;
    projectId: string;
    locale: Locale;
    onChanged: () => void;
}) {
    const [adding, setAdding] = useState(false);
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
                        onChanged();
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
                    {files.map((file) => (
                        <li key={file.projectFileId} data-row-id={file.projectFileId}>
                            <FileCard file={file} locale={locale} onChanged={onChanged} />
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}

function FileCard({ file, locale, onChanged }: { file: FileRow; locale: Locale; onChanged: () => void }) {
    const [, togglePin] = useMutation(WorkspaceProjectFileTogglePinDocument);
    const [, del] = useMutation(WorkspaceProjectFileDeleteDocument);
    return (
        <div className="flex items-start gap-2 rounded-md border border-border/40 bg-card/20 p-2 text-sm">
            <FileIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
                <a href={file.fileUpload.url} target="_blank" rel="noreferrer" className="font-medium hover:underline">
                    {file.label || file.fileUpload.filename}
                </a>
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
                        await togglePin({ projectFileId: file.projectFileId });
                        onChanged();
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
                        onChanged();
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
    const [kind, setKind] = useState<GqlCProjectFileKind>('other');
    const [pinned, setPinned] = useState(false);
    const [busy, setBusy] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [error, setError] = useState<string | null>(null);

    return (
        <form
            className="mt-2 grid gap-2 rounded-md border border-border/60 bg-card/40 p-3 text-xs"
            onSubmit={async (e) => {
                e.preventDefault();
                const file = fileInputRef.current?.files?.[0];
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
            <input ref={fileInputRef} type="file" required className="text-xs" />
            <div className="flex items-center gap-2">
                <Select value={kind} onValueChange={(v: GqlCProjectFileKind) => setKind(v)}>
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
                <label className="flex items-center gap-1 text-xs">
                    <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
                    {{ de: 'Angepinnt', en: 'Pinned' }[locale]}
                </label>
            </div>
            {error ? <p className="text-xs text-red-500">{error}</p> : null}
            <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={onClose}>
                    {{ de: 'Abbrechen', en: 'Cancel' }[locale]}
                </Button>
                <Button type="submit" size="sm" disabled={busy}>
                    {busy ? { de: 'Lädt…', en: 'Uploading…' }[locale] : { de: 'Hochladen', en: 'Upload' }[locale]}
                </Button>
            </div>
        </form>
    );
}
