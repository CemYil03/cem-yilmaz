import { environmentVariables } from '../env/environmentVariablesCreate';

// Single boundary between the rest of the server and The AdminMediaMovie Database v3
// API. Powers the `/workspace/media` auto-fill flow for both movies and TV
// series: search for a title, pick one, capture `tmdbId` + poster URLs +
// release metadata into the `Movies` / `Shows` row. See
// `docs/features/workspace-media.md`.
//
// Graceful degradation: when `TMDB_API_KEY` is missing, search / get helpers
// return empty / null instead of throwing. The media page still works — it
// just falls back to manual entry. Same posture as `emailServiceCreate`
// (capability-lazy, validated at the call site) but softer, because the
// failure mode here isn't "the user did nothing" — it's "there is no TMDB
// search". Log at debug so a missing key in a real deployment is discoverable.

const TMDB_API_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

interface AdminMediaTmdbMovieResult {
    tmdbId: number;
    title: string;
    releaseDate: string | null;
    posterUrl: string | null;
    overview: string | null;
}

interface TmdbMovieDetail extends AdminMediaTmdbMovieResult {
    backdropUrl: string | null;
    runtimeMinutes: number | null;
}

interface AdminMediaTmdbTvResult {
    tmdbId: number;
    title: string;
    firstAirDate: string | null;
    posterUrl: string | null;
    overview: string | null;
}

interface TmdbTvDetail extends AdminMediaTmdbTvResult {
    backdropUrl: string | null;
    // True when TMDB reports the show as Ended / Canceled.
    isCompleted: boolean;
    // Best-effort next-season air date from TMDB season metadata or
    // `next_episode_to_air`. Null when unknown — the admin fills exact /
    // rough dates manually in that case.
    nextSeasonReleaseDate: string | null;
}

export interface TmdbClient {
    /**
     * Search TMDB for movies matching `query`. Returns at most 10 results,
     * ordered by TMDB's own relevance. Empty array on missing API key, on
     * TMDB HTTP error, or on empty query. Never throws — the media page
     * treats an empty result set as "no matches, offer manual entry".
     */
    searchMovies: (query: string) => Promise<AdminMediaTmdbMovieResult[]>;
    /**
     * Fetch full detail for a TMDB movie id. Returns `null` if the key is
     * missing or the fetch fails — the media command falls back to
     * `adminMediaMoviesUpsert` with whatever the client already knows.
     */
    getMovie: (tmdbId: number) => Promise<TmdbMovieDetail | null>;
    /**
     * Search TMDB for TV series matching `query`. Same empty-fallback
     * semantics as `searchMovies`.
     */
    searchTv: (query: string) => Promise<AdminMediaTmdbTvResult[]>;
    /**
     * Fetch full detail for a TMDB TV id, including a best-effort
     * `isCompleted` / `nextSeasonReleaseDate` derived from TMDB status and
     * season / next-episode metadata.
     */
    getTv: (tmdbId: number) => Promise<TmdbTvDetail | null>;
}

interface TmdbSearchResponseItem {
    id: number;
    title: string;
    release_date: string | null;
    poster_path: string | null;
    overview: string | null;
}

interface TmdbSearchResponse {
    results: TmdbSearchResponseItem[];
}

interface TmdbMovieDetailResponse extends TmdbSearchResponseItem {
    backdrop_path: string | null;
    runtime: number | null;
}

interface TmdbTvSearchResponseItem {
    id: number;
    name: string;
    first_air_date: string | null;
    poster_path: string | null;
    overview: string | null;
}

interface TmdbTvSearchResponse {
    results: TmdbTvSearchResponseItem[];
}

interface TmdbTvSeasonSummary {
    season_number: number;
    air_date: string | null;
}

interface TmdbTvDetailResponse extends TmdbTvSearchResponseItem {
    backdrop_path: string | null;
    status: string | null;
    next_episode_to_air: { air_date: string | null; season_number: number | null } | null;
    seasons: TmdbTvSeasonSummary[] | null;
}

function posterFromPath(path: string | null, size: 'w200' | 'w500' | 'original'): string | null {
    return path ? `${TMDB_IMAGE_BASE}/${size}${path}` : null;
}

function nonEmptyDate(value: string | null | undefined): string | null {
    return value && value.length > 0 ? value : null;
}

