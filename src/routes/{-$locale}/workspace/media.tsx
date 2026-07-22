import { createFileRoute, Link } from '@tanstack/react-router';
import {
    CalendarClockIcon,
    CheckIcon,
    CircleCheckIcon,
    ClapperboardIcon,
    EyeIcon,
    FilmIcon,
    LinkIcon,
    Loader2Icon,
    MoreVerticalIcon,
    PencilIcon,
    PlayCircleIcon,
    PlayIcon,
    PlusIcon,
    PodcastIcon,
    SearchIcon,
    StarIcon,
    Trash2Icon,
    XIcon,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRequest, useClient, useMutation, useQuery } from 'urql';
import { pipe, subscribe } from 'wonka';
import { z } from 'zod';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '../../../web/components/base/alert-dialog';
import { AspectRatio } from '../../../web/components/base/aspect-ratio';
import { Avatar, AvatarFallback, AvatarImage } from '../../../web/components/base/avatar';
import { Button } from '../../../web/components/base/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../web/components/base/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '../../../web/components/base/dropdown-menu';
import { Input } from '../../../web/components/base/input';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '../../../web/components/base/input-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../web/components/base/select';
import { Slider } from '../../../web/components/base/slider';
import { Switch } from '../../../web/components/base/switch';
import { Textarea } from '../../../web/components/base/textarea';
import { ChipInput } from '../../../web/components/ChipInput';
import { DateField } from '../../../web/components/DateField';
import { GlassCard } from '../../../web/components/GlassCard';
import { Reveal } from '../../../web/components/Reveal';
import { WorkspaceUnauthorized } from '../../../web/components/WorkspaceUnauthorized';
import type {
    GqlCAdminMediaTopic,
    GqlCAdminMediaMovieStatus,
    GqlCWorkspaceMediaPageUpdatesSubscription,
    GqlCWorkspaceMediaPageUserFragment,
    GqlCWorkspaceMediaYoutubeSearchQuery,
} from '../../../web/graphql/generated';
import {
    WorkspaceMediaChannelsDeleteDocument,
    WorkspaceMediaChannelsUpsertDocument,
    WorkspaceMediaPageDocument,
    WorkspaceMediaPageUpdatesDocument,
    WorkspaceMediaTmdbSearchDocument,
    WorkspaceMediaTmdbTvSearchDocument,
    WorkspaceMediaYoutubeSearchDocument,
    WorkspaceMoviesAddFromTmdbDocument,
    WorkspaceMoviesDeleteDocument,
    WorkspaceMoviesUpsertDocument,
    WorkspaceShowsAddFromTmdbDocument,
    WorkspaceShowsDeleteDocument,
    WorkspaceShowsUpsertDocument,
} from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import { useLocale } from '../../../web/hooks/useLocale';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { cn } from '../../../web/utils/cn';
import type { Locale } from '../../../web/utils/locale';
import { localeFromParam } from '../../../web/utils/locale';
import { formatMonthYear } from '../../../shared';

// Admin editor for Cem's movie watchlist, TV series library, and favourite
// YouTube / podcast channels. Admin-only, noindex; nothing on this page has a
// public surface. The full read shape (movies + shows + channels) lives in
// the `WorkspaceMediaPageUser` fragment, so the route loader and the
// `userUpdates` subscription deliver the same payload — mutations rely
// entirely on the subscription round-trip to reconcile UI. See
// `docs/architecture/state-synchronization.md` and
// `docs/features/workspace-media.md`.
//
// One page, four tabs. Movies / Series are poster-first grids grouped by
// status; add flow is a sticky TMDB search (movie vs TV endpoints). YouTube
// and Podcasts are separate tabs over the same channel table, filtered by
// platform. Deep-linkable via `?tab=…&focus=<id>` from the personal assistant.

const pageTitle = { de: 'Medien', en: 'Media' };
const pageDescription = {
    de: 'Filme, Serien, YouTube und Podcasts.',
    en: 'Movies, series, YouTube, and podcasts.',
};

const MOVIE_STATUS_ORDER: ReadonlyArray<GqlCAdminMediaMovieStatus> = ['watchlist', 'watching', 'watched', 'dropped'];
const MOVIE_STATUS_LABELS: Record<GqlCAdminMediaMovieStatus, { de: string; en: string }> = {
    watchlist: { de: 'Watchlist', en: 'Watchlist' },
    watching: { de: 'Schaue gerade', en: 'Watching' },
    watched: { de: 'Gesehen', en: 'Watched' },
    dropped: { de: 'Abgebrochen', en: 'Dropped' },
};

// Known clustering vocabulary — surfaced as suggestion chips in the topic
// picker. The `topics` column itself is free-form, so users can also type
// ad-hoc labels; these are just the ones we know match the visitor-facing
// filters on `/workspace/software`.
const KNOWN_TOPICS: ReadonlyArray<GqlCAdminMediaTopic> = [
    'tech',
    'ai',
    'software',
    'gaming',
    'movieCritic',
    'entertainment',
    'comedy',
    'science',
    'business',
    'finance',
    'news',
    'music',
    'sports',
    'lifestyle',
    'education',
];
const TOPIC_LABELS: Record<GqlCAdminMediaTopic, { de: string; en: string }> = {
    tech: { de: 'Tech', en: 'Tech' },
    ai: { de: 'KI', en: 'AI' },
    software: { de: 'Software', en: 'Software' },
    gaming: { de: 'Gaming', en: 'Gaming' },
    movieCritic: { de: 'Filmkritik', en: 'Film Critique' },
    entertainment: { de: 'Unterhaltung', en: 'Entertainment' },
    comedy: { de: 'Comedy', en: 'Comedy' },
    science: { de: 'Wissenschaft', en: 'Science' },
    business: { de: 'Business', en: 'Business' },
    finance: { de: 'Finanzen', en: 'Finance' },
    news: { de: 'News', en: 'News' },
    music: { de: 'Musik', en: 'Music' },
    sports: { de: 'Sport', en: 'Sports' },
    lifestyle: { de: 'Lifestyle', en: 'Lifestyle' },
    education: { de: 'Bildung', en: 'Education' },
};

function topicLabel(topic: string, locale: Locale): string {
    return topic in TOPIC_LABELS ? TOPIC_LABELS[topic as GqlCAdminMediaTopic][locale] : topic;
}

type Tab = 'movies' | 'series' | 'youtube' | 'podcasts';
const TABS = ['movies', 'series', 'youtube', 'podcasts'] as const satisfies ReadonlyArray<Tab>;
const TAB_LABELS: Record<Tab, { de: string; en: string }> = {
    movies: { de: 'Filme', en: 'Movies' },
    series: { de: 'Serien', en: 'Series' },
    youtube: { de: 'YouTube', en: 'YouTube' },
    podcasts: { de: 'Podcasts', en: 'Podcasts' },
};
const TAB_ICONS: Record<Tab, typeof FilmIcon> = {
    movies: FilmIcon,
    series: ClapperboardIcon,
    youtube: PlayIcon,
    podcasts: PodcastIcon,
};

// URL state. `tab` selects the section; absent = movies (the default landing
// view). Legacy `?tab=channels` maps to YouTube. `topic` filters the movies /
// series grids to titles that carry all listed topics (comma-joined). `focus`
// deep-links a specific card/row across tabs — the page scrolls it into view
// and flashes it briefly on land, then drops the param so refresh doesn't
// re-flash. Assistant links point here (see `agentPersonalAssistant` "Deep links").
const mediaSearchSchema = z.object({
    tab: z.preprocess((value) => (value === 'channels' ? 'youtube' : value), z.enum(TABS).optional()),
    topic: z.string().optional(),
    focus: z.string().optional(),
});

type MediaSearch = z.infer<typeof mediaSearchSchema>;

type WorkspaceMediaAdmin = NonNullable<GqlCWorkspaceMediaPageUserFragment['admin']>;
type MediaData = WorkspaceMediaAdmin['adminMediaFindOne'];
type MovieRow = MediaData['adminMediaMovieFindMany'][number];
type ShowRow = MediaData['adminMediaShowFindMany'][number];
type ChannelRow = MediaData['adminMediaChannelFindMany'][number];

