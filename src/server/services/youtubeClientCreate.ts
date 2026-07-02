import { environmentVariables } from '../env/environmentVariablesCreate';

// Single boundary between the rest of the server and the YouTube Data API
// v3. Powers the `/workspace/media` channels-tab auto-fill: search by name,
// pick a channel, capture channelId + avatar + description + handle +
// subscriber count into the `MediaChannels` row. Same posture as
// `tmdbClientCreate` — capability-lazy, graceful empty-fallback when
// `YOUTUBE_API_KEY` is missing.
//
// One user search = two API calls (search.list + channels.list). Search is
// 100 units on YouTube's quota model, the follow-up detail read is 2 units
// regardless of id count. Free tier is 10k units/day → ~90 searches per
// day, generous for a personal library.

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

interface YoutubeChannelResult {
    // The stable id used to construct a canonical channel URL. `handle` is
    // nicer to show but not stable across renames; `channelId` is forever.
    channelId: string;
    title: string;
    // `@fireship`-style handle, or null when the channel hasn't claimed one.
    // Sourced from `channels.list`'s `snippet.customUrl` — always starts
    // with `@` when present.
    handle: string | null;
    avatarUrl: string | null;
    description: string | null;
    subscriberCount: number | null;
    // Canonical channel URL. Prefers the handle URL when available
    // (`https://youtube.com/@fireship`) because it's shorter and stable
    // under rename; falls back to the id URL when there is no handle.
    canonicalUrl: string;
}

export interface YoutubeClient {
    /**
     * Search YouTube for channels matching `query`. Returns at most 10
     * results enriched with handle + subscriber count via a follow-up
     * `channels.list` call. Empty array on missing API key, on YouTube
     * HTTP error (including quota-exhaustion), or on empty query. Never
     * throws — the media page treats an empty result set as "no matches,
     * offer manual entry".
     */
    searchChannels: (query: string) => Promise<YoutubeChannelResult[]>;
}

interface YoutubeSearchThumbnail {
    url: string;
    width?: number;
    height?: number;
}

interface YoutubeSearchItem {
    id: { channelId?: string };
    snippet: {
        title: string;
        description: string;
        thumbnails?: {
            default?: YoutubeSearchThumbnail;
            medium?: YoutubeSearchThumbnail;
            high?: YoutubeSearchThumbnail;
        };
    };
}

interface YoutubeSearchResponse {
    items: YoutubeSearchItem[];
}

interface YoutubeChannelListItem {
    id: string;
    snippet: {
        customUrl?: string;
        thumbnails?: {
            default?: YoutubeSearchThumbnail;
            medium?: YoutubeSearchThumbnail;
            high?: YoutubeSearchThumbnail;
        };
    };
    statistics?: {
        subscriberCount?: string;
        hiddenSubscriberCount?: boolean;
    };
}

interface YoutubeChannelListResponse {
    items: YoutubeChannelListItem[];
}

function pickThumbnail(thumbnails: YoutubeSearchItem['snippet']['thumbnails']): string | null {
    return thumbnails?.high?.url ?? thumbnails?.medium?.url ?? thumbnails?.default?.url ?? null;
}

function normalizeHandle(customUrl: string | undefined): string | null {
    if (!customUrl) return null;
    // YouTube returns handles both with and without the leading `@`
    // depending on API version — normalize to always have it.
    return customUrl.startsWith('@') ? customUrl : `@${customUrl}`;
}

function canonicalUrlFor(channelId: string, handle: string | null): string {
    return handle ? `https://www.youtube.com/${handle}` : `https://www.youtube.com/channel/${channelId}`;
}

export function youtubeClientCreate(): YoutubeClient {
    async function youtubeFetch<T>(path: string, params: Record<string, string>): Promise<T | null> {
        const apiKey = environmentVariables.youtubeApiKey;
        if (!apiKey) return null;
        const url = new URL(`${YOUTUBE_API_BASE}${path}`);
        url.searchParams.set('key', apiKey);
        for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
        try {
            const response = await fetch(url.toString(), {
                headers: { accept: 'application/json' },
                // Same 5s ceiling as the TMDB client — a stuck fetch must
                // not block a keystroke's worth of typeahead.
                signal: AbortSignal.timeout(5000),
            });
            if (!response.ok) return null;
            return (await response.json()) as T;
        } catch {
            return null;
        }
    }

    return {
        searchChannels: async (query) => {
            const trimmed = query.trim();
            if (!trimmed) return [];

            const searchResponse = await youtubeFetch<YoutubeSearchResponse>('/search', {
                part: 'snippet',
                type: 'channel',
                q: trimmed,
                maxResults: '10',
            });
            if (!searchResponse) return [];

            const channelIds = searchResponse.items
                .map((item) => item.id.channelId)
                .filter((id): id is string => typeof id === 'string' && id.length > 0);
            if (channelIds.length === 0) return [];

            // Enrich with handle + subscriber count. When this second call
            // fails (rare — quota edge case), fall back to search-only
            // results without handles rather than dropping everything.
            const channelResponse = await youtubeFetch<YoutubeChannelListResponse>('/channels', {
                part: 'snippet,statistics',
                id: channelIds.join(','),
            });
            const enrichmentById = new Map<string, YoutubeChannelListItem>();
            if (channelResponse) {
                for (const item of channelResponse.items) enrichmentById.set(item.id, item);
            }

            return searchResponse.items
                .map((item): YoutubeChannelResult | null => {
                    const channelId = item.id.channelId;
                    if (!channelId) return null;
                    const enrichment = enrichmentById.get(channelId);
                    const handle = normalizeHandle(enrichment?.snippet.customUrl);
                    const subscriberCountRaw = enrichment?.statistics?.subscriberCount;
                    const subscriberCount =
                        !enrichment?.statistics?.hiddenSubscriberCount && subscriberCountRaw
                            ? Number.parseInt(subscriberCountRaw, 10)
                            : null;
                    return {
                        channelId,
                        title: item.snippet.title,
                        handle,
                        // Prefer the enriched (channels.list) thumbnail over
                        // the search one — same image, but channels.list
                        // hits the higher-res variant consistently.
                        avatarUrl: pickThumbnail(enrichment?.snippet.thumbnails) ?? pickThumbnail(item.snippet.thumbnails),
                        description: item.snippet.description && item.snippet.description.length > 0 ? item.snippet.description : null,
                        subscriberCount: Number.isFinite(subscriberCount) ? subscriberCount : null,
                        canonicalUrl: canonicalUrlFor(channelId, handle),
                    };
                })
                .filter((result): result is YoutubeChannelResult => result !== null);
        },
    };
}