function deriveNextSeasonReleaseDate(detail: TmdbTvDetailResponse): string | null {
    // Prefer an upcoming season's air_date (season_number > 0, air_date in the
    // future or unset-but-present). Fall back to next_episode_to_air when it
    // points at a season that hasn't started yet.
    const today = new Date().toISOString().slice(0, 10);
    const upcomingSeasons = (detail.seasons ?? [])
        .filter((season) => season.season_number > 0)
        .filter((season) => {
            const air = nonEmptyDate(season.air_date);
            return air === null || air >= today;
        })
        .sort((a, b) => a.season_number - b.season_number);

    for (const season of upcomingSeasons) {
        const air = nonEmptyDate(season.air_date);
        // Skip the currently-airing season (air_date already in the past or
        // today) — we only want a *next* season. The filter above keeps
        // future-or-null; null air_dates on a higher season_number than any
        // past season are still useful as "announced but undated".
        if (air && air > today) return air;
    }

    const nextEpisode = detail.next_episode_to_air;
    const nextEpisodeAir = nonEmptyDate(nextEpisode?.air_date ?? null);
    if (nextEpisodeAir && nextEpisodeAir > today) return nextEpisodeAir;

    return null;
}

function isShowCompleted(status: string | null): boolean {
    if (!status) return false;
    const normalized = status.trim().toLowerCase();
    return normalized === 'ended' || normalized === 'canceled' || normalized === 'cancelled';
}

export function tmdbClientCreate(): TmdbClient {
    async function tmdbFetch<T>(path: string, params: Record<string, string>): Promise<T | null> {
        const apiKey = environmentVariables.tmdbApiKey;
        if (!apiKey) return null;
        const url = new URL(`${TMDB_API_BASE}${path}`);
        url.searchParams.set('api_key', apiKey);
        for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
        try {
            const response = await fetch(url.toString(), {
                headers: { accept: 'application/json' },
                // TMDB is usually fast (<200ms) but a stuck fetch would block
                // an admin's search-typeahead keystroke. AbortController keeps
                // the p99 bounded.
                signal: AbortSignal.timeout(5000),
            });
            if (!response.ok) return null;
            return (await response.json()) as T;
        } catch {
            // Network error, timeout, or JSON parse failure — all collapse to
            // "no TMDB data, fall back to manual". The caller has already
            // decided what to do with a `null` / `[]`.
            return null;
        }
    }

    return {
        searchMovies: async (query) => {
            const trimmed = query.trim();
            if (!trimmed) return [];
            const data = await tmdbFetch<TmdbSearchResponse>('/search/movie', {
                query: trimmed,
                include_adult: 'false',
            });
            if (!data) return [];
            return data.results.slice(0, 10).map((item) => ({
                tmdbId: item.id,
                title: item.title,
                releaseDate: nonEmptyDate(item.release_date),
                posterUrl: posterFromPath(item.poster_path, 'w200'),
                overview: item.overview && item.overview.length > 0 ? item.overview : null,
            }));
        },
        getMovie: async (tmdbId) => {
            const data = await tmdbFetch<TmdbMovieDetailResponse>(`/movie/${tmdbId}`, {});
            if (!data) return null;
            return {
                tmdbId: data.id,
                title: data.title,
                releaseDate: nonEmptyDate(data.release_date),
                posterUrl: posterFromPath(data.poster_path, 'w500'),
                backdropUrl: posterFromPath(data.backdrop_path, 'original'),
                overview: data.overview && data.overview.length > 0 ? data.overview : null,
                runtimeMinutes: data.runtime,
            };
        },
        searchTv: async (query) => {
            const trimmed = query.trim();
            if (!trimmed) return [];
            const data = await tmdbFetch<TmdbTvSearchResponse>('/search/tv', {
                query: trimmed,
                include_adult: 'false',
            });
            if (!data) return [];
            return data.results.slice(0, 10).map((item) => ({
                tmdbId: item.id,
                title: item.name,
                firstAirDate: nonEmptyDate(item.first_air_date),
                posterUrl: posterFromPath(item.poster_path, 'w200'),
                overview: item.overview && item.overview.length > 0 ? item.overview : null,
            }));
        },
        getTv: async (tmdbId) => {
            const data = await tmdbFetch<TmdbTvDetailResponse>(`/tv/${tmdbId}`, {});
            if (!data) return null;
            const completed = isShowCompleted(data.status);
            return {
                tmdbId: data.id,
                title: data.name,
                firstAirDate: nonEmptyDate(data.first_air_date),
                posterUrl: posterFromPath(data.poster_path, 'w500'),
                backdropUrl: posterFromPath(data.backdrop_path, 'original'),
                overview: data.overview && data.overview.length > 0 ? data.overview : null,
                isCompleted: completed,
                nextSeasonReleaseDate: completed ? null : deriveNextSeasonReleaseDate(data),
            };
        },
    };
}
