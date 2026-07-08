import { createFileRoute, Link } from '@tanstack/react-router';
import { format, parseISO } from 'date-fns';
import {
    CheckIcon,
    EyeIcon,
    FilmIcon,
    GripVerticalIcon,
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
    TvIcon,
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
import { DatePicker } from '../../../web/components/base/date-picker';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../web/components/base/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '../../../web/components/base/dropdown-menu';
import { Input } from '../../../web/components/base/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../web/components/base/select';
import { Slider } from '../../../web/components/base/slider';
import { Textarea } from '../../../web/components/base/textarea';
import { GlassCard } from '../../../web/components/GlassCard';
import { Reveal } from '../../../web/components/Reveal';
import { WorkspaceUnauthorized } from '../../../web/components/WorkspaceUnauthorized';
import type {
    GqlCMediaPlatform,
    GqlCMediaTopic,
    GqlCMovieStatus,
    GqlCWorkspaceMediaPageUpdatesSubscription,
    GqlCWorkspaceMediaPageUserFragment,
    GqlCWorkspaceMediaYoutubeSearchQuery,
} from '../../../web/graphql/generated';
import {
    WorkspaceMediaChannelDeleteDocument,
    WorkspaceMediaChannelReorderDocument,
    WorkspaceMediaChannelUpsertDocument,
    WorkspaceMediaPageDocument,
    WorkspaceMediaPageUpdatesDocument,
    WorkspaceMediaTmdbSearchDocument,
    WorkspaceMediaYoutubeSearchDocument,
    WorkspaceMovieAddFromTmdbDocument,
    WorkspaceMovieDeleteDocument,
    WorkspaceMovieMarkWatchedDocument,
    WorkspaceMovieUpsertDocument,
} from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import { useLocale } from '../../../web/hooks/useLocale';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { cn } from '../../../web/utils/cn';
import { DATE_FNS_LOCALE } from '../../../web/utils/dateFnsLocale';
import type { Locale } from '../../../web/utils/locale';
import { localeFromParam } from '../../../web/utils/locale';

// Admin editor for Cem's movie watchlist + favourite YouTube/podcast
// channels. Admin-only, noindex; nothing on this page has a public surface.
// The full read shape (movies + channels) lives in the
// `WorkspaceMediaPageUser` fragment, so the route loader and the
// `userUpdates` subscription deliver the same payload — mutations rely
// entirely on the subscription round-trip to reconcile UI. See
// `docs/architecture/state-synchronization.md` and
// `docs/features/workspace-media.md`.
//
// One page, two tabs. Movies is a poster-first portrait grid grouped by
// status. Add flow: a sticky TMDB search input at the top of the grid;
// suggestions call `movieAddFromTmdb`. Channels is a rows-by-topic layout
// with drag-reorder inside each topic bucket. Both surfaces share one
// edit modal shape (poster on the movie one, avatar on the channel one).
// Deep-linkable via `?tab=…&focus=<id>` from the personal assistant.

const pageTitle = { de: 'Filme & Serien', en: 'Movies & TV shows' };
const pageDescription = {
    de: 'Watchlist, aktuelle Lieblinge und die Kanäle, die ich verfolge.',
    en: 'Watchlist, current favourites, and the channels I follow.',
};

const MOVIE_STATUS_ORDER: ReadonlyArray<GqlCMovieStatus> = ['watchlist', 'watching', 'watched', 'dropped'];
const MOVIE_STATUS_LABELS: Record<GqlCMovieStatus, { de: string; en: string }> = {
    watchlist: { de: 'Watchlist', en: 'Watchlist' },
    watching: { de: 'Schaue gerade', en: 'Watching' },
    watched: { de: 'Gesehen', en: 'Watched' },
    dropped: { de: 'Abgebrochen', en: 'Dropped' },
};

const PLATFORM_LABELS: Record<GqlCMediaPlatform, { de: string; en: string }> = {
    youtube: { de: 'YouTube', en: 'YouTube' },
    twitch: { de: 'Twitch', en: 'Twitch' },
    podcast: { de: 'Podcast', en: 'Podcast' },
    other: { de: 'Sonstige', en: 'Other' },
};

// Known clustering vocabulary — surfaced as suggestion chips in the topic
// picker. The `topics` column itself is free-form, so users can also type
// ad-hoc labels; these are just the ones we know match the visitor-facing
// filters on `/workspace/software`.
const KNOWN_TOPICS: ReadonlyArray<GqlCMediaTopic> = [
    'tech',
    'ai',
    'software',
    'gaming',
    'movieCritic',
    'entertainment',
    'comedy',
    'science',
    'business',
    'news',
    'music',
    'sports',
    'lifestyle',
    'education',
];
const TOPIC_LABELS: Record<GqlCMediaTopic, { de: string; en: string }> = {
    tech: { de: 'Tech', en: 'Tech' },
    ai: { de: 'KI', en: 'AI' },
    software: { de: 'Software', en: 'Software' },
    gaming: { de: 'Gaming', en: 'Gaming' },
    movieCritic: { de: 'Filmkritik', en: 'Film Critique' },
    entertainment: { de: 'Unterhaltung', en: 'Entertainment' },
    comedy: { de: 'Comedy', en: 'Comedy' },
    science: { de: 'Wissenschaft', en: 'Science' },
    business: { de: 'Business', en: 'Business' },
    news: { de: 'News', en: 'News' },
    music: { de: 'Musik', en: 'Music' },
    sports: { de: 'Sport', en: 'Sports' },
    lifestyle: { de: 'Lifestyle', en: 'Lifestyle' },
    education: { de: 'Bildung', en: 'Education' },
};

function topicLabel(topic: string, locale: Locale): string {
    return topic in TOPIC_LABELS ? TOPIC_LABELS[topic as GqlCMediaTopic][locale] : topic;
}

type Tab = 'movies' | 'channels';
const TABS = ['movies', 'channels'] as const satisfies ReadonlyArray<Tab>;
const TAB_LABELS: Record<Tab, { de: string; en: string }> = {
    movies: { de: 'Filme', en: 'Movies' },
    channels: { de: 'Kanäle', en: 'Channels' },
};
const TAB_ICONS: Record<Tab, typeof FilmIcon> = {
    movies: FilmIcon,
    channels: TvIcon,
};

// URL state. `tab` selects the section; absent = movies (the default landing
// view). `topic` filters the movies grid to titles that carry all listed
// topics (comma-joined). `focus` deep-links a specific card/row across
// tabs — the page scrolls it into view and flashes it briefly on land,
// then drops the param so refresh doesn't re-flash. Assistant links point
// here (see `agentPersonalAssistant` "Deep links").
const mediaSearchSchema = z.object({
    tab: z.enum(TABS).optional(),
    topic: z.string().optional(),
    focus: z.string().optional(),
});

type MediaSearch = z.infer<typeof mediaSearchSchema>;

type WorkspaceMediaAdmin = NonNullable<GqlCWorkspaceMediaPageUserFragment['admin']>;
type MediaData = WorkspaceMediaAdmin['media'];
type MovieRow = MediaData['movies'][number];
type ChannelRow = MediaData['channels'][number];

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
    const user = useWorkspaceMediaPageLiveUser(data.currentSession.user);
    const admin = user?.admin;
    const media = admin?.media;

    // Deep-link focus: chat assistant emits links like
    // `/workspace/media?tab=movies&focus=<id>`. Scroll the row/card into view
    // and flash it for ~1500ms, then drop the search param so a refresh
    // doesn't re-flash. Mirrors `/workspace/projects` behaviour.
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

    if (!admin) return <WorkspaceUnauthorized locale={locale} />;
    if (!media) return null;

    return (
        <main className="px-6 md:px-10 lg:px-16 max-w-8xl mx-auto w-full py-12 leading-relaxed">
            <p className="text-sm text-muted-foreground">{pageDescription[locale]}</p>

            <nav
                className="mt-8 flex gap-1 overflow-x-auto border-b border-border/60 scrollbar-none"
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

            <div className="mt-8">
                {tab === 'movies' ? (
                    <MoviesTab movies={media.movies} search={search} navigate={navigate} locale={locale} />
                ) : (
                    <ChannelsTab channels={media.channels} locale={locale} />
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
        const buckets: Record<GqlCMovieStatus, MovieRow[]> = {
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
            <div className="sticky top-0 z-10 -mx-6 md:-mx-10 lg:-mx-16 px-6 md:px-10 lg:px-16 pt-1 pb-3 bg-background/85 backdrop-blur-md border-b border-border/40">
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
    status: GqlCMovieStatus;
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
            <ul className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
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
    const [, upsert] = useMutation(WorkspaceMovieUpsertDocument);
    const [, markWatched] = useMutation(WorkspaceMovieMarkWatchedDocument);
    const [, del] = useMutation(WorkspaceMovieDeleteDocument);
    const [confirmingDelete, setConfirmingDelete] = useState(false);

    const changeStatus = async (next: GqlCMovieStatus) => {
        if (next === 'watched') {
            await markWatched({ movieId: movie.movieId, rating: movie.rating ?? null });
            return;
        }
        await upsert({
            input: {
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
                watchedAt: movie.watchedAt ?? null,
                notes: movie.notes ?? null,
                topics: [...movie.topics],
            },
        });
    };

    const releaseYear = movie.releaseDate ? movie.releaseDate.slice(0, 4) : null;

    return (
        <>
            <div
                data-row-id={movie.movieId}
                className="group/movie relative overflow-hidden rounded-lg border border-border/50 bg-card/40 shadow-sm transition-shadow hover:shadow-md"
            >
                <button
                    type="button"
                    onClick={onEdit}
                    aria-label={{ de: 'Details bearbeiten', en: 'Edit details' }[locale]}
                    className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-t-lg"
                >
                    <AspectRatio ratio={2 / 3} className="bg-muted">
                        {movie.posterUrl ? (
                            <img src={movie.posterUrl} alt={movie.title} loading="lazy" className="h-full w-full object-cover" />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center text-muted-foreground/70">
                                <FilmIcon className="size-8" />
                            </div>
                        )}
                    </AspectRatio>
                </button>

                {movie.status === 'watched' && typeof movie.rating === 'number' ? (
                    <div className="pointer-events-none absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-medium text-white shadow">
                        <StarIcon className="size-3" />
                        <span className="tabular-nums">{movie.rating}</span>
                    </div>
                ) : null}

                <div className="absolute top-2 left-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                size="icon-xs"
                                variant="ghost"
                                className="bg-black/60 text-white hover:bg-black/80 hover:text-white"
                                aria-label={{ de: 'Aktionen', en: 'Actions' }[locale]}
                            >
                                <MoreVerticalIcon />
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

                <div className="px-3 py-2.5">
                    <div className="line-clamp-2 text-sm font-medium leading-snug">{movie.title}</div>
                    {releaseYear ? <div className="mt-0.5 text-xs text-muted-foreground">{releaseYear}</div> : null}
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
                                await del({ movieId: movie.movieId });
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
// adds via `movieAddFromTmdb`; Escape clears the query. A subtle "Add
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
    const [, addFromTmdb] = useMutation(WorkspaceMovieAddFromTmdbDocument);
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
    const results = data?.currentSession.user?.admin?.media.tmdbSearch ?? [];

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
        await addFromTmdb({ tmdbId, status: 'watchlist' });
        setQuery('');
        setDebounced('');
        setOpen(false);
    };

    return (
        <div ref={containerRef} className="relative">
            <div className="relative">
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
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
                    placeholder={{ de: 'Film oder Serie suchen…', en: 'Search a movie or show…' }[locale]}
                    className="pl-9 pr-9"
                    aria-label={{ de: 'TMDB-Suche', en: 'TMDB search' }[locale]}
                    role="combobox"
                    aria-expanded={open}
                    aria-controls="tmdb-suggestions"
                />
                {fetching && debounced ? (
                    <Loader2Icon className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                ) : query ? (
                    <button
                        type="button"
                        onClick={() => {
                            setQuery('');
                            setDebounced('');
                            setOpen(false);
                            inputRef.current?.focus();
                        }}
                        aria-label={{ de: 'Suche leeren', en: 'Clear search' }[locale]}
                        className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        <XIcon className="size-4" />
                    </button>
                ) : null}
            </div>

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

// Movie edit dialog: single centered modal used for both "new" (movie=null)
// and "edit existing" states. Every field maps 1:1 to `MovieInput` — the
// server hydrates from TMDB on `movieAddFromTmdb`, so the poster/backdrop
// URL fields land here already populated and stay editable but rarely
// touched.
function MovieEditDialog({ movie, locale, onClose }: { movie: MovieRow | null; locale: Locale; onClose: () => void }) {
    const [, upsert] = useMutation(WorkspaceMovieUpsertDocument);
    const [, del] = useMutation(WorkspaceMovieDeleteDocument);
    const [busy, setBusy] = useState(false);
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const [form, setForm] = useState({
        title: movie?.title ?? '',
        posterUrl: movie?.posterUrl ?? '',
        backdropUrl: movie?.backdropUrl ?? '',
        releaseDate: movie?.releaseDate ?? '',
        runtimeMinutes: movie?.runtimeMinutes != null ? String(movie.runtimeMinutes) : '',
        overview: movie?.overview ?? '',
        status: movie?.status ?? ('watchlist' as GqlCMovieStatus),
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
                                input: {
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
                                        onValueChange={(value) => setForm({ ...form, status: value as GqlCMovieStatus })}
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
                                    await del({ movieId: movie.movieId });
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

// --- Channels tab -----------------------------------------------------------

function ChannelsTab({ channels, locale }: { channels: ReadonlyArray<ChannelRow>; locale: Locale }) {
    const [editing, setEditing] = useState<ChannelRow | 'new' | null>(null);
    const [, reorderMutation] = useMutation(WorkspaceMediaChannelReorderDocument);

    // Group by topic. Channels with multiple topics appear under each of
    // them, matching the server's `channelsByTopic` shape and the brief.
    // Untagged channels get a synthetic "no topic" bucket at the end.
    const grouped = useMemo(() => {
        const byTopic = new Map<string, ChannelRow[]>();
        const untagged: ChannelRow[] = [];
        for (const channel of channels) {
            if (channel.topics.length === 0) {
                untagged.push(channel);
                continue;
            }
            for (const topic of channel.topics) {
                const bucket = byTopic.get(topic);
                if (bucket) bucket.push(channel);
                else byTopic.set(topic, [channel]);
            }
        }
        // Sort each bucket by priority ascending, then by name for stable ties.
        for (const [, bucket] of byTopic) {
            bucket.sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name));
        }
        untagged.sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name));
        // Sort topic keys by count desc — matches the movie chip sort so the
        // two tabs feel consistent.
        const sortedTopics = [...byTopic.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
        return { sortedTopics, untagged };
    }, [channels]);

    return (
        <section>
            <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                    {
                        {
                            de: 'Lieblingskanäle und Podcasts, gruppiert nach Thema.',
                            en: 'Favourite channels and podcasts, grouped by topic.',
                        }[locale]
                    }
                </p>
                <Button size="sm" onClick={() => setEditing('new')}>
                    <PlusIcon />
                    {{ de: 'Kanal hinzufügen', en: 'New channel' }[locale]}
                </Button>
            </div>

            {channels.length === 0 ? (
                <GlassCard className="mt-6 px-6 py-10 text-center">
                    <TvIcon className="mx-auto size-6 text-muted-foreground" />
                    <p className="mt-3 text-sm text-muted-foreground">
                        {{ de: 'Noch keine Kanäle. Füge deinen ersten hinzu.', en: 'No channels yet. Add your first one.' }[locale]}
                    </p>
                    <Button className="mt-4" size="sm" variant="outline" onClick={() => setEditing('new')}>
                        <PlusIcon />
                        {{ de: 'Kanal hinzufügen', en: 'New channel' }[locale]}
                    </Button>
                </GlassCard>
            ) : (
                <div className="mt-6 flex flex-col gap-8">
                    {grouped.sortedTopics.map(([topic, bucket]) => (
                        <ChannelTopicGroup
                            key={topic}
                            heading={topicLabel(topic, locale)}
                            channels={bucket}
                            onEdit={(row) => setEditing(row)}
                            onReorder={async (orderedIds) => {
                                await reorderMutation({ orderedIds });
                            }}
                            locale={locale}
                        />
                    ))}
                    {grouped.untagged.length > 0 ? (
                        <ChannelTopicGroup
                            heading={{ de: 'Ohne Thema', en: 'No topic' }[locale]}
                            channels={grouped.untagged}
                            onEdit={(row) => setEditing(row)}
                            onReorder={async (orderedIds) => {
                                await reorderMutation({ orderedIds });
                            }}
                            locale={locale}
                        />
                    ) : null}
                </div>
            )}

            {editing ? (
                <ChannelEditDialog channel={editing === 'new' ? null : editing} locale={locale} onClose={() => setEditing(null)} />
            ) : null}
        </section>
    );
}

function ChannelTopicGroup({
    heading,
    channels,
    onEdit,
    onReorder,
    locale,
}: {
    heading: string;
    channels: ReadonlyArray<ChannelRow>;
    onEdit: (row: ChannelRow) => void;
    onReorder: (orderedIds: string[]) => Promise<void>;
    locale: Locale;
}) {
    const ordered = useReorderableList(channels, (c) => c.channelId, onReorder);

    return (
        <div>
            <div className="flex items-baseline justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{heading}</h2>
                <span className="text-xs tabular-nums text-muted-foreground/70">{channels.length}</span>
            </div>
            <ul className="mt-3 flex flex-col gap-1.5">
                {ordered.items.map((channel, index) => (
                    <DraggableItem key={channel.channelId} id={channel.channelId} index={index} state={ordered} locale={locale}>
                        <ChannelRowCard channel={channel} onEdit={() => onEdit(channel)} locale={locale} />
                    </DraggableItem>
                ))}
            </ul>
        </div>
    );
}

const PLATFORM_ICON: Record<GqlCMediaPlatform, typeof PlayIcon> = {
    youtube: PlayIcon,
    twitch: PlayIcon,
    podcast: PodcastIcon,
    other: LinkIcon,
};

function ChannelRowCard({ channel, onEdit, locale }: { channel: ChannelRow; onEdit: () => void; locale: Locale }) {
    const PlatformIcon = PLATFORM_ICON[channel.platform];
    const firstNoteLine = channel.notes?.split('\n')[0]?.trim() ?? '';

    return (
        <button type="button" onClick={onEdit} data-row-id={channel.channelId} className="w-full text-left">
            <GlassCard className="px-4 py-2.5 transition-colors hover:bg-accent/30 focus-within:ring-2 focus-within:ring-ring">
                <div className="flex items-center gap-3">
                    <Avatar size="lg" className="shrink-0">
                        {channel.avatarUrl ? <AvatarImage src={channel.avatarUrl} alt={channel.name} /> : null}
                        <AvatarFallback>{channel.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-medium">{channel.name}</span>
                            {channel.handle ? <span className="truncate text-xs text-muted-foreground">{channel.handle}</span> : null}
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                            <PlatformIcon className="size-3 shrink-0" />
                            <span>{PLATFORM_LABELS[channel.platform][locale]}</span>
                            {firstNoteLine ? (
                                <>
                                    <span>·</span>
                                    <span className="truncate">{firstNoteLine}</span>
                                </>
                            ) : null}
                        </div>
                    </div>
                    <PencilIcon
                        className="size-4 shrink-0 text-muted-foreground/60"
                        aria-label={{ de: 'Bearbeiten', en: 'Edit' }[locale]}
                    />
                </div>
            </GlassCard>
        </button>
    );
}

function ChannelEditDialog({ channel, locale, onClose }: { channel: ChannelRow | null; locale: Locale; onClose: () => void }) {
    const [, upsert] = useMutation(WorkspaceMediaChannelUpsertDocument);
    const [, del] = useMutation(WorkspaceMediaChannelDeleteDocument);
    const [busy, setBusy] = useState(false);
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const [form, setForm] = useState({
        name: channel?.name ?? '',
        platform: channel?.platform ?? ('youtube' as GqlCMediaPlatform),
        url: channel?.url ?? '',
        handle: channel?.handle ?? '',
        avatarUrl: channel?.avatarUrl ?? '',
        description: channel?.description ?? '',
        notes: channel?.notes ?? '',
        topics: channel?.topics ?? [],
    });

    // Only offered when creating a new YouTube channel — editing a saved
    // row or picking a non-YouTube platform is intentional manual entry.
    const showYoutubeSearch = channel === null && form.platform === 'youtube';

    return (
        <>
            <Dialog open onOpenChange={(next) => (!next ? onClose() : null)}>
                <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {channel
                                ? { de: 'Kanal bearbeiten', en: 'Edit channel' }[locale]
                                : { de: 'Kanal hinzufügen', en: 'New channel' }[locale]}
                        </DialogTitle>
                    </DialogHeader>

                    <form
                        onSubmit={async (event) => {
                            event.preventDefault();
                            setBusy(true);
                            await upsert({
                                input: {
                                    channelId: channel?.channelId ?? null,
                                    name: form.name,
                                    platform: form.platform,
                                    url: form.url,
                                    handle: form.handle || null,
                                    avatarUrl: form.avatarUrl || null,
                                    description: form.description || null,
                                    notes: form.notes || null,
                                    topics: [...form.topics],
                                },
                            });
                            setBusy(false);
                            onClose();
                        }}
                        className="flex flex-col gap-3"
                    >
                        {showYoutubeSearch ? (
                            <YoutubeChannelSearchBar
                                locale={locale}
                                onSelect={(hit) => {
                                    setForm((prev) => ({
                                        ...prev,
                                        name: hit.title,
                                        url: hit.canonicalUrl,
                                        handle: hit.handle ?? '',
                                        avatarUrl: hit.avatarUrl ?? '',
                                        description: hit.description ?? '',
                                    }));
                                }}
                            />
                        ) : null}
                        <Field label={{ de: 'Name', en: 'Name' }[locale]}>
                            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required autoFocus />
                        </Field>
                        <div className="grid grid-cols-2 gap-3">
                            <Field label={{ de: 'Plattform', en: 'Platform' }[locale]}>
                                <Select
                                    value={form.platform}
                                    onValueChange={(value) => setForm({ ...form, platform: value as GqlCMediaPlatform })}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {(Object.keys(PLATFORM_LABELS) as GqlCMediaPlatform[]).map((p) => (
                                            <SelectItem key={p} value={p}>
                                                {PLATFORM_LABELS[p][locale]}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Field>
                            <Field label={{ de: 'Handle (optional)', en: 'Handle (optional)' }[locale]}>
                                <Input value={form.handle} onChange={(e) => setForm({ ...form, handle: e.target.value })} />
                            </Field>
                        </div>
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
                            {channel ? (
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

            {channel ? (
                <AlertDialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>{{ de: 'Kanal löschen?', en: 'Delete channel?' }[locale]}</AlertDialogTitle>
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
                                    await del({ channelId: channel.channelId });
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
    NonNullable<GqlCWorkspaceMediaYoutubeSearchQuery['currentSession']['user']>['admin']
>['media']['youtubeSearch'][number];

// Search-first entry for new YouTube channels. Mirrors the TMDB search
// shape (300ms debounce, `pause` on empty, `network-only`, keyboard nav,
// outside-click closes). Selecting a hit auto-fills the channel form
// fields the API can populate; the user still fills topics/notes.
function YoutubeChannelSearchBar({ locale, onSelect }: { locale: Locale; onSelect: (hit: YoutubeSearchHit) => void }) {
    const [query, setQuery] = useState('');
    const [debounced, setDebounced] = useState('');
    const [highlighted, setHighlighted] = useState(0);
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);

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
    const results = data?.currentSession.user?.admin?.media.youtubeSearch ?? [];

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

    const pickResult = (hit: YoutubeSearchHit) => {
        onSelect(hit);
        setQuery('');
        setDebounced('');
        setOpen(false);
    };

    return (
        <div ref={containerRef} className="relative">
            <div className="relative">
                <PlayCircleIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
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
                                pickResult(hit);
                            }
                        } else if (e.key === 'Escape') {
                            setQuery('');
                            setDebounced('');
                            setOpen(false);
                        }
                    }}
                    placeholder={{ de: 'YouTube-Kanal suchen…', en: 'Search YouTube channel…' }[locale]}
                    className="pl-9 pr-9"
                    aria-label={{ de: 'YouTube-Suche', en: 'YouTube search' }[locale]}
                    role="combobox"
                    aria-expanded={open}
                    aria-controls="youtube-suggestions"
                />
                {fetching && debounced ? (
                    <Loader2Icon className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                ) : query ? (
                    <button
                        type="button"
                        onClick={() => {
                            setQuery('');
                            setDebounced('');
                            setOpen(false);
                            inputRef.current?.focus();
                        }}
                        aria-label={{ de: 'Suche leeren', en: 'Clear search' }[locale]}
                        className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        <XIcon className="size-4" />
                    </button>
                ) : null}
            </div>

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
                        <div className="px-4 py-3 text-sm text-muted-foreground">
                            {{ de: 'Keine Treffer — manuell ausfüllen', en: 'No results — fill in manually' }[locale]}
                        </div>
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
                                            onClick={() => pickResult(hit)}
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

// --- Topic chip input -------------------------------------------------------

// Free-form multi-select rendered as pills. Enter (or comma) commits the
// current draft as a topic; Backspace on an empty draft pops the last chip.
// Suggestion chips underneath surface the `MediaTopic` enum values that
// aren't already selected — one click adds them. Ad-hoc strings are allowed
// (the DB column is `text[]`), so the enum acts as a hint, not a constraint.
function TopicChipInput({ value, onChange, locale }: { value: ReadonlyArray<string>; onChange: (next: string[]) => void; locale: Locale }) {
    const [draft, setDraft] = useState('');

    const addTopic = (topic: string) => {
        const trimmed = topic.trim();
        if (!trimmed) return;
        if (value.includes(trimmed)) return;
        onChange([...value, trimmed]);
    };

    const removeTopic = (topic: string) => {
        onChange(value.filter((t) => t !== topic));
    };

    const suggestions = KNOWN_TOPICS.filter((t) => !value.includes(t));

    return (
        <div>
            <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-input bg-white dark:bg-black px-2 py-1.5 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/50">
                {value.map((topic) => (
                    <span
                        key={topic}
                        className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary"
                    >
                        {topicLabel(topic, locale)}
                        <button
                            type="button"
                            onClick={() => removeTopic(topic)}
                            aria-label={{ de: 'Thema entfernen', en: 'Remove topic' }[locale]}
                            className="rounded-full hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            <XIcon className="size-3" />
                        </button>
                    </span>
                ))}
                <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && draft.trim()) {
                            e.preventDefault();
                            addTopic(draft);
                            setDraft('');
                        } else if (e.key === 'Backspace' && !draft && value.length > 0) {
                            e.preventDefault();
                            onChange([...value.slice(0, -1)]);
                        } else if (e.key === ',' && draft.trim()) {
                            e.preventDefault();
                            addTopic(draft);
                            setDraft('');
                        }
                    }}
                    placeholder={
                        value.length === 0
                            ? { de: 'Thema hinzufügen…', en: 'Add a topic…' }[locale]
                            : { de: 'Weiteres…', en: 'Another…' }[locale]
                    }
                    className="flex-1 min-w-24 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
            </div>
            {suggestions.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1">
                    {suggestions.map((topic) => (
                        <button
                            key={topic}
                            type="button"
                            onClick={() => addTopic(topic)}
                            className="rounded-full border border-border/60 bg-background/60 px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            + {TOPIC_LABELS[topic][locale]}
                        </button>
                    ))}
                </div>
            ) : null}
        </div>
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

// Bridges the ISO `YYYY-MM-DD` storage shape the GraphQL `Date` scalar
// expects over to the `Date`-based `DatePicker`. Mirrors the shape used on
// `/workspace/cv`.
function DateField({ value, onChange, locale }: { value: string; onChange: (next: string) => void; locale: Locale }) {
    return (
        <DatePicker
            value={value ? parseISO(value) : undefined}
            onValueChange={(next) => onChange(next ? format(next, 'yyyy-MM-dd') : '')}
            className="w-full"
            captionLayout="dropdown"
            locale={DATE_FNS_LOCALE[locale]}
        />
    );
}

// Drag-and-drop state for a single ordered list. Copied from
// `/workspace/cv` — kept local to each editor so page-scoped tweaks don't
// leak. The hook holds an optimistic copy of the upstream `rows` so the
// on-screen order updates the moment the user drops, before the round-trip
// mutation + subscription refresh returns.
interface ReorderableState<T> {
    items: ReadonlyArray<T>;
    draggingId: string | null;
    overId: string | null;
    setDraggingId: (id: string | null) => void;
    setOverId: (id: string | null) => void;
    commitDrop: () => void;
    getId: (row: T) => string;
}

function useReorderableList<T>(
    rows: ReadonlyArray<T>,
    getId: (row: T) => string,
    onCommit: (orderedIds: string[]) => Promise<void>,
): ReorderableState<T> {
    const [items, setItems] = useState<ReadonlyArray<T>>(rows);
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [overId, setOverId] = useState<string | null>(null);

    const upstreamKey = rows.map(getId).join('|');
    const lastKeyRef = useRef(upstreamKey);
    useEffect(() => {
        if (lastKeyRef.current !== upstreamKey) {
            lastKeyRef.current = upstreamKey;
            setItems(rows);
        }
    }, [upstreamKey, rows]);

    const commitDrop = () => {
        if (!draggingId || !overId || draggingId === overId) {
            setDraggingId(null);
            setOverId(null);
            return;
        }
        const next = [...items];
        const from = next.findIndex((r) => getId(r) === draggingId);
        const to = next.findIndex((r) => getId(r) === overId);
        if (from < 0 || to < 0) {
            setDraggingId(null);
            setOverId(null);
            return;
        }
        const [moved] = next.splice(from, 1) as [T];
        next.splice(to, 0, moved);
        setItems(next);
        setDraggingId(null);
        setOverId(null);
        void onCommit(next.map(getId));
    };

    return { items, draggingId, overId, setDraggingId, setOverId, commitDrop, getId };
}

function DraggableItem<T>({
    id,
    index,
    state,
    locale,
    children,
}: {
    id: string;
    index: number;
    state: ReorderableState<T>;
    locale: Locale;
    children: React.ReactNode;
}) {
    const isDragging = state.draggingId === id;
    const isOver = state.overId === id && state.draggingId !== id;
    const dragHandleLabel = { de: 'Ziehen zum Sortieren', en: 'Drag to reorder' };

    return (
        <li
            draggable
            onDragStart={(event) => {
                state.setDraggingId(id);
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', id);
            }}
            onDragEnter={() => {
                if (state.draggingId && state.draggingId !== id) state.setOverId(id);
            }}
            onDragOver={(event) => {
                if (!state.draggingId) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
            }}
            onDrop={(event) => {
                if (!state.draggingId) return;
                event.preventDefault();
                state.commitDrop();
            }}
            onDragEnd={() => {
                state.setDraggingId(null);
                state.setOverId(null);
            }}
            className={cn(
                'flex items-stretch gap-2 transition-opacity',
                isDragging && 'opacity-50',
                isOver && 'rounded-md ring-2 ring-primary/60 ring-offset-2 ring-offset-background',
            )}
            aria-grabbed={isDragging}
            data-index={index}
        >
            <button
                type="button"
                tabIndex={-1}
                aria-label={dragHandleLabel[locale]}
                title={dragHandleLabel[locale]}
                className="flex w-7 shrink-0 cursor-grab items-center justify-center rounded-md border border-transparent text-muted-foreground hover:border-border/60 hover:text-foreground active:cursor-grabbing"
            >
                <GripVerticalIcon className="size-4" />
            </button>
            <div className="min-w-0 flex-1">{children}</div>
        </li>
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