export const Route = createFileRoute('/{-$locale}/workspace/media')({
    validateSearch: mediaSearchSchema,
    loader: () => routeLoaderGraphqlClient(WorkspaceMediaPageDocument)(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: pageTitle[locale],
            description: pageDescription[locale],
            path: '/workspace/media',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component: WorkspaceMedia,
});

function WorkspaceMedia() {
    const locale = useLocale();
    const search = Route.useSearch();
    const navigate = Route.useNavigate();
    const data = Route.useLoaderData();
    const tab: Tab = search.tab ?? 'movies';

    // Server-authoritative state: seed once from the route loader, then let
    // the `userUpdates` subscription replace it on every server push. Every
    // media mutation publishes on the user channel already, so we never
    // re-fetch from the client. See `docs/architecture/state-synchronization.md`.
    const user = useWorkspaceMediaPageLiveUser(data.sessionFindOne.user);
    const admin = user?.admin;
    const media = admin?.adminMediaFindOne;

    // Deep-link focus: chat assistant emits links like
    // `/workspace/media?tab=movies&focus=<id>`. Resolve the correct tab from
    // the id when needed, scroll the row/card into view and flash it for
    // ~1500ms, then drop the search param so a refresh doesn't re-flash.
    // Mirrors `/workspace/projects` behaviour.
    useEffect(() => {
        const focusId = search.focus;
        if (!focusId || !media) return;

        const expectedTab: Tab | null = media.adminMediaMovieFindMany.some((m) => m.movieId === focusId)
            ? 'movies'
            : media.adminMediaShowFindMany.some((s) => s.showId === focusId)
              ? 'series'
              : (() => {
                    const channel = media.adminMediaChannelFindMany.find((c) => c.channelId === focusId);
                    if (!channel) return null;
                    return channel.platform === 'podcast' ? 'podcasts' : 'youtube';
                })();

        if (expectedTab && expectedTab !== tab) {
            void navigate({
                search: (prev) => ({
                    ...prev,
                    tab: expectedTab === 'movies' ? undefined : expectedTab,
                }),
                replace: true,
            });
            return;
        }

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
    }, [search.focus, tab, navigate, media]);

    if (!admin) return <WorkspaceUnauthorized locale={locale} />;
    if (!media) return null;

    const youtubeChannels = media.adminMediaChannelFindMany.filter((c) => c.platform === 'youtube');
    const podcastChannels = media.adminMediaChannelFindMany.filter((c) => c.platform === 'podcast');

    return (
        <main className="px-6 md:px-10 lg:px-16 max-w-8xl mx-auto w-full py-12 leading-relaxed">
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
                            to="/{-$locale}/workspace/media"
                            from="/{-$locale}/workspace/media"
                            // Default tab (`movies`) drops the key so the canonical
                            // URL for the landing view has no `?tab=`. Also clear
                            // the `focus` deep-link on switch so a stale row
                            // reference doesn't try to scroll into view on the
                            // other tab.
                            search={(prev) => ({
                                ...prev,
                                tab: t === 'movies' ? undefined : t,
                                focus: undefined,
                            })}
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

            <div className="mt-8">
                {tab === 'movies' ? (
                    <MoviesTab movies={media.adminMediaMovieFindMany} search={search} navigate={navigate} locale={locale} />
                ) : tab === 'series' ? (
                    <SeriesTab shows={media.adminMediaShowFindMany} search={search} navigate={navigate} locale={locale} />
                ) : tab === 'youtube' ? (
                    <YoutubeTab channels={youtubeChannels} locale={locale} />
                ) : (
                    <PodcastsTab channels={podcastChannels} locale={locale} />
                )}
            </div>
        </main>
    );
}

// --- Movies tab -------------------------------------------------------------

function MoviesTab({
    movies,
    search,
    navigate,
    locale,
}: {
    movies: ReadonlyArray<MovieRow>;
    search: MediaSearch;
    navigate: ReturnType<typeof Route.useNavigate>;
    locale: Locale;
}) {
    const [editing, setEditing] = useState<MovieRow | 'new' | null>(null);

    // Active topic filter is comma-joined in the URL. Empty string / missing
    // means no filter. Clicking an already-active chip removes it. Clicking
    // another chip ANDs it into the set (movie must carry every topic).
    const activeTopics = useMemo(() => {
        if (!search.topic) return [] as string[];
        return search.topic
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean);
    }, [search.topic]);

    const setActiveTopics = useCallback(
        (next: ReadonlyArray<string>) => {
            void navigate({
                search: (prev) => ({ ...prev, topic: next.length === 0 ? undefined : next.join(',') }),
                replace: true,
            });
        },
        [navigate],
    );

    const toggleTopic = (topic: string) => {
        if (activeTopics.includes(topic)) {
            setActiveTopics(activeTopics.filter((t) => t !== topic));
        } else {
            setActiveTopics([...activeTopics, topic]);
        }
    };

    // Union of all topics used across movies, with counts. Sorted by count
    // desc so the most-used labels appear first — one glance tells Cem which
    // clusters actually have content behind them.
    const topicChips = useMemo(() => {
        const counts = new Map<string, number>();
        for (const movie of movies) {
            for (const t of movie.topics) counts.set(t, (counts.get(t) ?? 0) + 1);
        }
        return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    }, [movies]);

    const filtered = useMemo(() => {
        if (activeTopics.length === 0) return movies;
        return movies.filter((m) => activeTopics.every((t) => m.topics.includes(t)));
    }, [movies, activeTopics]);

    // Group filtered by status in the fixed section order.
    const grouped = useMemo(() => {
        const buckets: Record<GqlCAdminMediaMovieStatus, MovieRow[]> = {
            watchlist: [],
            watching: [],
            watched: [],
            dropped: [],
        };
        for (const m of filtered) buckets[m.status].push(m);
        return buckets;
    }, [filtered]);

    const searchInputRef = useRef<HTMLInputElement | null>(null);
    const focusSearch = () => searchInputRef.current?.focus();

    return (
        <section>
            <div className="sticky top-0 z-10 pt-1 pb-3">
                <MovieSearchBar inputRef={searchInputRef} onManualAdd={() => setEditing('new')} locale={locale} />
                {topicChips.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                        {topicChips.map(([topic, count]) => {
                            const active = activeTopics.includes(topic);
                            return (
                                <button
                                    key={topic}
                                    type="button"
                                    onClick={() => toggleTopic(topic)}
                                    className={cn(
                                        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                        active
                                            ? 'border-primary bg-primary/15 text-primary'
                                            : 'border-border/60 bg-background/60 text-muted-foreground hover:text-foreground',
                                    )}
                                    aria-pressed={active}
                                >
                                    <span>{topicLabel(topic, locale)}</span>
                                    <span
                                        className={cn('text-[10px] tabular-nums', active ? 'text-primary/80' : 'text-muted-foreground/70')}
                                    >
                                        {count}
                                    </span>
                                    {active ? <XIcon className="size-3" /> : null}
                                </button>
                            );
                        })}
                        {activeTopics.length > 0 ? (
                            <button
                                type="button"
                                onClick={() => setActiveTopics([])}
                                className="ml-1 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                            >
                                {{ de: 'Filter zurücksetzen', en: 'Clear filters' }[locale]}
                            </button>
                        ) : null}
                    </div>
                ) : null}
            </div>

            {movies.length === 0 ? (
                <GlassCard className="mt-6 px-6 py-10 text-center">
                    <FilmIcon className="mx-auto size-6 text-muted-foreground" />
                    <p className="mt-3 text-sm text-muted-foreground">
                        {{ de: 'Noch keine Filme. Suche oben nach einem Titel.', en: 'No movies yet. Search above to add one.' }[locale]}
                    </p>
                    <Button className="mt-4" size="sm" variant="outline" onClick={focusSearch}>
                        <SearchIcon />
                        {{ de: 'Suche fokussieren', en: 'Focus search' }[locale]}
                    </Button>
                </GlassCard>
            ) : filtered.length === 0 ? (
                <GlassCard className="mt-6 px-6 py-10 text-center">
                    <p className="text-sm text-muted-foreground">
                        {{ de: 'Keine Filme passen zu diesem Filter.', en: 'No movies match this filter.' }[locale]}
                    </p>
                    <Button className="mt-4" size="sm" variant="outline" onClick={() => setActiveTopics([])}>
                        {{ de: 'Filter zurücksetzen', en: 'Clear filters' }[locale]}
                    </Button>
                </GlassCard>
            ) : (
                <div className="mt-6 flex flex-col gap-10">
                    {MOVIE_STATUS_ORDER.map((status) =>
                        grouped[status].length === 0 ? null : (
                            <MovieStatusGroup
                                key={status}
                                status={status}
                                movies={grouped[status]}
                                onEdit={(row) => setEditing(row)}
                                locale={locale}
                            />
                        ),
                    )}
                </div>
            )}

            {editing ? (
                <MovieEditDialog movie={editing === 'new' ? null : editing} locale={locale} onClose={() => setEditing(null)} />
            ) : null}
        </section>
    );
}

function MovieStatusGroup({
    status,
    movies,
    onEdit,
    locale,
}: {
    status: GqlCAdminMediaMovieStatus;
    movies: ReadonlyArray<MovieRow>;
    onEdit: (row: MovieRow) => void;
    locale: Locale;
}) {
    return (
        <div>
            <div className="flex items-baseline justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {MOVIE_STATUS_LABELS[status][locale]}
                </h2>
                <span className="text-xs tabular-nums text-muted-foreground/70">{movies.length}</span>
            </div>
            <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8">
                {movies.map((movie, index) => (
                    <Reveal key={movie.movieId} as="li" index={index}>
                        <MovieCard movie={movie} onEdit={() => onEdit(movie)} locale={locale} />
                    </Reveal>
                ))}
            </ul>
        </div>
    );
}

function MovieCard({ movie, onEdit, locale }: { movie: MovieRow; onEdit: () => void; locale: Locale }) {
    const [, upsert] = useMutation(WorkspaceMoviesUpsertDocument);
    const [, del] = useMutation(WorkspaceMoviesDeleteDocument);
    const [confirmingDelete, setConfirmingDelete] = useState(false);

    const changeStatus = async (next: GqlCAdminMediaMovieStatus) => {
        await upsert({
            movies: [
                {
                    movieId: movie.movieId,
                    title: movie.title,
                    tmdbId: movie.tmdbId ?? null,
                    posterUrl: movie.posterUrl ?? null,
                    backdropUrl: movie.backdropUrl ?? null,
                    releaseDate: movie.releaseDate ?? null,
                    runtimeMinutes: movie.runtimeMinutes ?? null,
                    overview: movie.overview ?? null,
                    status: next,
                    rating: movie.rating ?? null,
                    watchedAt: next === 'watched' ? (movie.watchedAt ?? new Date().toISOString()) : (movie.watchedAt ?? null),
                    notes: movie.notes ?? null,
                    topics: [...movie.topics],
                },
            ],
        });
    };

    const releaseYear = movie.releaseDate ? movie.releaseDate.slice(0, 4) : null;

    return (
        <>
            <div
                data-row-id={movie.movieId}
                className="group/movie relative overflow-hidden rounded-md border border-border/50 bg-card/40 shadow-sm transition-shadow hover:shadow-md"
            >
                <button
                    type="button"
                    onClick={onEdit}
                    aria-label={{ de: 'Details bearbeiten', en: 'Edit details' }[locale]}
                    className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-t-md"
                >
                    <AspectRatio ratio={2 / 3} className="bg-muted">
                        {movie.posterUrl ? (
                            <img src={movie.posterUrl} alt={movie.title} loading="lazy" className="h-full w-full object-cover" />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center text-muted-foreground/70">
                                <FilmIcon className="size-5" />
                            </div>
                        )}
                    </AspectRatio>
                </button>

                {movie.status === 'watched' && typeof movie.rating === 'number' ? (
                    <div className="pointer-events-none absolute top-1.5 right-1.5 inline-flex items-center gap-0.5 rounded-full bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white shadow">
                        <StarIcon className="size-2.5" />
                        <span className="tabular-nums">{movie.rating}</span>
                    </div>
                ) : null}

                <div className="absolute top-1 left-1">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                size="icon-xs"
                                variant="ghost"
                                className="size-6 bg-black/60 text-white hover:bg-black/80 hover:text-white"
                                aria-label={{ de: 'Aktionen', en: 'Actions' }[locale]}
                            >
                                <MoreVerticalIcon className="size-3.5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                            {movie.status !== 'watching' ? (
                                <DropdownMenuItem onClick={() => void changeStatus('watching')}>
                                    <EyeIcon />
                                    {{ de: 'Als "schaue gerade" markieren', en: 'Mark as watching' }[locale]}
                                </DropdownMenuItem>
                            ) : null}
                            {movie.status !== 'watched' ? (
                                <DropdownMenuItem onClick={() => void changeStatus('watched')}>
                                    <CheckIcon />
                                    {{ de: 'Als gesehen markieren', en: 'Mark as watched' }[locale]}
                                </DropdownMenuItem>
                            ) : null}
                            {movie.status !== 'watchlist' ? (
                                <DropdownMenuItem onClick={() => void changeStatus('watchlist')}>
                                    <PlusIcon />
                                    {{ de: 'Zurück in die Watchlist', en: 'Back to watchlist' }[locale]}
                                </DropdownMenuItem>
                            ) : null}
                            {movie.status !== 'dropped' ? (
                                <DropdownMenuItem onClick={() => void changeStatus('dropped')}>
                                    <XIcon />
                                    {{ de: 'Abbrechen', en: 'Move to dropped' }[locale]}
                                </DropdownMenuItem>
                            ) : null}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={onEdit}>
                                <PencilIcon />
                                {{ de: 'Bearbeiten', en: 'Edit' }[locale]}
                            </DropdownMenuItem>
                            <DropdownMenuItem variant="destructive" onClick={() => setConfirmingDelete(true)}>
                                <Trash2Icon />
                                {{ de: 'Löschen', en: 'Delete' }[locale]}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <div className="px-1.5 py-1.5">
                    <div className="line-clamp-2 text-[11px] font-medium leading-snug">{movie.title}</div>
                    {releaseYear ? <div className="mt-0.5 text-[10px] text-muted-foreground">{releaseYear}</div> : null}
                </div>
            </div>

            <AlertDialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{{ de: 'Film löschen?', en: 'Delete movie?' }[locale]}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {
                                {
                                    de: `„${movie.title}" wird dauerhaft entfernt.`,
                                    en: `"${movie.title}" will be permanently removed.`,
                                }[locale]
                            }
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{{ de: 'Abbrechen', en: 'Cancel' }[locale]}</AlertDialogCancel>
                        <AlertDialogAction
                            variant="destructive"
                            onClick={async () => {
                                await del({ movieIds: [movie.movieId] });
                                setConfirmingDelete(false);
                            }}
                        >
                            {{ de: 'Löschen', en: 'Delete' }[locale]}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

