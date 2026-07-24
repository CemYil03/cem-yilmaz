import { createFileRoute } from '@tanstack/react-router';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { SearchIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { z } from 'zod';
import { Input } from '../../../web/components/base/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../web/components/base/select';
import { GlassCard } from '../../../web/components/GlassCard';
import { WorkspaceUnauthorized } from '../../../web/components/WorkspaceUnauthorized';
import type { GqlCWorkspaceLogsQuery } from '../../../web/graphql/generated';
import { WorkspaceLogsDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import { useLocale } from '../../../web/hooks/useLocale';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { cn } from '../../../web/utils/cn';
import { DATE_FNS_LOCALE } from '../../../web/utils/dateFnsLocale';
import { localeFromParam } from '../../../web/utils/locale';
import type { Locale } from '../../../web/utils/locale';

// Read-only viewer onto the `Logs` table — surfaces every row the server
// wrote via `serverRuntime.log.*`. Authorization is the `User.admin` resolver
// chain on `currentSession.user.admin.logs` (returns null for non-admins);
// the page falls back to `<WorkspaceUnauthorized />` when that chain resolves
// null. The route itself is also `noindex`.
//
// Filters live in the URL so a deep link reproduces the exact view: `level`
// narrows to one of the four levels, `search` is a case-insensitive
// substring match on `message`. The `Limit` arg defaults to 200 server-side;
// the surface is triage, not bulk export, so there is no "Load more"
// button — bumping the cap is a query-param change.
//
// See `docs/architecture/logging.md` and `docs/features/workspace-logs.md`.

const title = { de: 'Logs', en: 'Logs' };
const description = {
    de: 'Server-Logs durchsuchen. Neueste zuerst, gefiltert nach Level oder Text.',
    en: 'Inspect server logs. Newest first, filterable by level or message text.',
};

const LOG_LEVELS = ['error', 'warn', 'info', 'debug'] as const;
type LogLevelValue = (typeof LOG_LEVELS)[number];

const logsSearchSchema = z.object({
    level: z.enum(LOG_LEVELS).optional(),
    search: z.string().optional(),
});

type LogRow = NonNullable<NonNullable<GqlCWorkspaceLogsQuery['sessionFindOne']['user']>['admin']>['adminLogFindMany'][number];

export const Route = createFileRoute('/{-$locale}/workspace/logs')({
    validateSearch: logsSearchSchema,
    loaderDeps: ({ search }) => ({ level: search.level, search: search.search }),
    loader: async ({ deps }) => {
        const data = await routeLoaderGraphqlClient(WorkspaceLogsDocument, {
            level: deps.level ?? null,
            search: deps.search?.trim() ? deps.search.trim() : null,
            limit: null,
        })();
        return { logs: data.sessionFindOne.user?.admin?.adminLogFindMany ?? null };
    },
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: title[locale],
            description: description[locale],
            path: '/workspace/logs',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component: LogsPage,
});

function LogsPage() {
    const locale = useLocale();
    const { logs } = Route.useLoaderData();
    const search = Route.useSearch();
    const navigate = Route.useNavigate();

    // Local state for the search box so typing doesn't refetch on every
    // keystroke. The URL (and therefore the loader) updates after a short
    // debounce; the level dropdown bypasses debounce since it's a discrete pick.
    const [searchDraft, setSearchDraft] = useState(search.search ?? '');
    useEffect(() => {
        const handle = window.setTimeout(() => {
            const next = searchDraft.trim() === '' ? undefined : searchDraft;
            if (next === search.search) return;
            void navigate({ search: (prev) => ({ ...prev, search: next }), replace: true });
        }, 250);
        return () => window.clearTimeout(handle);
    }, [searchDraft, search.search, navigate]);

    if (!logs) return <WorkspaceUnauthorized locale={locale} />;

    return (
        <main className="flex-1 px-6 md:px-10 lg:px-16 max-w-8xl mx-auto w-full pb-16">
            <section className="py-10">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{title[locale]}</h1>
                <p className="mt-2 max-w-2xl text-base text-muted-foreground">{description[locale]}</p>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <Select
                        value={search.level ?? 'all'}
                        onValueChange={(value) => {
                            const next = value === 'all' ? undefined : (value as LogLevelValue);
                            void navigate({ search: (prev) => ({ ...prev, level: next }), replace: true });
                        }}
                    >
                        <SelectTrigger className="w-full sm:w-44">
                            <SelectValue placeholder={{ de: 'Level', en: 'Level' }[locale]} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{{ de: 'Alle Level', en: 'All levels' }[locale]}</SelectItem>
                            {LOG_LEVELS.map((level) => (
                                <SelectItem key={level} value={level}>
                                    {level}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <div className="relative flex-1">
                        <SearchIcon
                            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                            aria-hidden
                        />
                        <Input
                            type="search"
                            value={searchDraft}
                            onChange={(event) => setSearchDraft(event.target.value)}
                            placeholder={{ de: 'Nachricht durchsuchen…', en: 'Search messages…' }[locale]}
                            className="pl-9"
                            aria-label={{ de: 'Nachricht durchsuchen', en: 'Search messages' }[locale]}
                        />
                    </div>
                </div>

                {logs.length === 0 ? (
                    <p className="mt-10 text-sm text-muted-foreground">
                        {{ de: 'Keine Log-Einträge gefunden.', en: 'No log entries match.' }[locale]}
                    </p>
                ) : (
                    <ul className="mt-8 flex flex-col gap-2">
                        {logs.map((row) => (
                            <li key={row.logId}>
                                <LogRowCard row={row} locale={locale} />
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </main>
    );
}

const LEVEL_STYLES: Record<LogLevelValue, string> = {
    error: 'bg-destructive/15 text-destructive',
    warn: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
    info: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
    debug: 'bg-muted text-muted-foreground',
};

function LogRowCard({ row, locale }: { row: LogRow; locale: Locale }) {
    const createdAtIso = row.createdAt as unknown as string;
    const date = parseISO(createdAtIso);
    const relative = formatDistanceToNow(date, { addSuffix: true, locale: DATE_FNS_LOCALE[locale] });
    const absolute = format(date, 'yyyy-MM-dd HH:mm:ss');
    const hasContext = row.context != null;
    return (
        <GlassCard className="px-4 py-3">
            <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className={cn('rounded-full px-2 py-0.5 font-medium uppercase tracking-wide', LEVEL_STYLES[row.level])}>
                        {row.level}
                    </span>
                    <time dateTime={createdAtIso} title={absolute}>
                        {relative}
                    </time>
                    {row.sessionId ? (
                        <span
                            className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]"
                            title={{ de: 'Session', en: 'Session' }[locale] + ': ' + row.sessionId}
                        >
                            {row.sessionId.slice(0, 8)}
                        </span>
                    ) : null}
                </div>
                <p className="break-words text-sm text-foreground">{row.message}</p>
                {hasContext ? (
                    <details className="mt-1 text-xs text-muted-foreground">
                        <summary className="cursor-pointer select-none">{{ de: 'Kontext', en: 'Context' }[locale]}</summary>
                        <pre className="mt-2 overflow-x-auto rounded-md bg-muted/60 p-3 font-mono text-[11px] leading-snug text-foreground">
                            {JSON.stringify(row.context, null, 2)}
                        </pre>
                    </details>
                ) : null}
            </div>
        </GlassCard>
    );
}
