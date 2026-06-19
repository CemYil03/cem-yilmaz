import type { CvHobby } from '../db/schema';
import type { GqlSCvHobby } from '../graphql/generated';

export function toGqlCvHobby(row: CvHobby): GqlSCvHobby {
    return {
        cvHobbyId: row.cvHobbyId,
        textDe: row.textDe,
        textEn: row.textEn,
        since: row.since,
        position: row.position,
    };
}