// TMDB search bar: debounced 300ms, fires `tmdbSearch` once the trimmed
// query stabilises. Suggestions dropdown mirrors a Radix popover but is a
// plain absolutely-positioned panel below the input so keyboard arrow-key
// navigation stays inside the input's focus. Enter on a highlighted result
// adds via `adminMediaMoviesAddFromTmdb`; Escape clears the query. A subtle "Add
// manually" link at the foot opens the empty edit dialog.
function MovieSearchBar({
    inputRef,
    onManualAdd,
    locale,
}: {
    inputRef: React.RefObject<HTMLInputElement | null>;
    onManualAdd: () => void;
    locale: Locale;
}) {
    const [query, setQuery] = useState('');
    const [debounced, setDebounced] = useState('');
    const [highlighted, setHighlighted] = useState(0);
    const [open, setOpen] = useState(false);
    const [, addFromTmdb] = useMutation(WorkspaceMoviesAddFromTmdbDocument);
    const containerRef = useRef<HTMLDivElement | null>(null);

    // 300ms debounce. Trimmed-empty pauses the query entirely so we never
    // issue an empty TMDB request or cache noise.
    useEffect(() => {
        const trimmed = query.trim();
        if (trimmed.length === 0) {
            setDebounced('');
            return;
        }
        const id = window.setTimeout(() => setDebounced(trimmed), 300);
        return () => window.clearTimeout(id);
    }, [query]);

    const [{ data, fetching }] = useQuery({
        query: WorkspaceMediaTmdbSearchDocument,
        variables: { query: debounced },
        pause: !debounced,
        requestPolicy: 'network-only',
    });
    const results = data?.sessionFindOne.user?.admin?.adminMediaFindOne.adminMediaTmdbFindMany ?? [];

    // Close the panel on outside click. Focus/blur alone wouldn't cover
    // dropdown-item clicks, so we listen at the document level.
    useEffect(() => {
        if (!open) return;
        const onDown = (event: MouseEvent) => {
            if (!containerRef.current) return;
            if (!containerRef.current.contains(event.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, [open]);

    // Clamp the highlight into range whenever the results list changes.
    useEffect(() => {
        setHighlighted(0);
    }, [debounced, results.length]);

    const addResult = async (tmdbId: number) => {
        await addFromTmdb({ inputs: [{ tmdbId, status: 'watchlist' }] });
        setQuery('');
        setDebounced('');
        setOpen(false);
    };

    return (
        <div ref={containerRef} className="relative">
            <InputGroup className="bg-background/70 backdrop-blur-sm">
                <InputGroupAddon>
                    <SearchIcon className="text-muted-foreground" />
                </InputGroupAddon>
                <InputGroupInput
                    ref={inputRef}
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setOpen(true);
                    }}
                    onFocus={() => setOpen(true)}
                    onKeyDown={(e) => {
                        if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            setHighlighted((h) => Math.min(h + 1, Math.max(results.length - 1, 0)));
                        } else if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            setHighlighted((h) => Math.max(h - 1, 0));
                        } else if (e.key === 'Enter') {
                            const hit = results[highlighted];
                            if (hit) {
                                e.preventDefault();
                                void addResult(hit.tmdbId);
                            }
                        } else if (e.key === 'Escape') {
                            setQuery('');
                            setDebounced('');
                            setOpen(false);
                        }
                    }}
                    placeholder={{ de: 'Film suchen…', en: 'Search a movie…' }[locale]}
                    aria-label={{ de: 'Film-Suche', en: 'AdminMediaMovie search' }[locale]}
                    role="combobox"
                    aria-expanded={open}
                    aria-controls="tmdb-suggestions"
                />
                {fetching && debounced ? (
                    <InputGroupAddon align="inline-end">
                        <Loader2Icon className="animate-spin text-muted-foreground" />
                    </InputGroupAddon>
                ) : query ? (
                    <InputGroupAddon align="inline-end">
                        <InputGroupButton
                            size="icon-xs"
                            onClick={() => {
                                setQuery('');
                                setDebounced('');
                                setOpen(false);
                                inputRef.current?.focus();
                            }}
                            aria-label={{ de: 'Suche leeren', en: 'Clear search' }[locale]}
                        >
                            <XIcon />
                        </InputGroupButton>
                    </InputGroupAddon>
                ) : null}
            </InputGroup>

            {open && debounced ? (
                <div
                    id="tmdb-suggestions"
                    role="listbox"
                    className="absolute left-0 right-0 z-20 mt-1 max-h-96 overflow-auto rounded-md border border-border/60 bg-popover shadow-lg"
                >
                    {fetching && results.length === 0 ? (
                        <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
                            <Loader2Icon className="size-4 animate-spin" />
                            {{ de: 'Suche läuft…', en: 'Searching…' }[locale]}
                        </div>
                    ) : results.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-muted-foreground">{{ de: 'Keine Treffer.', en: 'No results.' }[locale]}</div>
                    ) : (
                        <ul>
                            {results.map((hit, index) => {
                                const year = hit.releaseDate ? hit.releaseDate.slice(0, 4) : null;
                                const active = index === highlighted;
                                return (
                                    <li key={hit.tmdbId}>
                                        <button
                                            type="button"
                                            role="option"
                                            aria-selected={active}
                                            onMouseEnter={() => setHighlighted(index)}
                                            onClick={() => void addResult(hit.tmdbId)}
                                            className={cn(
                                                'flex w-full items-start gap-3 px-3 py-2 text-left text-sm transition-colors',
                                                active ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50',
                                            )}
                                        >
                                            <div className="w-10 shrink-0 overflow-hidden rounded bg-muted">
                                                <AspectRatio ratio={2 / 3}>
                                                    {hit.posterUrl ? (
                                                        <img
                                                            src={hit.posterUrl}
                                                            alt=""
                                                            loading="lazy"
                                                            className="h-full w-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="flex h-full w-full items-center justify-center text-muted-foreground/70">
                                                            <FilmIcon className="size-4" />
                                                        </div>
                                                    )}
                                                </AspectRatio>
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="truncate font-medium">{hit.title}</div>
                                                {year ? <div className="text-xs text-muted-foreground">{year}</div> : null}
                                                {hit.overview ? (
                                                    <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground/80">
                                                        {hit.overview}
                                                    </div>
                                                ) : null}
                                            </div>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                    <div className="border-t border-border/50 px-3 py-2 text-xs">
                        <button
                            type="button"
                            onClick={() => {
                                setOpen(false);
                                onManualAdd();
                            }}
                            className="text-muted-foreground underline underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                        >
                            {{ de: 'Manuell hinzufügen', en: 'Add manually' }[locale]}
                        </button>
                    </div>
                </div>
            ) : null}
        </div>
    );
}

// AdminMediaMovie edit dialog: single centered modal used for both "new" (movie=null)
// and "edit existing" states. Every field maps 1:1 to `AdminMediaMovieInput` — the
// server hydrates from TMDB on `adminMediaMoviesAddFromTmdb`, so the poster/backdrop
// URL fields land here already populated and stay editable but rarely
// touched.
function MovieEditDialog({ movie, locale, onClose }: { movie: MovieRow | null; locale: Locale; onClose: () => void }) {
    const [, upsert] = useMutation(WorkspaceMoviesUpsertDocument);
    const [, del] = useMutation(WorkspaceMoviesDeleteDocument);
    const [busy, setBusy] = useState(false);
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const [form, setForm] = useState({
        title: movie?.title ?? '',
        posterUrl: movie?.posterUrl ?? '',
        backdropUrl: movie?.backdropUrl ?? '',
        releaseDate: movie?.releaseDate ?? '',
        runtimeMinutes: movie?.runtimeMinutes != null ? String(movie.runtimeMinutes) : '',
        overview: movie?.overview ?? '',
        status: movie?.status ?? ('watchlist' as GqlCAdminMediaMovieStatus),
        rating: movie?.rating ?? 0,
        watchedAt: movie?.watchedAt ?? '',
        notes: movie?.notes ?? '',
        topics: movie?.topics ?? [],
    });

    return (
        <>
            <Dialog open onOpenChange={(next) => (!next ? onClose() : null)}>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {movie
                                ? { de: 'Film bearbeiten', en: 'Edit movie' }[locale]
                                : { de: 'Film manuell hinzufügen', en: 'Add movie manually' }[locale]}
                        </DialogTitle>
                        <DialogDescription>
                            {movie?.tmdbId
                                ? { de: `TMDB-ID: ${movie.tmdbId}`, en: `TMDB ID: ${movie.tmdbId}` }[locale]
                                : { de: 'Alle Felder sind editierbar.', en: 'Every field is editable.' }[locale]}
                        </DialogDescription>
                    </DialogHeader>

                    <form
                        onSubmit={async (event) => {
                            event.preventDefault();
                            setBusy(true);
                            await upsert({
                                movies: [
                                    {
                                        movieId: movie?.movieId ?? null,
                                        title: form.title,
                                        tmdbId: movie?.tmdbId ?? null,
                                        posterUrl: form.posterUrl || null,
                                        backdropUrl: form.backdropUrl || null,
                                        releaseDate: form.releaseDate || null,
                                        runtimeMinutes: form.runtimeMinutes ? parseInt(form.runtimeMinutes, 10) : null,
                                        overview: form.overview || null,
                                        status: form.status,
                                        rating: form.rating > 0 ? form.rating : null,
                                        watchedAt: form.watchedAt || null,
                                        notes: form.notes || null,
                                        topics: [...form.topics],
                                    },
                                ],
                            });
                            setBusy(false);
                            onClose();
                        }}
                        className="grid gap-4 sm:grid-cols-[auto_1fr]"
                    >
                        <div className="w-32 shrink-0">
                            <AspectRatio ratio={2 / 3} className="overflow-hidden rounded-md bg-muted">
                                {form.posterUrl ? (
                                    <img src={form.posterUrl} alt={form.title} className="h-full w-full object-cover" />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center text-muted-foreground/70">
                                        <FilmIcon className="size-6" />
                                    </div>
                                )}
                            </AspectRatio>
                        </div>

                        <div className="flex flex-col gap-3">
                            <Field label={{ de: 'Titel', en: 'Title' }[locale]}>
                                <Input
                                    value={form.title}
                                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                                    required
                                    autoFocus
                                />
                            </Field>
                            <div className="grid grid-cols-2 gap-3">
                                <Field label={{ de: 'Status', en: 'Status' }[locale]}>
                                    <Select
                                        value={form.status}
                                        onValueChange={(value) => setForm({ ...form, status: value as GqlCAdminMediaMovieStatus })}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {MOVIE_STATUS_ORDER.map((s) => (
                                                <SelectItem key={s} value={s}>
                                                    {MOVIE_STATUS_LABELS[s][locale]}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </Field>
                                <Field label={{ de: 'Laufzeit (Min.)', en: 'Runtime (min)' }[locale]}>
                                    <Input
                                        type="number"
                                        min={0}
                                        value={form.runtimeMinutes}
                                        onChange={(e) => setForm({ ...form, runtimeMinutes: e.target.value })}
                                    />
                                </Field>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <Field label={{ de: 'Erscheinungsdatum', en: 'Release date' }[locale]}>
                                    <DateField
                                        value={form.releaseDate}
                                        onChange={(next) => setForm({ ...form, releaseDate: next })}
                                        locale={locale}
                                    />
                                </Field>
                                <Field label={{ de: 'Gesehen am', en: 'Watched on' }[locale]}>
                                    <DateField
                                        value={form.watchedAt ? form.watchedAt.slice(0, 10) : ''}
                                        onChange={(next) => setForm({ ...form, watchedAt: next ? `${next}T00:00:00.000Z` : '' })}
                                        locale={locale}
                                    />
                                </Field>
                            </div>
                            <Field
                                label={{ de: `Bewertung (${form.rating || '–'} / 10)`, en: `Rating (${form.rating || '–'} / 10)` }[locale]}
                            >
                                <div className="flex items-center gap-3">
                                    <Slider
                                        min={0}
                                        max={10}
                                        step={1}
                                        value={[form.rating]}
                                        onValueChange={(values) => setForm({ ...form, rating: values[0] ?? 0 })}
                                        className="flex-1"
                                    />
                                    {form.rating > 0 ? (
                                        <Button
                                            type="button"
                                            size="icon-xs"
                                            variant="ghost"
                                            aria-label={{ de: 'Bewertung entfernen', en: 'Clear rating' }[locale]}
                                            onClick={() => setForm({ ...form, rating: 0 })}
                                        >
                                            <XIcon />
                                        </Button>
                                    ) : null}
                                </div>
                            </Field>
                            <Field label={{ de: 'Kurzbeschreibung', en: 'Overview' }[locale]}>
                                <Textarea rows={3} value={form.overview} onChange={(e) => setForm({ ...form, overview: e.target.value })} />
                            </Field>
                            <Field label={{ de: 'Notizen', en: 'Notes' }[locale]}>
                                <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                            </Field>
                            <Field label={{ de: 'Themen', en: 'Topics' }[locale]}>
                                <TopicChipInput
                                    value={form.topics}
                                    onChange={(next) => setForm({ ...form, topics: next })}
                                    locale={locale}
                                />
                            </Field>
                            <Field label={{ de: 'Poster-URL', en: 'Poster URL' }[locale]}>
                                <Input
                                    value={form.posterUrl}
                                    onChange={(e) => setForm({ ...form, posterUrl: e.target.value })}
                                    type="url"
                                    inputMode="url"
                                />
                            </Field>
                        </div>

                        <DialogFooter className="sm:col-span-2">
                            {movie ? (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setConfirmingDelete(true)}
                                    disabled={busy}
                                    className="mr-auto text-destructive hover:text-destructive"
                                >
                                    <Trash2Icon />
                                    {{ de: 'Löschen', en: 'Delete' }[locale]}
                                </Button>
                            ) : null}
                            <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
                                {{ de: 'Abbrechen', en: 'Cancel' }[locale]}
                            </Button>
                            <Button type="submit" disabled={busy}>
                                {{ de: 'Speichern', en: 'Save' }[locale]}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {movie ? (
                <AlertDialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>{{ de: 'Film löschen?', en: 'Delete movie?' }[locale]}</AlertDialogTitle>
                            <AlertDialogDescription>
                                {
                                    {
                                        de: `„${movie.title}" wird dauerhaft entfernt.`,
                                        en: `"${movie.title}" will be permanently removed.`,
                                    }[locale]
                                }
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>{{ de: 'Abbrechen', en: 'Cancel' }[locale]}</AlertDialogCancel>
                            <AlertDialogAction
                                variant="destructive"
                                onClick={async () => {
                                    await del({ movieIds: [movie.movieId] });
                                    setConfirmingDelete(false);
                                    onClose();
                                }}
                            >
                                {{ de: 'Löschen', en: 'Delete' }[locale]}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            ) : null}
        </>
    );
}

// --- Series tab -------------------------------------------------------------

function SeriesTab({
    shows,
    search,
    navigate,
    locale,
}: {
    shows: ReadonlyArray<ShowRow>;
    search: MediaSearch;
    navigate: ReturnType<typeof Route.useNavigate>;
    locale: Locale;
}) {
    const [editing, setEditing] = useState<ShowRow | 'new' | null>(null);

    const activeTopics = useMemo(() => {
        if (!search.topic) return [] as string[];
        return search.topic
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean);
    }, [search.topic]);

    const setActiveTopics = (next: string[]) => {
        void navigate({
            search: (prev) => ({ ...prev, topic: next.length === 0 ? undefined : next.join(',') }),
            replace: true,
        });
    };

    const toggleTopic = (topic: string) => {
        setActiveTopics(activeTopics.includes(topic) ? activeTopics.filter((t) => t !== topic) : [...activeTopics, topic]);
    };

    const topicChips = useMemo(() => {
        const counts = new Map<string, number>();
        for (const show of shows) {
            for (const topic of show.topics) counts.set(topic, (counts.get(topic) ?? 0) + 1);
        }
        return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    }, [shows]);

    const filtered = useMemo(() => {
        if (activeTopics.length === 0) return shows;
        return shows.filter((show) => activeTopics.every((topic) => show.topics.includes(topic)));
    }, [shows, activeTopics]);

    const grouped = useMemo(() => {
        const buckets: Record<GqlCAdminMediaMovieStatus, ShowRow[]> = {
            watchlist: [],
            watching: [],
            watched: [],
            dropped: [],
        };
        for (const show of filtered) buckets[show.status].push(show);
        return buckets;
    }, [filtered]);

    const searchInputRef = useRef<HTMLInputElement | null>(null);
    const focusSearch = () => searchInputRef.current?.focus();

    return (
        <section>
            <div className="sticky top-0 z-10 pt-1 pb-3">
                <ShowSearchBar inputRef={searchInputRef} onManualAdd={() => setEditing('new')} locale={locale} />
                {topicChips.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                        {topicChips.map(([topic, count]) => {
                            const active = activeTopics.includes(topic);
                            return (
                                <button
                                    key={topic}
                                    type="button"
                                    onClick={() => toggleTopic(topic)}
                                    className={cn(
                                        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                        active
                                            ? 'border-primary bg-primary/15 text-primary'
                                            : 'border-border/60 bg-background/60 text-muted-foreground hover:text-foreground',
                                    )}
                                    aria-pressed={active}
                                >
                                    <span>{topicLabel(topic, locale)}</span>
                                    <span
                                        className={cn('text-[10px] tabular-nums', active ? 'text-primary/80' : 'text-muted-foreground/70')}
                                    >
                                        {count}
                                    </span>
                                    {active ? <XIcon className="size-3" /> : null}
                                </button>
                            );
                        })}
                        {activeTopics.length > 0 ? (
                            <button
                                type="button"
                                onClick={() => setActiveTopics([])}
                                className="ml-1 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                            >
                                {{ de: 'Filter zurücksetzen', en: 'Clear filters' }[locale]}
                            </button>
                        ) : null}
                    </div>
                ) : null}
            </div>

            {shows.length === 0 ? (
                <GlassCard className="mt-6 px-6 py-10 text-center">
                    <ClapperboardIcon className="mx-auto size-6 text-muted-foreground" />
                    <p className="mt-3 text-sm text-muted-foreground">
                        {{ de: 'Noch keine Serien. Suche oben nach einem Titel.', en: 'No series yet. Search above to add one.' }[locale]}
                    </p>
                    <Button className="mt-4" size="sm" variant="outline" onClick={focusSearch}>
                        <SearchIcon />
                        {{ de: 'Suche fokussieren', en: 'Focus search' }[locale]}
                    </Button>
                </GlassCard>
            ) : filtered.length === 0 ? (
                <GlassCard className="mt-6 px-6 py-10 text-center">
                    <p className="text-sm text-muted-foreground">
                        {{ de: 'Keine Serien passen zu diesem Filter.', en: 'No series match this filter.' }[locale]}
                    </p>
                    <Button className="mt-4" size="sm" variant="outline" onClick={() => setActiveTopics([])}>
                        {{ de: 'Filter zurücksetzen', en: 'Clear filters' }[locale]}
                    </Button>
                </GlassCard>
            ) : (
                <div className="mt-6 flex flex-col gap-10">
                    {MOVIE_STATUS_ORDER.map((status) =>
                        grouped[status].length === 0 ? null : (
                            <ShowStatusGroup
                                key={status}
                                status={status}
                                shows={grouped[status]}
                                onEdit={(row) => setEditing(row)}
                                locale={locale}
                            />
                        ),
                    )}
                </div>
            )}

            {editing ? <ShowEditDialog show={editing === 'new' ? null : editing} locale={locale} onClose={() => setEditing(null)} /> : null}
        </section>
    );
}

function ShowStatusGroup({
    status,
    shows,
    onEdit,
    locale,
}: {
    status: GqlCAdminMediaMovieStatus;
    shows: ReadonlyArray<ShowRow>;
    onEdit: (row: ShowRow) => void;
    locale: Locale;
}) {
    return (
        <div>
            <div className="flex items-baseline justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {MOVIE_STATUS_LABELS[status][locale]}
                </h2>
                <span className="text-xs tabular-nums text-muted-foreground/70">{shows.length}</span>
            </div>
            <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8">
                {shows.map((show, index) => (
                    <Reveal key={show.showId} as="li" index={index}>
                        <ShowCard show={show} onEdit={() => onEdit(show)} locale={locale} />
                    </Reveal>
                ))}
            </ul>
        </div>
    );
}

function showNextSeasonLabel(show: ShowRow, locale: Locale): string | null {
    if (show.isCompleted) return { de: 'Abgeschlossen', en: 'Completed' }[locale];
    if (show.nextSeasonReleaseDate) {
        return formatMonthYear(show.nextSeasonReleaseDate, { locale });
    }
    if (show.nextSeasonReleaseRough) return show.nextSeasonReleaseRough;
    return null;
}

function ShowCard({ show, onEdit, locale }: { show: ShowRow; onEdit: () => void; locale: Locale }) {
    const [, upsert] = useMutation(WorkspaceShowsUpsertDocument);
    const [, del] = useMutation(WorkspaceShowsDeleteDocument);
    const [confirmingDelete, setConfirmingDelete] = useState(false);

    const changeStatus = async (next: GqlCAdminMediaMovieStatus) => {
        await upsert({
            shows: [
                {
                    showId: show.showId,
                    title: show.title,
                    tmdbId: show.tmdbId ?? null,
                    posterUrl: show.posterUrl ?? null,
                    backdropUrl: show.backdropUrl ?? null,
                    firstAirDate: show.firstAirDate ?? null,
                    overview: show.overview ?? null,
                    status: next,
                    rating: show.rating ?? null,
                    notes: show.notes ?? null,
                    topics: [...show.topics],
                    isCompleted: show.isCompleted,
                    nextSeasonReleaseDate: show.nextSeasonReleaseDate ?? null,
                    nextSeasonReleaseRough: show.nextSeasonReleaseRough ?? null,
                },
            ],
        });
    };

    const airYear = show.firstAirDate ? show.firstAirDate.slice(0, 4) : null;
    const nextLabel = showNextSeasonLabel(show, locale);

    return (
        <>
            <div
                data-row-id={show.showId}
                className="group/show relative overflow-hidden rounded-md border border-border/50 bg-card/40 shadow-sm transition-shadow hover:shadow-md"
            >
                <button
                    type="button"
                    onClick={onEdit}
                    aria-label={{ de: 'Details bearbeiten', en: 'Edit details' }[locale]}
                    className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-t-md"
                >
                    <AspectRatio ratio={2 / 3} className="bg-muted">
                        {show.posterUrl ? (
                            <img src={show.posterUrl} alt={show.title} loading="lazy" className="h-full w-full object-cover" />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center text-muted-foreground/70">
                                <ClapperboardIcon className="size-5" />
                            </div>
                        )}
                    </AspectRatio>
                </button>

                {typeof show.rating === 'number' ? (
                    <div className="pointer-events-none absolute top-1.5 right-1.5 inline-flex items-center gap-0.5 rounded-full bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white shadow">
                        <StarIcon className="size-2.5" />
                        <span className="tabular-nums">{show.rating}</span>
                    </div>
                ) : null}

                {nextLabel ? (
                    <div
                        className={cn(
                            'pointer-events-none absolute bottom-10 left-1 right-1 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-medium text-white shadow',
                            show.isCompleted ? 'bg-emerald-700/85' : 'bg-black/70',
                        )}
                    >
                        {show.isCompleted ? (
                            <CircleCheckIcon className="size-2.5 shrink-0" />
                        ) : (
                            <CalendarClockIcon className="size-2.5 shrink-0" />
                        )}
                        <span className="truncate">{nextLabel}</span>
                    </div>
                ) : null}

                <div className="absolute top-1 left-1">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                size="icon-xs"
                                variant="ghost"
                                className="size-6 bg-black/60 text-white hover:bg-black/80 hover:text-white"
                                aria-label={{ de: 'Aktionen', en: 'Actions' }[locale]}
                            >
                                <MoreVerticalIcon className="size-3.5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                            {show.status !== 'watching' ? (
                                <DropdownMenuItem onSelect={() => void changeStatus('watching')}>
                                    <PlayCircleIcon />
                                    {{ de: 'Schaue gerade', en: 'Mark watching' }[locale]}
                                </DropdownMenuItem>
                            ) : null}
                            {show.status !== 'watchlist' ? (
                                <DropdownMenuItem onSelect={() => void changeStatus('watchlist')}>
                                    <EyeIcon />
                                    {{ de: 'Zur Watchlist', en: 'Move to watchlist' }[locale]}
                                </DropdownMenuItem>
                            ) : null}
                            {show.status !== 'watched' ? (
                                <DropdownMenuItem onSelect={() => void changeStatus('watched')}>
                                    <CheckIcon />
                                    {{ de: 'Als gesehen', en: 'Mark watched' }[locale]}
                                </DropdownMenuItem>
                            ) : null}
                            {show.status !== 'dropped' ? (
                                <DropdownMenuItem onSelect={() => void changeStatus('dropped')}>
                                    <XIcon />
                                    {{ de: 'Abgebrochen', en: 'Move to dropped' }[locale]}
                                </DropdownMenuItem>
                            ) : null}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={onEdit}>
                                <PencilIcon />
                                {{ de: 'Bearbeiten', en: 'Edit' }[locale]}
                            </DropdownMenuItem>
                            <DropdownMenuItem variant="destructive" onSelect={() => setConfirmingDelete(true)}>
                                <Trash2Icon />
                                {{ de: 'Löschen', en: 'Delete' }[locale]}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <button type="button" onClick={onEdit} className="block w-full px-1.5 py-1.5 text-left">
                    <div className="line-clamp-2 text-[11px] font-medium leading-snug">{show.title}</div>
                    {airYear ? <div className="mt-0.5 text-[10px] text-muted-foreground">{airYear}</div> : null}
                </button>
            </div>

            <AlertDialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{{ de: 'Serie löschen?', en: 'Delete series?' }[locale]}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {
                                {
                                    de: `„${show.title}" wird dauerhaft entfernt.`,
                                    en: `"${show.title}" will be permanently removed.`,
                                }[locale]
                            }
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{{ de: 'Abbrechen', en: 'Cancel' }[locale]}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => void del({ showIds: [show.showId] })}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {{ de: 'Löschen', en: 'Delete' }[locale]}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

function ShowSearchBar({
    inputRef,
    onManualAdd,
    locale,
}: {
    inputRef: React.RefObject<HTMLInputElement | null>;
    onManualAdd: () => void;
    locale: Locale;
}) {
    const [query, setQuery] = useState('');
    const [debounced, setDebounced] = useState('');
    const [highlighted, setHighlighted] = useState(0);
    const [open, setOpen] = useState(false);
    const [, addFromTmdb] = useMutation(WorkspaceShowsAddFromTmdbDocument);
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const trimmed = query.trim();
        if (trimmed.length === 0) {
            setDebounced('');
            return;
        }
        const id = window.setTimeout(() => setDebounced(trimmed), 300);
        return () => window.clearTimeout(id);
    }, [query]);

    const [{ data, fetching }] = useQuery({
        query: WorkspaceMediaTmdbTvSearchDocument,
        variables: { query: debounced },
        pause: !debounced,
        requestPolicy: 'network-only',
    });
    const results = data?.sessionFindOne.user?.admin?.adminMediaFindOne.adminMediaTmdbTvFindMany ?? [];

    useEffect(() => {
        if (!open) return;
        const onDown = (event: MouseEvent) => {
            if (!containerRef.current) return;
            if (!containerRef.current.contains(event.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, [open]);

    useEffect(() => {
        setHighlighted(0);
    }, [debounced, results.length]);

    const addResult = async (tmdbId: number) => {
        await addFromTmdb({ inputs: [{ tmdbId, status: 'watchlist' }] });
        setQuery('');
        setDebounced('');
        setOpen(false);
    };

    return (
        <div ref={containerRef} className="relative">
            <InputGroup className="bg-background/70 backdrop-blur-sm">
                <InputGroupAddon>
                    <SearchIcon className="text-muted-foreground" />
                </InputGroupAddon>
                <InputGroupInput
                    ref={inputRef}
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setOpen(true);
                    }}
                    onFocus={() => setOpen(true)}
                    onKeyDown={(e) => {
                        if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            setHighlighted((h) => Math.min(h + 1, Math.max(results.length - 1, 0)));
                        } else if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            setHighlighted((h) => Math.max(h - 1, 0));
                        } else if (e.key === 'Enter') {
                            const hit = results[highlighted];
                            if (hit) {
                                e.preventDefault();
                                void addResult(hit.tmdbId);
                            }
                        } else if (e.key === 'Escape') {
                            setQuery('');
                            setDebounced('');
                            setOpen(false);
                        }
                    }}
                    placeholder={{ de: 'Serie suchen…', en: 'Search a series…' }[locale]}
                    aria-label={{ de: 'Serien-Suche', en: 'Series search' }[locale]}
                    role="combobox"
                    aria-expanded={open}
                    aria-controls="tmdb-tv-suggestions"
                />
                {fetching && debounced ? (
                    <InputGroupAddon align="inline-end">
                        <Loader2Icon className="animate-spin text-muted-foreground" />
                    </InputGroupAddon>
                ) : query ? (
                    <InputGroupAddon align="inline-end">
                        <InputGroupButton
                            size="icon-xs"
                            onClick={() => {
                                setQuery('');
                                setDebounced('');
                                setOpen(false);
                                inputRef.current?.focus();
                            }}
                            aria-label={{ de: 'Suche leeren', en: 'Clear search' }[locale]}
                        >
                            <XIcon />
                        </InputGroupButton>
                    </InputGroupAddon>
                ) : null}
            </InputGroup>

            {open && debounced ? (
                <div
                    id="tmdb-tv-suggestions"
                    role="listbox"
                    className="absolute left-0 right-0 z-20 mt-1 max-h-96 overflow-auto rounded-md border border-border/60 bg-popover shadow-lg"
                >
                    {fetching && results.length === 0 ? (
                        <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
                            <Loader2Icon className="size-4 animate-spin" />
                            {{ de: 'Suche läuft…', en: 'Searching…' }[locale]}
                        </div>
                    ) : results.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-muted-foreground">{{ de: 'Keine Treffer.', en: 'No results.' }[locale]}</div>
                    ) : (
                        <ul>
                            {results.map((hit, index) => {
                                const year = hit.firstAirDate ? hit.firstAirDate.slice(0, 4) : null;
                                const active = index === highlighted;
                                return (
                                    <li key={hit.tmdbId}>
                                        <button
                                            type="button"
                                            role="option"
                                            aria-selected={active}
                                            onMouseEnter={() => setHighlighted(index)}
                                            onClick={() => void addResult(hit.tmdbId)}
                                            className={cn(
                                                'flex w-full items-start gap-3 px-3 py-2 text-left text-sm transition-colors',
                                                active ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50',
                                            )}
                                        >
                                            <div className="w-10 shrink-0 overflow-hidden rounded bg-muted">
                                                <AspectRatio ratio={2 / 3}>
                                                    {hit.posterUrl ? (
                                                        <img
                                                            src={hit.posterUrl}
                                                            alt=""
                                                            loading="lazy"
                                                            className="h-full w-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="flex h-full w-full items-center justify-center text-muted-foreground/70">
                                                            <ClapperboardIcon className="size-4" />
                                                        </div>
                                                    )}
                                                </AspectRatio>
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="truncate font-medium">{hit.title}</div>
                                                {year ? <div className="text-xs text-muted-foreground">{year}</div> : null}
                                                {hit.overview ? (
                                                    <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground/80">
                                                        {hit.overview}
                                                    </div>
                                                ) : null}
                                            </div>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                    <div className="border-t border-border/50 px-3 py-2 text-xs">
                        <button
                            type="button"
                            onClick={() => {
                                setOpen(false);
                                onManualAdd();
                            }}
                            className="text-muted-foreground underline underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                        >
                            {{ de: 'Manuell hinzufügen', en: 'Add manually' }[locale]}
                        </button>
                    </div>
                </div>
            ) : null}
        </div>
    );
}

function ShowEditDialog({ show, locale, onClose }: { show: ShowRow | null; locale: Locale; onClose: () => void }) {
    const [, upsert] = useMutation(WorkspaceShowsUpsertDocument);
    const [, del] = useMutation(WorkspaceShowsDeleteDocument);
    const [busy, setBusy] = useState(false);
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const [form, setForm] = useState({
        title: show?.title ?? '',
        posterUrl: show?.posterUrl ?? '',
        backdropUrl: show?.backdropUrl ?? '',
        firstAirDate: show?.firstAirDate ?? '',
        overview: show?.overview ?? '',
        status: show?.status ?? ('watchlist' as GqlCAdminMediaMovieStatus),
        rating: show?.rating ?? 0,
        notes: show?.notes ?? '',
        topics: show?.topics ?? [],
        isCompleted: show?.isCompleted ?? false,
        nextSeasonReleaseDate: show?.nextSeasonReleaseDate ?? '',
        nextSeasonReleaseRough: show?.nextSeasonReleaseRough ?? '',
    });

    return (
        <>
            <Dialog open onOpenChange={(next) => (!next ? onClose() : null)}>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {show
                                ? { de: 'Serie bearbeiten', en: 'Edit series' }[locale]
                                : { de: 'Serie manuell hinzufügen', en: 'Add series manually' }[locale]}
                        </DialogTitle>
                        <DialogDescription>
                            {show?.tmdbId
                                ? { de: `TMDB-ID: ${show.tmdbId}`, en: `TMDB ID: ${show.tmdbId}` }[locale]
                                : { de: 'Alle Felder sind editierbar.', en: 'Every field is editable.' }[locale]}
                        </DialogDescription>
                    </DialogHeader>

                    <form
                        onSubmit={async (event) => {
                            event.preventDefault();
                            setBusy(true);
                            await upsert({
                                shows: [
                                    {
                                        showId: show?.showId ?? null,
                                        title: form.title,
                                        tmdbId: show?.tmdbId ?? null,
                                        posterUrl: form.posterUrl || null,
                                        backdropUrl: form.backdropUrl || null,
                                        firstAirDate: form.firstAirDate || null,
                                        overview: form.overview || null,
                                        status: form.status,
                                        rating: form.rating > 0 ? form.rating : null,
                                        notes: form.notes || null,
                                        topics: [...form.topics],
                                        isCompleted: form.isCompleted,
                                        nextSeasonReleaseDate: form.isCompleted ? null : form.nextSeasonReleaseDate || null,
                                        nextSeasonReleaseRough: form.isCompleted ? null : form.nextSeasonReleaseRough || null,
                                    },
                                ],
                            });
                            setBusy(false);
                            onClose();
                        }}
                        className="grid gap-4 sm:grid-cols-[auto_1fr]"
                    >
                        <div className="w-32 shrink-0">
                            <AspectRatio ratio={2 / 3} className="overflow-hidden rounded-md bg-muted">
                                {form.posterUrl ? (
                                    <img src={form.posterUrl} alt={form.title} className="h-full w-full object-cover" />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center text-muted-foreground/70">
                                        <ClapperboardIcon className="size-6" />
                                    </div>
                                )}
                            </AspectRatio>
                        </div>

                        <div className="flex flex-col gap-3">
                            <Field label={{ de: 'Titel', en: 'Title' }[locale]}>
                                <Input
                                    value={form.title}
                                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                                    required
                                    autoFocus
                                />
                            </Field>
                            <div className="grid grid-cols-2 gap-3">
                                <Field label={{ de: 'Status', en: 'Status' }[locale]}>
                                    <Select
                                        value={form.status}
                                        onValueChange={(value) => setForm({ ...form, status: value as GqlCAdminMediaMovieStatus })}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {MOVIE_STATUS_ORDER.map((s) => (
                                                <SelectItem key={s} value={s}>
                                                    {MOVIE_STATUS_LABELS[s][locale]}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </Field>
                                <Field label={{ de: 'Erstausstrahlung', en: 'First aired' }[locale]}>
                                    <DateField
                                        value={form.firstAirDate}
                                        onChange={(next) => setForm({ ...form, firstAirDate: next })}
                                        locale={locale}
                                    />
                                </Field>
                            </div>

                            <div className="flex items-center justify-between gap-3 rounded-md border border-border/60 px-3 py-2">
                                <div className="min-w-0">
                                    <div className="text-sm font-medium">
                                        {{ de: 'Serie abgeschlossen', en: 'Series completed' }[locale]}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {
                                            {
                                                de: 'Keine weiteren Staffeln erwartet.',
                                                en: 'No further seasons expected.',
                                            }[locale]
                                        }
                                    </div>
                                </div>
                                <Switch
                                    checked={form.isCompleted}
                                    onCheckedChange={(checked) =>
                                        setForm({
                                            ...form,
                                            isCompleted: checked,
                                            ...(checked ? { nextSeasonReleaseDate: '', nextSeasonReleaseRough: '' } : {}),
                                        })
                                    }
                                    aria-label={{ de: 'Serie abgeschlossen', en: 'Series completed' }[locale]}
                                />
                            </div>

                            {!form.isCompleted ? (
                                <div className="grid grid-cols-2 gap-3">
                                    <Field label={{ de: 'Nächste Staffel (Datum)', en: 'Next season (date)' }[locale]}>
                                        <DateField
                                            value={form.nextSeasonReleaseDate}
                                            onChange={(next) => setForm({ ...form, nextSeasonReleaseDate: next })}
                                            locale={locale}
                                        />
                                    </Field>
                                    <Field label={{ de: 'Nächste Staffel (ungefähr)', en: 'Next season (rough)' }[locale]}>
                                        <Input
                                            value={form.nextSeasonReleaseRough}
                                            onChange={(e) => setForm({ ...form, nextSeasonReleaseRough: e.target.value })}
                                            placeholder={{ de: 'z. B. Herbst 2026', en: 'e.g. Fall 2026' }[locale]}
                                        />
                                    </Field>
                                </div>
                            ) : null}

                            <Field
                                label={{ de: `Bewertung (${form.rating || '–'} / 10)`, en: `Rating (${form.rating || '–'} / 10)` }[locale]}
                            >
                                <div className="flex items-center gap-3">
                                    <Slider
                                        min={0}
                                        max={10}
                                        step={1}
                                        value={[form.rating]}
                                        onValueChange={(values) => setForm({ ...form, rating: values[0] ?? 0 })}
                                        className="flex-1"
                                    />
                                    {form.rating > 0 ? (
                                        <Button
                                            type="button"
                                            size="icon-xs"
                                            variant="ghost"
                                            aria-label={{ de: 'Bewertung entfernen', en: 'Clear rating' }[locale]}
                                            onClick={() => setForm({ ...form, rating: 0 })}
                                        >
                                            <XIcon />
                                        </Button>
                                    ) : null}
                                </div>
                            </Field>
                            <Field label={{ de: 'Kurzbeschreibung', en: 'Overview' }[locale]}>
                                <Textarea rows={3} value={form.overview} onChange={(e) => setForm({ ...form, overview: e.target.value })} />
                            </Field>
                            <Field label={{ de: 'Notizen', en: 'Notes' }[locale]}>
                                <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                            </Field>
                            <Field label={{ de: 'Themen', en: 'Topics' }[locale]}>
                                <TopicChipInput
                                    value={form.topics}
                                    onChange={(next) => setForm({ ...form, topics: next })}
                                    locale={locale}
                                />
                            </Field>
                            <Field label={{ de: 'Poster-URL', en: 'Poster URL' }[locale]}>
                                <Input
                                    value={form.posterUrl}
                                    onChange={(e) => setForm({ ...form, posterUrl: e.target.value })}
                                    type="url"
                                    inputMode="url"
                                />
                            </Field>
                        </div>

                        <DialogFooter className="sm:col-span-2">
                            {show ? (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setConfirmingDelete(true)}
                                    disabled={busy}
                                    className="mr-auto text-destructive hover:text-destructive"
                                >
                                    <Trash2Icon />
                                    {{ de: 'Löschen', en: 'Delete' }[locale]}
                                </Button>
                            ) : null}
                            <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
                                {{ de: 'Abbrechen', en: 'Cancel' }[locale]}
                            </Button>
                            <Button type="submit" disabled={busy}>
                                {{ de: 'Speichern', en: 'Save' }[locale]}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {show ? (
                <AlertDialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>{{ de: 'Serie löschen?', en: 'Delete series?' }[locale]}</AlertDialogTitle>
                            <AlertDialogDescription>
                                {
                                    {
                                        de: `„${show.title}" wird dauerhaft entfernt.`,
                                        en: `"${show.title}" will be permanently removed.`,
                                    }[locale]
                                }
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>{{ de: 'Abbrechen', en: 'Cancel' }[locale]}</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={async () => {
                                    await del({ showIds: [show.showId] });
                                    onClose();
                                }}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                                {{ de: 'Löschen', en: 'Delete' }[locale]}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            ) : null}
        </>
    );
}

// --- YouTube tab ------------------------------------------------------------

function YoutubeTab({ channels, locale }: { channels: ReadonlyArray<ChannelRow>; locale: Locale }) {
    const [editing, setEditing] = useState<ChannelRow | null>(null);
    const [activeTopics, setActiveTopics] = useState<string[]>([]);
    const searchInputRef = useRef<HTMLInputElement | null>(null);
    const focusSearch = () => searchInputRef.current?.focus();

    const topicChips = useMemo(() => {
        const counts = new Map<string, number>();
        for (const channel of channels) {
            for (const topic of channel.topics) counts.set(topic, (counts.get(topic) ?? 0) + 1);
        }
        return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    }, [channels]);

    const filtered = useMemo(() => {
        const rows =
            activeTopics.length === 0
                ? channels
                : channels.filter((channel) => activeTopics.every((topic) => channel.topics.includes(topic)));
        return rows.slice().sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name));
    }, [channels, activeTopics]);

    const toggleTopic = (topic: string) => {
        setActiveTopics((prev) => (prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]));
    };

    return (
        <section>
            <div className="sticky top-0 z-10 pt-1 pb-3">
                <ChannelSearchBar inputRef={searchInputRef} locale={locale} />
                {topicChips.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                        {topicChips.map(([topic, count]) => {
                            const active = activeTopics.includes(topic);
                            return (
                                <button
                                    key={topic}
                                    type="button"
                                    onClick={() => toggleTopic(topic)}
                                    className={cn(
                                        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                        active
                                            ? 'border-primary bg-primary/15 text-primary'
                                            : 'border-border/60 bg-background/60 text-muted-foreground hover:text-foreground',
                                    )}
                                    aria-pressed={active}
                                >
                                    <span>{topicLabel(topic, locale)}</span>
                                    <span
                                        className={cn('text-[10px] tabular-nums', active ? 'text-primary/80' : 'text-muted-foreground/70')}
                                    >
                                        {count}
                                    </span>
                                    {active ? <XIcon className="size-3" /> : null}
                                </button>
                            );
                        })}
                        {activeTopics.length > 0 ? (
                            <button
                                type="button"
                                onClick={() => setActiveTopics([])}
                                className="ml-1 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                            >
                                {{ de: 'Filter zurücksetzen', en: 'Clear filters' }[locale]}
                            </button>
                        ) : null}
                    </div>
                ) : null}
            </div>

            {channels.length === 0 ? (
                <GlassCard className="mt-6 px-6 py-10 text-center">
                    <PlayIcon className="mx-auto size-6 text-muted-foreground" />
                    <p className="mt-3 text-sm text-muted-foreground">
                        {
                            {
                                de: 'Noch keine YouTube-Kanäle. Suche oben nach einem Kanal.',
                                en: 'No YouTube channels yet. Search above to add one.',
                            }[locale]
                        }
                    </p>
                    <Button className="mt-4" size="sm" variant="outline" onClick={focusSearch}>
                        <SearchIcon />
                        {{ de: 'Suche fokussieren', en: 'Focus search' }[locale]}
                    </Button>
                </GlassCard>
            ) : filtered.length === 0 ? (
                <GlassCard className="mt-6 px-6 py-10 text-center">
                    <p className="text-sm text-muted-foreground">
                        {{ de: 'Keine Kanäle passen zu diesem Filter.', en: 'No channels match this filter.' }[locale]}
                    </p>
                    <Button className="mt-4" size="sm" variant="outline" onClick={() => setActiveTopics([])}>
                        {{ de: 'Filter zurücksetzen', en: 'Clear filters' }[locale]}
                    </Button>
                </GlassCard>
            ) : (
                <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filtered.map((channel, index) => (
                        <Reveal key={channel.channelId} as="li" index={index}>
                            <ChannelCard channel={channel} onEdit={() => setEditing(channel)} locale={locale} />
                        </Reveal>
                    ))}
                </ul>
            )}

            {editing ? <ChannelEditDialog channel={editing} platform="youtube" locale={locale} onClose={() => setEditing(null)} /> : null}
        </section>
    );
}

// --- Podcasts tab -----------------------------------------------------------

function PodcastsTab({ channels, locale }: { channels: ReadonlyArray<ChannelRow>; locale: Locale }) {
    const [editing, setEditing] = useState<ChannelRow | 'new' | null>(null);
    const [activeTopics, setActiveTopics] = useState<string[]>([]);

    const topicChips = useMemo(() => {
        const counts = new Map<string, number>();
        for (const channel of channels) {
            for (const topic of channel.topics) counts.set(topic, (counts.get(topic) ?? 0) + 1);
        }
        return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    }, [channels]);

    const filtered = useMemo(() => {
        const rows =
            activeTopics.length === 0
                ? channels
                : channels.filter((channel) => activeTopics.every((topic) => channel.topics.includes(topic)));
        return rows.slice().sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name));
    }, [channels, activeTopics]);

    const toggleTopic = (topic: string) => {
        setActiveTopics((prev) => (prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]));
    };

    return (
        <section>
            <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 pt-1 pb-3">
                <div className="min-w-0 flex-1">
                    {topicChips.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                            {topicChips.map(([topic, count]) => {
                                const active = activeTopics.includes(topic);
                                return (
                                    <button
                                        key={topic}
                                        type="button"
                                        onClick={() => toggleTopic(topic)}
                                        className={cn(
                                            'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                            active
                                                ? 'border-primary bg-primary/15 text-primary'
                                                : 'border-border/60 bg-background/60 text-muted-foreground hover:text-foreground',
                                        )}
                                        aria-pressed={active}
                                    >
                                        <span>{topicLabel(topic, locale)}</span>
                                        <span
                                            className={cn(
                                                'text-[10px] tabular-nums',
                                                active ? 'text-primary/80' : 'text-muted-foreground/70',
                                            )}
                                        >
                                            {count}
                                        </span>
                                        {active ? <XIcon className="size-3" /> : null}
                                    </button>
                                );
                            })}
                            {activeTopics.length > 0 ? (
                                <button
                                    type="button"
                                    onClick={() => setActiveTopics([])}
                                    className="ml-1 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                                >
                                    {{ de: 'Filter zurücksetzen', en: 'Clear filters' }[locale]}
                                </button>
                            ) : null}
                        </div>
                    ) : null}
                </div>
                <Button size="sm" onClick={() => setEditing('new')}>
                    <PlusIcon />
                    {{ de: 'Podcast hinzufügen', en: 'Add podcast' }[locale]}
                </Button>
            </div>

            {channels.length === 0 ? (
                <GlassCard className="mt-6 px-6 py-10 text-center">
                    <PodcastIcon className="mx-auto size-6 text-muted-foreground" />
                    <p className="mt-3 text-sm text-muted-foreground">{{ de: 'Noch keine Podcasts.', en: 'No podcasts yet.' }[locale]}</p>
                    <Button className="mt-4" size="sm" variant="outline" onClick={() => setEditing('new')}>
                        <PlusIcon />
                        {{ de: 'Podcast hinzufügen', en: 'Add podcast' }[locale]}
                    </Button>
                </GlassCard>
            ) : filtered.length === 0 ? (
                <GlassCard className="mt-6 px-6 py-10 text-center">
                    <p className="text-sm text-muted-foreground">
                        {{ de: 'Keine Podcasts passen zu diesem Filter.', en: 'No podcasts match this filter.' }[locale]}
                    </p>
                    <Button className="mt-4" size="sm" variant="outline" onClick={() => setActiveTopics([])}>
                        {{ de: 'Filter zurücksetzen', en: 'Clear filters' }[locale]}
                    </Button>
                </GlassCard>
            ) : (
                <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filtered.map((channel, index) => (
                        <Reveal key={channel.channelId} as="li" index={index}>
                            <ChannelCard channel={channel} onEdit={() => setEditing(channel)} locale={locale} />
                        </Reveal>
                    ))}
                </ul>
            )}

            {editing ? (
                <ChannelEditDialog
                    channel={editing === 'new' ? null : editing}
                    platform="podcast"
                    locale={locale}
                    onClose={() => setEditing(null)}
                />
            ) : null}
        </section>
    );
}

