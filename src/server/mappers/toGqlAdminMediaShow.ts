import type { AdminMediaShow } from '../db/schema';
import type { GqlSAdminMediaShow } from '../graphql/generated';

export function toGqlAdminMediaShow(row: AdminMediaShow): GqlSAdminMediaShow {
    return {
        showId: row.showId,
        title: row.title,
        tmdbId: row.tmdbId,
        posterUrl: row.posterUrl,
        backdropUrl: row.backdropUrl,
        firstAirDate: row.firstAirDate,
        overview: row.overview,
        status: row.status,
        rating: row.rating,
        notes: row.notes,
        topics: row.topics,
        isCompleted: row.isCompleted,
        nextSeasonReleaseDate: row.nextSeasonReleaseDate,
        nextSeasonReleaseRough: row.nextSeasonReleaseRough,
        updatedAt: row.updatedAt,
    };
}
