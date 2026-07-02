import { environmentVariables } from '../env/environmentVariablesCreate';

// Single boundary between the rest of the server and The Movie Database v3
// API. Powers the `/workspace/media` auto-fill flow: search for a title,
// pick one, capture `tmdbId` + poster URLs + release metadata into the
// `Movies` row. See `docs/features/workspace-media.md`.
//
// Graceful degradation: when `TMDB_API_KEY` is missing, `searchMovies` and
// `getMovie` return empty / null instead of throwing. The media page still
// works — it just falls back to manual entry. Same posture as
// `emailServiceCreate` (capability-lazy, validated at the call site) but
// softer, because the failure mode here isn't "the user did nothing" — it's
// "there is no TMDB search". Log at debug so a missing key in a real
// deployment is discoverable.

const TMDB_API_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

interface TmdbMovieResult {
    tmdbId: number;
    title: string;
    releaseDate: string | null;
    posterUrl: string | null;
    overview: string | null;
}

interface TmdbMovieDetail extends TmdbMovieResult {
    backdropUrl: string | null;
    runtimeMinutes: number | null;
}

export interface TmdbClient {
    /**
     * Search TMDB for movies matching `query`. Returns at most 10 results,
     * ordered by TMDB's own relevance. Empty array on missing API key, on
     * TMDB HTTP error, or on empty query. Never throws — the media page
     * treats an empty result set as "no matches, offer manual entry".
     */
    searchMovies: (query: string) => Promise<TmdbMovieResult[]>;
    /**
     * Fetch full detail for a TMDB id. Returns `null` if the key is missing
     * or the fetch fails — the media command falls back to `movieUpsert`
     * with whatever the client already knows.
     */
    getMovie: (tmdbId: number) => Promise<TmdbMovieDetail | null>;
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

function posterFromPath(path: string | null, size: 'w200' | 'w500' | 'original'): string | null {
    return path ? `${TMDB_IMAGE_BASE}/${size}${path}` : null;
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
                releaseDate: item.release_date && item.release_date.length > 0 ? item.release_date : null,
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
                releaseDate: data.release_date && data.release_date.length > 0 ? data.release_date : null,
                posterUrl: posterFromPath(data.poster_path, 'w500'),
                backdropUrl: posterFromPath(data.backdrop_path, 'original'),
                overview: data.overview && data.overview.length > 0 ? data.overview : null,
                runtimeMinutes: data.runtime,
            };
        },
    };
}