function ChannelCard({ channel, onEdit, locale }: { channel: ChannelRow; onEdit: () => void; locale: Locale }) {
    const firstNoteLine = channel.notes?.split('\n')[0]?.trim() ?? '';
    const openLabel = {
        de: channel.platform === 'podcast' ? 'Podcast öffnen' : 'Kanal öffnen',
        en: channel.platform === 'podcast' ? 'Open podcast' : 'Open channel',
    };

    return (
        <div
            data-row-id={channel.channelId}
            className="group/channel relative flex h-full items-center gap-4 overflow-hidden rounded-xl border border-border/50 bg-card/40 p-3.5 shadow-sm transition-shadow hover:shadow-md"
        >
            <button
                type="button"
                onClick={onEdit}
                className="flex min-w-0 flex-1 items-center gap-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
            >
                <Avatar className="size-16 shrink-0 rounded-full text-base">
                    {channel.avatarUrl ? <AvatarImage src={channel.avatarUrl} alt={channel.name} /> : null}
                    <AvatarFallback className="text-sm font-medium">{channel.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium leading-snug">{channel.name}</div>
                    {channel.handle ? <div className="mt-0.5 truncate text-xs text-muted-foreground">{channel.handle}</div> : null}
                    {channel.topics.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-1">
                            {channel.topics.slice(0, 3).map((topic) => (
                                <span
                                    key={topic}
                                    className="inline-flex items-center rounded-full border border-border/50 bg-background/50 px-2 py-0.5 text-[10px] text-muted-foreground"
                                >
                                    {topicLabel(topic, locale)}
                                </span>
                            ))}
                            {channel.topics.length > 3 ? (
                                <span className="text-[10px] text-muted-foreground/70">+{channel.topics.length - 3}</span>
                            ) : null}
                        </div>
                    ) : null}
                    {firstNoteLine ? <p className="mt-1.5 line-clamp-1 text-xs text-muted-foreground/90">{firstNoteLine}</p> : null}
                </div>
            </button>
            <a
                href={channel.url}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground opacity-70 transition-colors hover:bg-accent hover:text-foreground hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={openLabel[locale]}
                title={openLabel[locale]}
            >
                <LinkIcon className="size-4" />
            </a>
        </div>
    );
}

