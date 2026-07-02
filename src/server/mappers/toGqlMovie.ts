import type { Movie } from '../db/schema';
import type { GqlSMovie } from '../graphql/generated';

export function toGqlMovie(row: Movie): GqlSMovie {
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
