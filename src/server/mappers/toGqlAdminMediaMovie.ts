import type { AdminMediaMovie } from '../db/schema';
import type { GqlSAdminMediaMovie } from '../graphql/generated';

export function toGqlAdminMediaMovie(row: AdminMediaMovie): GqlSAdminMediaMovie {
    return {
        movieId: row.movieId,
        title: row.title,
        tmdbId: row.tmdbId,
        posterUrl: row.posterUrl,
        backdropUrl: row.backdropUrl,
        releaseDate: row.releaseDate,
        runtimeMinutes: row.runtimeMinutes,
        overview: row.overview,
        status: row.status,
        rating: row.rating,
        watchedAt: row.watchedAt,
        notes: row.notes,
        topics: row.topics,
        updatedAt: row.updatedAt,
    };
}