// Edit / create dialog for YouTube channels and podcasts. YouTube identity is
// usually created via `ChannelSearchBar`; podcasts are added manually here.
// Platform is fixed by the calling tab — Twitch / other are not surfaced.
function ChannelEditDialog({
    channel,
    platform,
    locale,
    onClose,
}: {
    channel: ChannelRow | null;
    platform: 'youtube' | 'podcast';
    locale: Locale;
    onClose: () => void;
}) {
    const [, upsert] = useMutation(WorkspaceMediaChannelsUpsertDocument);
    const [, del] = useMutation(WorkspaceMediaChannelsDeleteDocument);
    const [busy, setBusy] = useState(false);
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const isNew = channel === null;
    const [form, setForm] = useState({
        name: channel?.name ?? '',
        url: channel?.url ?? '',
        handle: channel?.handle ?? '',
        avatarUrl: channel?.avatarUrl ?? '',
        description: channel?.description ?? '',
        notes: channel?.notes ?? '',
        topics: channel?.topics ?? ([] as string[]),
    });

    const title =
        platform === 'podcast'
            ? isNew
                ? { de: 'Podcast hinzufügen', en: 'Add podcast' }
                : { de: 'Podcast bearbeiten', en: 'Edit podcast' }
            : { de: 'Kanal bearbeiten', en: 'Edit channel' };

    return (
        <>
            <Dialog open onOpenChange={(next) => (!next ? onClose() : null)}>
                <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{title[locale]}</DialogTitle>
                    </DialogHeader>

                    <form
                        onSubmit={async (event) => {
                            event.preventDefault();
                            setBusy(true);
                            await upsert({
                                mediaChannels: [
                                    {
                                        channelId: channel?.channelId,
                                        name: form.name,
                                        platform,
                                        url: form.url,
                                        handle: form.handle || null,
                                        avatarUrl: form.avatarUrl || null,
                                        description: form.description || null,
                                        notes: form.notes || null,
                                        topics: [...form.topics],
                                    },
                                ],
                            });
                            setBusy(false);
                            onClose();
                        }}
                        className="flex flex-col gap-3"
                    >
                        <Field label={{ de: 'Name', en: 'Name' }[locale]}>
                            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required autoFocus />
                        </Field>
                        <Field label={{ de: 'Handle (optional)', en: 'Handle (optional)' }[locale]}>
                            <Input value={form.handle} onChange={(e) => setForm({ ...form, handle: e.target.value })} />
                        </Field>
                        <Field label={{ de: 'URL', en: 'URL' }[locale]}>
                            <Input
                                type="url"
                                inputMode="url"
                                value={form.url}
                                onChange={(e) => setForm({ ...form, url: e.target.value })}
                                required
                            />
                        </Field>
                        <Field label={{ de: 'Avatar-URL (optional)', en: 'Avatar URL (optional)' }[locale]}>
                            <Input value={form.avatarUrl} onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })} />
                        </Field>
                        <Field label={{ de: 'Beschreibung', en: 'Description' }[locale]}>
                            <Textarea
                                rows={2}
                                value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                            />
                        </Field>
                        <Field label={{ de: 'Notizen', en: 'Notes' }[locale]}>
                            <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                        </Field>
                        <Field label={{ de: 'Themen', en: 'Topics' }[locale]}>
                            <TopicChipInput value={form.topics} onChange={(next) => setForm({ ...form, topics: next })} locale={locale} />
                        </Field>

                        <DialogFooter>
                            {!isNew ? (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setConfirmingDelete(true)}
                                    disabled={busy}
                                    className="mr-auto text-destructive hover:text-destructive"
                                >
                                    <Trash2Icon />
                                    {{ de: 'Löschen', en: 'Delete' }[locale]}
                                </Button>
                            ) : null}
                            <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
                                {{ de: 'Abbrechen', en: 'Cancel' }[locale]}
                            </Button>
                            <Button type="submit" disabled={busy}>
                                {isNew ? { de: 'Hinzufügen', en: 'Add' }[locale] : { de: 'Speichern', en: 'Save' }[locale]}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {channel ? (
                <AlertDialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>
                                {
                                    {
                                        de: platform === 'podcast' ? 'Podcast löschen?' : 'Kanal löschen?',
                                        en: platform === 'podcast' ? 'Delete podcast?' : 'Delete channel?',
                                    }[locale]
                                }
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                {
                                    {
                                        de: `„${channel.name}" wird dauerhaft entfernt.`,
                                        en: `"${channel.name}" will be permanently removed.`,
                                    }[locale]
                                }
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>{{ de: 'Abbrechen', en: 'Cancel' }[locale]}</AlertDialogCancel>
                            <AlertDialogAction
                                variant="destructive"
                                onClick={async () => {
                                    await del({ channelIds: [channel.channelId] });
                                    setConfirmingDelete(false);
                                    onClose();
                                }}
                            >
                                {{ de: 'Löschen', en: 'Delete' }[locale]}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            ) : null}
        </>
    );
}

