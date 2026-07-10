import { asc, sql } from 'drizzle-orm';
import type { AdminMediaChannel, AdminMediaMovie, AdminMediaShow } from '../db/schema';
import { mediaChannels, movies, shows } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';

// Compact text snapshot of the admin's media library for embedding in
// `agentPersonalAssistantMedia`'s system prompt. Same shape as
// `projectsSnapshotForAgent`: each row keeps its id inline so the sub-agent
// can lift ids for mutation tools without burning a `moviesList` call.
// Re-fetched on every delegation — all three tables are small.
export async function mediaSnapshotForAgent(serverRuntime: ServerRuntime): Promise<string> {
    const [movieRows, showRows, channelRows] = await Promise.all([
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
        serverRuntime.db
            .select()
            .from(shows)
            .orderBy(
                sql`CASE ${shows.status}
                        WHEN 'watching' THEN 0
                        WHEN 'watchlist' THEN 1
                        WHEN 'watched' THEN 2
                        WHEN 'dropped' THEN 3
                        ELSE 4
                    END`,
                asc(shows.updatedAt),
            ),
        serverRuntime.db.select().from(mediaChannels).orderBy(asc(mediaChannels.priority), asc(mediaChannels.name)),
    ]);

    const lines: string[] = ['## Movies'];
    appendStatusBuckets(lines, movieRows, movieLine);

    lines.push('', '## Series');
    appendStatusBuckets(lines, showRows, showLine);

    lines.push('', '## Channels');
    if (channelRows.length === 0) {
        lines.push('- (no favourite channels yet)');
    } else {
        // Cluster by topic — mirrors the media page's channel grouping. A
        // channel with multiple topics appears under each; the sub-agent
        // sees the same shape the user does.
        const byTopic = new Map<string, AdminMediaChannel[]>();
        const untagged: AdminMediaChannel[] = [];
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

function appendStatusBuckets<T extends { status: AdminMediaMovie['status'] }>(
    lines: string[],
    rows: T[],
    lineFor: (row: T) => string,
): void {
    if (rows.length === 0) {
        lines.push('- (none tracked yet)');
        return;
    }
    const byStatus = new Map<AdminMediaMovie['status'], T[]>();
    for (const row of rows) {
        const bucket = byStatus.get(row.status) ?? [];
        bucket.push(row);
        byStatus.set(row.status, bucket);
    }
    for (const status of ['watching', 'watchlist', 'watched', 'dropped'] as const) {
        const bucket = byStatus.get(status);
        if (!bucket || bucket.length === 0) continue;
        lines.push(`### ${status}`);
        for (const row of bucket) lines.push(lineFor(row));
    }
}

function movieLine(movie: AdminMediaMovie): string {
    const bits: string[] = [movie.title];
    if (movie.releaseDate) bits.push(`(${movie.releaseDate.slice(0, 4)})`);
    if (movie.rating !== null) bits.push(`⭐${movie.rating}/10`);
    const topics = movie.topics.length > 0 ? `, topics: ${movie.topics.join('/')}` : '';
    return `- ${bits.join(' ')} (id: ${movie.movieId}${topics})`;
}

function showLine(show: AdminMediaShow): string {
    const bits: string[] = [show.title];
    if (show.firstAirDate) bits.push(`(${show.firstAirDate.slice(0, 4)})`);
    if (show.rating !== null) bits.push(`⭐${show.rating}/10`);
    if (show.isCompleted) bits.push('[completed]');
    else if (show.nextSeasonReleaseDate) bits.push(`[next: ${show.nextSeasonReleaseDate}]`);
    else if (show.nextSeasonReleaseRough) bits.push(`[next: ${show.nextSeasonReleaseRough}]`);
    const topics = show.topics.length > 0 ? `, topics: ${show.topics.join('/')}` : '';
    return `- ${bits.join(' ')} (id: ${show.showId}${topics})`;
}

function channelLine(channel: AdminMediaChannel): string {
    const handle = channel.handle ? ` ${channel.handle}` : '';
    return `- ${channel.name}${handle} (id: ${channel.channelId}, ${channel.platform})`;
}
