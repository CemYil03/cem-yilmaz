import { createFileRoute, Link, useRouter } from '@tanstack/react-router';
import { format, parseISO } from 'date-fns';
import {
    CheckSquare2Icon,
    CircleDotIcon,
    ExternalLinkIcon,
    FileIcon,
    FlagIcon,
    HandshakeIcon,
    LinkIcon,
    ListTodoIcon,
    MailIcon,
    PaperclipIcon,
    PencilIcon,
    PhoneCallIcon,
    PinIcon,
    PinOffIcon,
    PlayIcon,
    PlusIcon,
    SquareIcon,
    StickyNoteIcon,
    StopCircleIcon,
    TimerIcon,
    Trash2Icon,
    UploadIcon,
    VideoIcon,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation } from 'urql';
import { z } from 'zod';
import { uploadFile } from '../../../web/chat/fileUpload';
import { Button } from '../../../web/components/base/button';
import { DatePicker } from '../../../web/components/base/date-picker';
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

type DetailTab = 'tasks' | 'activity' | 'notes' | 'links' | 'files';
const TABS = ['tasks', 'activity', 'notes', 'links', 'files'] as const satisfies ReadonlyArray<DetailTab>;
const TAB_LABELS: Record<DetailTab, { de: string; en: string }> = {
    tasks: { de: 'Aufgaben', en: 'Tasks' },
    activity: { de: 'Verlauf', en: 'Activity' },
    notes: { de: 'Notizen', en: 'Notes' },
    links: { de: 'Links', en: 'Links' },
    files: { de: 'Dateien', en: 'Files' },
};
const TAB_ICONS: Record<DetailTab, typeof ListTodoIcon> = {
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
    const tab: DetailTab = search.tab ?? 'tasks';
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
        <main className="px-6 md:px-10 lg:px-16 max-w-5xl mx-auto w-full py-12 leading-relaxed">
            <ProjectHeader project={project} activeTimer={activeTimer} locale={locale} onChanged={onChanged} />

            {(pinnedLinks.length > 0 || pinnedFiles.length > 0) && (
                <PinnedRail pinnedLinks={pinnedLinks} pinnedFiles={pinnedFiles} locale={locale} onChanged={onChanged} />
            )}

            <nav className="mt-8 flex gap-1 border-b border-border/60" aria-label={{ de: 'Bereiche', en: 'Sections' }[locale]}>
                {TABS.map((t) => {
                    const Icon = TAB_ICONS[t];
                    const isActive = tab === t;
                    return (
                        <Link
                            key={t}
                            to="/{-$locale}/workspace/projects/$projectId"
                            params={{ projectId: project.projectId }}
                            search={(): { tab?: DetailTab } => (t === 'tasks' ? {} : { tab: t })}
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
                        </Link>
                    );
                })}
            </nav>

            <div className="mt-6">
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
        </main>
    );
}

function ProjectHeader({
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
    const [, upsert] = useMutation(WorkspaceProjectDetailUpsertProjectDocument);
    const [, del] = useMutation(WorkspaceProjectDetailDeleteProjectDocument);
    const router = useRouter();
    const [editing, setEditing] = useState(false);

    const isOwnTimerRunning = activeTimer?.projectId === project.projectId;

    return (
        <header>
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <h1 className="text-2xl font-semibold tracking-tight">{project.title}</h1>
                    {project.description ? <p className="mt-1 text-sm text-muted-foreground">{project.description}</p> : null}
                    {project.sourceRequest ? (
                        <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                            <MailIcon className="size-3" />
                            {{ de: 'Anfrage von', en: 'Request from' }[locale]} {project.sourceRequest.name}
                            {project.sourceRequest.company ? ` · ${project.sourceRequest.company}` : ''}
                        </p>
                    ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                    <Select
                        value={project.status}
                        onValueChange={async (next: GqlCProjectStatus) => {
                            await upsert({
                                projectId: project.projectId,
                                title: project.title,
                                description: project.description,
                                notes: project.notes,
                                status: next,
                                position: project.position,
                                startedAt: project.startedAt,
                                completedAt: project.completedAt,
                            });
                            onChanged();
                        }}
                    >
                        <SelectTrigger className="h-8 w-[150px] text-xs">
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
                    <TimerControl projectId={project.projectId} activeTimer={activeTimer} locale={locale} onChanged={onChanged} />
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
                            if (!confirm({ de: 'Projekt wirklich löschen?', en: 'Delete this project?' }[locale])) return;
                            await del({ projectId: project.projectId });
                            void router.navigate({ to: '/{-$locale}/workspace/projects' });
                        }}
                    >
                        <Trash2Icon />
                    </Button>
                </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                {project.totalWorkSec > 0 || isOwnTimerRunning ? (
                    <span>
                        {{ de: 'Gesamt', en: 'Total' }[locale]}:{' '}
                        <TotalWorkLabel totalWorkSec={project.totalWorkSec} activeTimer={isOwnTimerRunning ? activeTimer : null} />
                    </span>
                ) : null}
                <span>
                    {project.tasks.filter((t) => t.status === 'done').length}/{project.tasks.length}{' '}
                    {{ de: 'Aufgaben fertig', en: 'tasks done' }[locale]}
                </span>
                <span>
                    {project.activities.length} {{ de: 'Einträge', en: 'entries' }[locale]}
                </span>
            </div>
            {editing ? (
                <ProjectEditForm
                    project={project}
                    locale={locale}
                    onClose={() => setEditing(false)}
                    onSaved={() => {
                        setEditing(false);
                        onChanged();
                    }}
                />
            ) : null}
        </header>
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

function TimerControl({
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
        >
            <PlayIcon className="size-3" />
            <span className="ml-1 text-xs">
                {activeTimer ? { de: 'Wechseln', en: 'Switch here' }[locale] : { de: 'Start', en: 'Start' }[locale]}
            </span>
        </Button>
    );
}

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

function PinnedRail({
    pinnedLinks,
    pinnedFiles,
    locale,
    onChanged,
}: {
    pinnedLinks: ReadonlyArray<LinkRow>;
    pinnedFiles: ReadonlyArray<FileRow>;
    locale: Locale;
    onChanged: () => void;
}) {
    return (
        <section className="mt-6">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {{ de: 'Angepinnt', en: 'Pinned' }[locale]}
            </h2>
            <div className="mt-2 flex flex-wrap gap-2">
                {pinnedLinks.map((link) => (
                    <LinkChip key={link.projectLinkId} link={link} locale={locale} onChanged={onChanged} />
                ))}
                {pinnedFiles.map((file) => (
                    <FileChip key={file.projectFileId} file={file} locale={locale} onChanged={onChanged} />
                ))}
            </div>
        </section>
    );
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
                <p className="mt-4 text-xs text-muted-foreground">{{ de: 'Noch keine Aufgaben.', en: 'No tasks yet.' }[locale]}</p>
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
                <p className="mt-3 text-xs text-muted-foreground">{{ de: 'Noch keine Einträge.', en: 'No entries yet.' }[locale]}</p>
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
                placeholder={{ de: 'Markdown…', en: 'Markdown…' }[locale]}
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
                <p className="mt-3 text-xs text-muted-foreground">{{ de: 'Noch keine Links.', en: 'No links yet.' }[locale]}</p>
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
                <p className="mt-3 text-xs text-muted-foreground">{{ de: 'Noch keine Dateien.', en: 'No files yet.' }[locale]}</p>
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