// --- Channel search (inline add) --------------------------------------------

// Sticky search-to-add bar for the YouTube tab. Mirrors the movies / series
// TMDB search shape (300ms debounce, `pause` on empty, `network-only`,
// keyboard nav, outside-click closes) but hits the YouTube Data API. Picking
// a suggestion creates the channel directly via `adminMediaChannelsUpsert` — the
// identity fields (name / url / handle / avatar / description) come from the
// API; topics / notes are edited afterwards on the card. There is no manual
// identity entry on the YouTube add path.
function ChannelSearchBar({ inputRef, locale }: { inputRef: React.RefObject<HTMLInputElement | null>; locale: Locale }) {
    const [query, setQuery] = useState('');
    const [debounced, setDebounced] = useState('');
    const [highlighted, setHighlighted] = useState(0);
    const [open, setOpen] = useState(false);
    const [, upsert] = useMutation(WorkspaceMediaChannelsUpsertDocument);
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const trimmed = query.trim();
        if (trimmed.length === 0) {
            setDebounced('');
            return;
        }
        const id = window.setTimeout(() => setDebounced(trimmed), 300);
        return () => window.clearTimeout(id);
    }, [query]);

    const [{ data, fetching }] = useQuery({
        query: WorkspaceMediaYoutubeSearchDocument,
        variables: { query: debounced },
        pause: !debounced,
        requestPolicy: 'network-only',
    });
    const results = data?.sessionFindOne.user?.admin?.adminMediaFindOne.adminMediaYoutubeFindMany ?? [];

    useEffect(() => {
        if (!open) return;
        const onDown = (event: MouseEvent) => {
            if (!containerRef.current) return;
            if (!containerRef.current.contains(event.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, [open]);

    useEffect(() => {
        setHighlighted(0);
    }, [debounced, results.length]);

    const addResult = async (hit: YoutubeSearchHit) => {
        await upsert({
            mediaChannels: [
                {
                    channelId: null,
                    name: hit.title,
                    platform: 'youtube',
                    url: hit.canonicalUrl,
                    handle: hit.handle ?? null,
                    avatarUrl: hit.avatarUrl ?? null,
                    description: hit.description ?? null,
                    notes: null,
                    topics: [],
                },
            ],
        });
        setQuery('');
        setDebounced('');
        setOpen(false);
    };

    return (
        <div ref={containerRef} className="relative">
            <InputGroup className="bg-background/70 backdrop-blur-sm">
                <InputGroupAddon>
                    <SearchIcon className="text-muted-foreground" />
                </InputGroupAddon>
                <InputGroupInput
                    ref={inputRef}
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setOpen(true);
                    }}
                    onFocus={() => setOpen(true)}
                    onKeyDown={(e) => {
                        if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            setHighlighted((h) => Math.min(h + 1, Math.max(results.length - 1, 0)));
                        } else if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            setHighlighted((h) => Math.max(h - 1, 0));
                        } else if (e.key === 'Enter') {
                            const hit = results[highlighted];
                            if (hit) {
                                e.preventDefault();
                                void addResult(hit);
                            }
                        } else if (e.key === 'Escape') {
                            setQuery('');
                            setDebounced('');
                            setOpen(false);
                        }
                    }}
                    placeholder={{ de: 'YouTube-Kanal suchen…', en: 'Search a YouTube channel…' }[locale]}
                    aria-label={{ de: 'Kanal-Suche', en: 'Channel search' }[locale]}
                    role="combobox"
                    aria-expanded={open}
                    aria-controls="youtube-suggestions"
                />
                {fetching && debounced ? (
                    <InputGroupAddon align="inline-end">
                        <Loader2Icon className="animate-spin text-muted-foreground" />
                    </InputGroupAddon>
                ) : query ? (
                    <InputGroupAddon align="inline-end">
                        <InputGroupButton
                            size="icon-xs"
                            onClick={() => {
                                setQuery('');
                                setDebounced('');
                                setOpen(false);
                                inputRef.current?.focus();
                            }}
                            aria-label={{ de: 'Suche leeren', en: 'Clear search' }[locale]}
                        >
                            <XIcon />
                        </InputGroupButton>
                    </InputGroupAddon>
                ) : null}
            </InputGroup>

            {open && debounced ? (
                <div
                    id="youtube-suggestions"
                    role="listbox"
                    className="absolute left-0 right-0 z-20 mt-1 max-h-96 overflow-auto rounded-md border border-border/60 bg-popover shadow-lg"
                >
                    {fetching && results.length === 0 ? (
                        <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
                            <Loader2Icon className="size-4 animate-spin" />
                            {{ de: 'Suche läuft…', en: 'Searching…' }[locale]}
                        </div>
                    ) : results.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-muted-foreground">{{ de: 'Keine Treffer.', en: 'No results.' }[locale]}</div>
                    ) : (
                        <ul>
                            {results.map((hit, index) => {
                                const active = index === highlighted;
                                const subs = formatSubscriberCount(hit.subscriberCount);
                                return (
                                    <li key={hit.channelId}>
                                        <button
                                            type="button"
                                            role="option"
                                            aria-selected={active}
                                            onMouseEnter={() => setHighlighted(index)}
                                            onClick={() => void addResult(hit)}
                                            className={cn(
                                                'flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors',
                                                active ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50',
                                            )}
                                        >
                                            <Avatar size="default" className="shrink-0">
                                                {hit.avatarUrl ? <AvatarImage src={hit.avatarUrl} alt={hit.title} /> : null}
                                                <AvatarFallback>{hit.title.slice(0, 2).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0 flex-1">
                                                <div className="truncate font-medium">{hit.title}</div>
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    {hit.handle ? <span className="truncate">{hit.handle}</span> : null}
                                                    {hit.handle && subs ? <span>·</span> : null}
                                                    {subs ? (
                                                        <span className="tabular-nums">
                                                            {
                                                                {
                                                                    de: `${subs} Abonnenten`,
                                                                    en: `${subs} subscribers`,
                                                                }[locale]
                                                            }
                                                        </span>
                                                    ) : null}
                                                </div>
                                            </div>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            ) : null}
        </div>
    );
}

// --- YouTube channel search -------------------------------------------------

// Formats a raw subscriber count into the human-friendly `12.3M` / `1.2K`
// shape shown next to each suggestion row. Nullish counts render as an
// empty string so the caller can just concatenate.
function formatSubscriberCount(count: number | null | undefined): string {
    if (count === null || count === undefined) return '';
    if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
    if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
    return String(count);
}

type YoutubeSearchHit = NonNullable<
    NonNullable<GqlCWorkspaceMediaYoutubeSearchQuery['sessionFindOne']['user']>['admin']
>['adminMediaFindOne']['adminMediaYoutubeFindMany'][number];

// --- Topic chip input -------------------------------------------------------

// Topic-flavoured `ChipInput`: suggestion chips surface the `AdminMediaTopic` enum
// values not yet selected, and stored values render through their localized
// label. Ad-hoc strings are allowed (the DB column is `text[]`), so the enum is
// a hint, not a constraint.
function TopicChipInput({ value, onChange, locale }: { value: ReadonlyArray<string>; onChange: (next: string[]) => void; locale: Locale }) {
    return (
        <ChipInput
            value={value}
            onChange={onChange}
            suggestions={KNOWN_TOPICS}
            renderLabel={(topic) => topicLabel(topic, locale)}
            removeLabel={{ de: 'Thema entfernen', en: 'Remove topic' }[locale]}
            placeholder={{ de: 'Thema hinzufügen…', en: 'Add a topic…' }[locale]}
            morePlaceholder={{ de: 'Weiteres…', en: 'Another…' }[locale]}
        />
    );
}

// --- Shared bits ------------------------------------------------------------

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">{label}</span>
            {children}
        </label>
    );
}

// Seed-and-Subscribe: the route loader provides the initial `user`, then the
// `userUpdates` subscription replaces it with the same fragment shape on
// every server push. Imperative URQL — not `useSubscription` — because
// URQL's declarative hook can deliver each event more than once under
// concurrent React. Mirrors `useWorkspaceCvPageLiveUser`.
function useWorkspaceMediaPageLiveUser(
    seed: GqlCWorkspaceMediaPageUserFragment | null | undefined,
): GqlCWorkspaceMediaPageUserFragment | null | undefined {
    const [user, setUser] = useState(seed);

    const client = useClient();
    useEffect(() => {
        const request = createRequest(WorkspaceMediaPageUpdatesDocument, {});
        const operation = client.executeSubscription<GqlCWorkspaceMediaPageUpdatesSubscription>(request);
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
