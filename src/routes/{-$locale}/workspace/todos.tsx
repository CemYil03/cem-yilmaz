import { createFileRoute } from '@tanstack/react-router';
import { format, parseISO } from 'date-fns';
import { CheckSquare2Icon, CircleDotIcon, PencilIcon, PlusIcon, SquareIcon, Trash2Icon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createRequest, useClient, useMutation } from 'urql';
import { pipe, subscribe } from 'wonka';
import { z } from 'zod';
import { Button } from '../../../web/components/base/button';
import { DatePicker } from '../../../web/components/base/date-picker';
import { Input } from '../../../web/components/base/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../web/components/base/select';
import { Textarea } from '../../../web/components/base/textarea';
import { GlassCard } from '../../../web/components/GlassCard';
import { WorkspaceUnauthorized } from '../../../web/components/WorkspaceUnauthorized';
import type {
    GqlCTaskStatus,
    GqlCWorkspaceTodosPageUpdatesSubscription,
    GqlCWorkspaceTodosPageUserFragment,
} from '../../../web/graphql/generated';
import {
    WorkspaceTodoDeleteDocument,
    WorkspaceTodosPageDocument,
    WorkspaceTodosPageUpdatesDocument,
    WorkspaceTodoUpsertDocument,
} from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import { useLocale } from '../../../web/hooks/useLocale';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { cn } from '../../../web/utils/cn';
import { DATE_FNS_LOCALE } from '../../../web/utils/dateFnsLocale';
import type { Locale } from '../../../web/utils/locale';
import { localeFromParam } from '../../../web/utils/locale';

// Workspace todos — the standalone-tasks surface. Everything with
// `projectId IS NULL` lives here: quick captures without a project
// attached, one flat list grouped by status. Project-bound tasks are
// managed on the project detail route and never appear here.
// Admin-only, single-language (no DE/EN pairs); the page is noindex and
// reachable only via the hub tile, the header breadcrumb, or a chat
// deep-link (`/workspace/todos?focus=<taskId>`) — no public entry point.
// See `docs/features/todos.md`.

const TASK_STATUS_ORDER: ReadonlyArray<GqlCTaskStatus> = ['todo', 'doing', 'done'];
const TASK_STATUS_LABELS: Record<GqlCTaskStatus, { de: string; en: string }> = {
    todo: { de: 'Offen', en: 'To do' },
    doing: { de: 'Aktiv', en: 'Doing' },
    done: { de: 'Erledigt', en: 'Done' },
};

const title = { de: 'Todos', en: 'Todos' };
const description = {
    de: 'Aufgaben, die zu keinem Projekt gehören.',
    en: 'Tasks that don’t belong to any project.',
};

// URL state: only `focus` — the personal-assistant chat's deep-link target.
// See `docs/architecture/agent-delegation.md` ("Deep links").
const todosSearchSchema = z.object({
    focus: z.string().optional(),
});

type WorkspaceTodosAdmin = NonNullable<GqlCWorkspaceTodosPageUserFragment['admin']>;
type TaskRow = WorkspaceTodosAdmin['standaloneTasks'][number];

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

    // Server-authoritative state — same seed-and-subscribe pattern the
    // rest of the workspace uses. See
    // `docs/architecture/state-synchronization.md`.
    const user = useWorkspaceTodosPageLiveUser(data.currentSession.user);
    const admin = user?.admin;
    const rows = admin?.standaloneTasks ?? [];

    // Deep-link focus: the chat assistant emits links like
    // `/workspace/todos?focus=<taskId>`. We find the matching
    // `<li data-row-id>` once the list has rendered, scroll it into view,
    // flash it for ~1500ms, then drop the search param so a refresh
    // doesn't re-flash. Missing ids no-op silently.
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
        <main className="px-6 md:px-10 lg:px-16 max-w-6xl mx-auto w-full py-12 leading-relaxed">
            <p className="text-sm text-muted-foreground">{description[locale]}</p>
            <div className="mt-8">
                <TodosSection rows={rows} locale={locale} />
            </div>
        </main>
    );
}

function TodosSection({ rows, locale }: { rows: ReadonlyArray<TaskRow>; locale: Locale }) {
    const [adding, setAdding] = useState(false);
    return (
        <section>
            <div className="flex items-center justify-end gap-4">
                <Button size="sm" variant="outline" onClick={() => setAdding(true)} disabled={adding}>
                    <PlusIcon />
                    {{ de: 'Todo hinzufügen', en: 'Add todo' }[locale]}
                </Button>
            </div>
            {adding ? (
                <TaskForm
                    task={null}
                    locale={locale}
                    nextPosition={rows.filter((t) => t.status === 'todo').length}
                    onClose={() => setAdding(false)}
                    onSaved={() => {
                        setAdding(false);
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
                                    <TaskItem key={task.taskId} task={task} locale={locale} />
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

function TaskItem({ task, locale }: { task: TaskRow; locale: Locale }) {
    const [, upsert] = useMutation(WorkspaceTodoUpsertDocument);
    const [, del] = useMutation(WorkspaceTodoDeleteDocument);
    const [editing, setEditing] = useState(false);

    const nextStatus: Record<GqlCTaskStatus, GqlCTaskStatus> = { todo: 'doing', doing: 'done', done: 'todo' };
    const StatusIcon = task.status === 'done' ? CheckSquare2Icon : task.status === 'doing' ? CircleDotIcon : SquareIcon;

    const onToggle = async () => {
        const target = nextStatus[task.status];
        await upsert({
            taskId: task.taskId,
            title: task.title,
            notes: task.notes ?? null,
            status: target,
            position: task.position,
            dueAt: task.dueAt ?? null,
            completedAt: target === 'done' ? new Date().toISOString() : null,
        });
    };

    if (editing) {
        return (
            <li>
                <TaskForm
                    task={task}
                    locale={locale}
                    nextPosition={task.position}
                    onClose={() => setEditing(false)}
                    onSaved={() => {
                        setEditing(false);
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
                            locale={DATE_FNS_LOCALE[locale]}
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

function Field({ label, children, fullWidth }: { label: string; children: React.ReactNode; fullWidth?: boolean }) {
    return (
        <label className={fullWidth ? 'flex flex-col gap-1 md:col-span-2' : 'flex flex-col gap-1'}>
            <span className="text-xs font-medium text-muted-foreground">{label}</span>
            {children}
        </label>
    );
}

// Seed-and-Subscribe: the route loader provides the initial `user`, then
// the `userUpdates` subscription replaces it with the same fragment shape
// on every server push. Imperative URQL — not `useSubscription` — for the
// same reason `projects.tsx` does: URQL's declarative hook can deliver
// each event more than once under concurrent React. See
// `docs/architecture/state-synchronization.md`.
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
