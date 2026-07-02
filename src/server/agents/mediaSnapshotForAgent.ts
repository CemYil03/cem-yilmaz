import { asc, sql } from 'drizzle-orm';
import type { MediaChannel, Movie } from '../db/schema';
import { mediaChannels, movies } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';

// Compact text snapshot of the admin's media library for embedding in
// `agentPersonalAssistantMedia`'s system prompt. Same shape as
// `projectsSnapshotForAgent`: each row keeps its id inline so the sub-agent
// can lift ids for mutation tools without burning a `moviesList` call.
// Re-fetched on every delegation — both tables are small.
export async function mediaSnapshotForAgent(serverRuntime: ServerRuntime): Promise<string> {
    const [movieRows, channelRows] = await Promise.all([
        serverRuntime.db
            .select()
            .from(movies)
            .orderBy(
                sql`CASE ${movies.status}
                        WHEN 'watching' THEN 0
                        WHEN 'watchlist' THEN 1
                        WHEN 'watched' THEN 2
                        WHEN 'dropped' THEN 3
                        ELSE 4
                    END`,
                asc(movies.updatedAt),
            ),
        serverRuntime.db.select().from(mediaChannels).orderBy(asc(mediaChannels.priority), asc(mediaChannels.name)),
    ]);

    const byStatus = new Map<Movie['status'], Movie[]>();
    for (const movie of movieRows) {
        const bucket = byStatus.get(movie.status) ?? [];
        bucket.push(movie);
        byStatus.set(movie.status, bucket);
    }

    const lines: string[] = ['## Movies'];
    if (movieRows.length === 0) {
        lines.push('- (no movies tracked yet)');
    } else {
        for (const status of ['watching', 'watchlist', 'watched', 'dropped'] as const) {
            const bucket = byStatus.get(status);
            if (!bucket || bucket.length === 0) continue;
            lines.push(`### ${status}`);
            for (const movie of bucket) lines.push(movieLine(movie));
        }
    }

    lines.push('', '## Channels');
    if (channelRows.length === 0) {
        lines.push('- (no favourite channels yet)');
    } else {
        // Cluster by topic — mirrors the media page's channel grouping. A
        // channel with multiple topics appears under each; the sub-agent
        // sees the same shape the user does.
        const byTopic = new Map<string, MediaChannel[]>();
        const untagged: MediaChannel[] = [];
        for (const channel of channelRows) {
            if (channel.topics.length === 0) {
                untagged.push(channel);
                continue;
            }
            for (const topic of channel.topics) {
                const bucket = byTopic.get(topic) ?? [];
                bucket.push(channel);
                byTopic.set(topic, bucket);
            }
        }
        const topics = [...byTopic.keys()].sort();
        for (const topic of topics) {
            lines.push(`### ${topic}`);
            for (const channel of byTopic.get(topic)!) lines.push(channelLine(channel));
        }
        if (untagged.length > 0) {
            lines.push('### (no topic)');
            for (const channel of untagged) lines.push(channelLine(channel));
        }
    }

    return lines.join('\n');
}

function movieLine(movie: Movie): string {
    const bits: string[] = [movie.title];
    if (movie.releaseDate) bits.push(`(${movie.releaseDate.slice(0, 4)})`);
    if (movie.rating !== null) bits.push(`⭐${movie.rating}/10`);
    const topics = movie.topics.length > 0 ? `, topics: ${movie.topics.join('/')}` : '';
    return `- ${bits.join(' ')} (id: ${movie.movieId}${topics})`;
}

function channelLine(channel: MediaChannel): string {
    const handle = channel.handle ? ` ${channel.handle}` : '';
    return `- ${channel.name}${handle} (id: ${channel.channelId}, ${channel.platform})`;
}
