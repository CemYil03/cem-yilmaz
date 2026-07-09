import { createFileRoute, Link, redirect } from '@tanstack/react-router';
import { format, parseISO } from 'date-fns';
import {
    ArchiveIcon,
    ArrowRightIcon,
    CheckSquare2Icon,
    FolderKanbanIcon,
    InboxIcon,
    MailIcon,
    PlusIcon,
    TimerIcon,
    Trash2Icon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { createRequest, useClient, useMutation } from 'urql';
import { pipe, subscribe } from 'wonka';
import { z } from 'zod';
import { Button } from '../../../web/components/base/button';
import { Input } from '../../../web/components/base/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../web/components/base/select';
import { Textarea } from '../../../web/components/base/textarea';
import { GlassCard } from '../../../web/components/GlassCard';
import { WorkspaceUnauthorized } from '../../../web/components/WorkspaceUnauthorized';
import type {
    GqlCProjectStatus,
    GqlCWorkspaceProjectsPageUpdatesSubscription,
    GqlCWorkspaceProjectsPageUserFragment,
} from '../../../web/graphql/generated';
import {
    WorkspaceProjectRequestArchiveDocument,
    WorkspaceProjectRequestDeleteDocument,
    WorkspaceProjectUpsertDocument,
    WorkspaceProjectsPageDocument,
    WorkspaceProjectsPageUpdatesDocument,
} from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import { useLocale } from '../../../web/hooks/useLocale';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { cn } from '../../../web/utils/cn';
import type { Locale } from '../../../web/utils/locale';
import { localeFromParam } from '../../../web/utils/locale';

// Workspace projects hub — two tabs glued to one read query: Inbox
// triages incoming visitor `ProjectRequest`s, Projects is a status-grouped
// board of ongoing personal work. Convert from inbox → project opens the
// project editor prefilled from the request; on submit `projectUpsert`
// inserts the project and archives the source request in one transaction.
// Standalone todos (tasks with no project attached) live on
// `/workspace/todos` — the two surfaces stay disjoint.
// Admin-only, single-language (no DE/EN pairs); the page itself is
// noindex and reachable only by typing the URL until Phase 2 OAuth.
// See `docs/features/projects-workspace.md`.

type Tab = 'inbox' | 'projects';
const TABS = ['inbox', 'projects'] as const satisfies ReadonlyArray<Tab>;
const TAB_LABELS: Record<Tab, { de: string; en: string }> = {
    inbox: { de: 'Eingang', en: 'Inbox' },
    projects: { de: 'Projekte', en: 'Projects' },
};
const TAB_ICONS: Record<Tab, typeof InboxIcon> = {
    inbox: InboxIcon,
    projects: FolderKanbanIcon,
};

const title = { de: 'Projekte', en: 'Projects' };
const description = {
    de: 'Eingehende Anfragen und laufende Projekte.',
    en: 'Incoming requests and ongoing projects.',
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
// project/inbox row as `?focus=<id>`; standalone todos deep-link to
// `/workspace/todos` instead). State that survives reload sits here;
// ephemeral local state (which row is expanded, which form is being
// edited) stays in `useState`.
//
// The schema still accepts `tab: 'todos'` so bookmarks or stale assistant
// messages using the legacy deep-link don't 404. `beforeLoad` hot-redirects
// that case to `/workspace/todos` before the component ever mounts.
const projectsSearchSchema = z.object({
    tab: z.enum([...TABS, 'todos'] as const).optional(),
    inboxView: z.enum(['archive']).optional(),
    // Free-form id; an unmatched value is a no-op (no row, no flash). We
    // don't validate as `uuid()` so a future non-UUID surface (e.g.
    // `focus=tasks-summary`) doesn't need a schema change.
    focus: z.string().optional(),
});

type ProjectsSearch = z.infer<typeof projectsSearchSchema>;

type WorkspaceProjectsAdmin = NonNullable<GqlCWorkspaceProjectsPageUserFragment['admin']>;

export const Route = createFileRoute('/{-$locale}/workspace/projects')({
    validateSearch: projectsSearchSchema,
    beforeLoad: ({ search, params }) => {
        if (search.tab === 'todos') {
            const locale = params.locale ? `/${params.locale}` : '';
            const focus = search.focus ? `?focus=${encodeURIComponent(search.focus)}` : '';
            throw redirect({ href: `${locale}/workspace/todos${focus}`, replace: true });
        }
    },
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
    // `search.tab` may be `'todos'` in the raw URL, but the `beforeLoad`
    // redirect above hoists that case out before the component mounts —
    // narrow to the live `Tab` union here.
    const tab: Tab = search.tab && search.tab !== 'todos' ? search.tab : 'projects';
    const data = Route.useLoaderData();

    // Server-authoritative state: seed once from the route loader, then let
    // the `userUpdates` subscription replace it on every server push. Every
    // mutation on this page already calls `serverRuntime.publish.userUpdates`
    // server-side, so we never need to re-fetch from the client.
    // See `docs/architecture/state-synchronization.md` — Seed-and-Subscribe.
    const user = useWorkspaceProjectsPageLiveUser(data.sessionFindOne.user);
    const admin = user?.admin;
    const projectRequests = admin?.adminProjectRequestFindMany ?? [];
    const projects = admin?.adminProjectFindMany ?? [];
    const activeTimer = admin?.adminProjectActiveTimerFindOne ?? null;
    const inboxCount = projectRequests.filter((r) => r.status === 'emailVerified').length;

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

    if (!admin) return <WorkspaceUnauthorized locale={locale} />;

    return (
        <main className="px-6 md:px-10 lg:px-16 max-w-8xl mx-auto w-full py-12 leading-relaxed">
            <nav
                className="flex gap-1 overflow-x-auto border-b border-border/60 scrollbar-none"
                aria-label={{ de: 'Bereiche', en: 'Sections' }[locale]}
            >
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
                    <InboxSection rows={projectRequests} showArchived={search.inboxView === 'archive'} locale={locale} />
                ) : null}
                {tab === 'projects' ? <ProjectsBoard rows={projects} activeTimer={activeTimer} locale={locale} /> : null}
            </div>
        </main>
    );
}

// --- Inbox ------------------------------------------------------------------

type RequestRow = WorkspaceProjectsAdmin['adminProjectRequestFindMany'][number];

function InboxSection({ rows, showArchived, locale }: { rows: ReadonlyArray<RequestRow>; showArchived: boolean; locale: Locale }) {
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
                            <InboxRow row={row} locale={locale} />
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}

function InboxRow({ row, locale }: { row: RequestRow; locale: Locale }) {
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

type ProjectRow = WorkspaceProjectsAdmin['adminProjectFindMany'][number];
type ActiveTimer = NonNullable<WorkspaceProjectsAdmin['adminProjectActiveTimerFindOne']>;

function ProjectsBoard({
    rows,
    activeTimer,
    locale,
}: {
    rows: ReadonlyArray<ProjectRow>;
    activeTimer: ActiveTimer | null;
    locale: Locale;
}) {
    const [adding, setAdding] = useState(false);
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
                <Button size="sm" variant="outline" onClick={() => setAdding(true)} disabled={adding}>
                    <PlusIcon />
                    {{ de: 'Projekt hinzufügen', en: 'Add project' }[locale]}
                </Button>
            </div>

            {adding ? (
                <ProjectForm
                    row={null}
                    locale={locale}
                    nextPosition={rows.filter((r) => r.status === 'idea').length}
                    onClose={() => setAdding(false)}
                    onSaved={() => {
                        setAdding(false);
                    }}
                />
            ) : null}

            <div className="mt-6 flex flex-col gap-8">
                {grouped.map((group) =>
                    group.rows.length === 0 && !adding ? null : (
                        <div key={group.status}>
                            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                {PROJECT_STATUS_LABELS[group.status][locale]} · {group.rows.length}
                            </h2>
                            {group.rows.length === 0 ? null : (
                                // Tile grid: 1 col on mobile, 2 on md, 3 on lg+.
                                // Each tile is a single link to the project detail
                                // route; editing / deleting / timer toggle live
                                // there. See `docs/features/projects-workspace.md`.
                                <ul className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                                    {group.rows.map((row) => (
                                        <li key={row.projectId} data-row-id={row.projectId}>
                                            <ProjectCard row={row} activeTimer={activeTimer} locale={locale} />
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

function ProjectCard({ row, activeTimer, locale }: { row: ProjectRow; activeTimer: ActiveTimer | null; locale: Locale }) {
    const doneCount = row.tasks.filter((t) => t.status === 'done').length;
    const totalCount = row.tasks.length;
    const isOwnTimerRunning = activeTimer?.projectId === row.projectId;

    // The whole tile is a single link to the project detail route. No
    // per-tile action buttons — start/stop/edit/delete all live on the
    // detail page. A non-interactive "live" pill appears when this project
    // owns the active timer so the running tile is glanceable in the grid.
    return (
        <Link
            to="/{-$locale}/workspace/projects/$projectId"
            params={{ projectId: row.projectId }}
            className={cn(
                'block h-full rounded-2xl outline-none',
                'focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            )}
        >
            <GlassCard
                className={cn(
                    'flex h-full flex-col gap-3 px-5 py-4 transition-colors',
                    'hover:bg-white/55 dark:hover:bg-white/[0.06]',
                    isOwnTimerRunning && 'ring-1 ring-primary/40',
                )}
            >
                <div className="flex items-start justify-between gap-2">
                    <h3 className="line-clamp-2 min-w-0 flex-1 text-sm font-medium leading-snug">{row.title}</h3>
                    {isOwnTimerRunning && activeTimer.startedAt ? (
                        <LiveTimerBadge startedAt={activeTimer.startedAt as unknown as string} locale={locale} />
                    ) : null}
                </div>
                {row.description ? (
                    <p className="line-clamp-2 text-xs text-muted-foreground">{row.description}</p>
                ) : (
                    <span className="sr-only">{{ de: 'Keine Beschreibung', en: 'No description' }[locale]}</span>
                )}
                {row.sourceRequest ? (
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <MailIcon className="size-3 shrink-0" />
                        <span className="truncate">
                            {{ de: 'Anfrage von', en: 'Request from' }[locale]} {row.sourceRequest.name}
                            {row.sourceRequest.company ? ` · ${row.sourceRequest.company}` : ''}
                        </span>
                    </div>
                ) : null}
                <div className="mt-auto flex items-center justify-between gap-2 pt-1 text-[11px] text-muted-foreground">
                    {totalCount > 0 ? (
                        <span className="inline-flex items-center gap-1">
                            <CheckSquare2Icon className="size-3" />
                            {doneCount}/{totalCount}
                        </span>
                    ) : (
                        <span />
                    )}
                    {row.totalWorkSec > 0 || isOwnTimerRunning ? (
                        <span className="inline-flex items-center gap-1">
                            <TimerIcon className="size-3" />
                            <TotalWorkLabel totalWorkSec={row.totalWorkSec} activeTimer={isOwnTimerRunning ? activeTimer : null} />
                        </span>
                    ) : null}
                </div>
            </GlassCard>
        </Link>
    );
}

// --- Timer indicator --------------------------------------------------------

// Non-interactive HH:MM:SS pill shown on the tile that owns the active
// timer. Starting / stopping happens on the project detail route — the
// grid is a navigation surface.
function LiveTimerBadge({ startedAt, locale }: { startedAt: string; locale: Locale }) {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, []);
    const elapsed = Math.max(0, Math.floor((now - parseISO(startedAt).getTime()) / 1000));
    return (
        <span
            className="inline-flex shrink-0 items-center gap-1 rounded-md bg-primary/15 px-2 py-0.5 font-mono text-[11px] text-primary"
            aria-label={{ de: 'Timer läuft', en: 'Timer running' }[locale]}
        >
            <span className="size-1.5 rounded-full bg-primary animate-pulse" aria-hidden />
            {formatHms(elapsed)}
        </span>
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

// --- Shared form bits -------------------------------------------------------

function Field({ label, children, fullWidth }: { label: string; children: React.ReactNode; fullWidth?: boolean }) {
    return (
        <label className={fullWidth ? 'flex flex-col gap-1 md:col-span-2' : 'flex flex-col gap-1'}>
            <span className="text-xs font-medium text-muted-foreground">{label}</span>
            {children}
        </label>
    );
}

// Seed-and-Subscribe: the route loader provides the initial `user`, then the
// `userUpdates` subscription replaces it with the same fragment shape on every
// server push. Imperative URQL — not `useSubscription` — for the same reason
// `useChatLiveUpdates.tsx` does: URQL's declarative hook can deliver each event
// more than once under concurrent React. See `docs/architecture/state-synchronization.md`.
function useWorkspaceProjectsPageLiveUser(
    seed: GqlCWorkspaceProjectsPageUserFragment | null | undefined,
): GqlCWorkspaceProjectsPageUserFragment | null | undefined {
    const [user, setUser] = useState(seed);

    const client = useClient();
    useEffect(() => {
        const request = createRequest(WorkspaceProjectsPageUpdatesDocument, {});
        const operation = client.executeSubscription<GqlCWorkspaceProjectsPageUpdatesSubscription>(request);
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
