import { asc } from 'drizzle-orm';
import { cvExperience } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSCvExperience, GqlSSession } from '../graphql/generated';
import { toGqlCvExperience } from '../mappers/toGqlCvExperience';

// Lists every CV experience entry, ordered by `position` ascending. The
// editor at `/workspace/cv` writes `position` via the reorder command; the
// sort here is just the read-time projection. See `docs/features/cv.md`.
export async function cvExperienceList(requestingSession: GqlSSession, serverRuntime: ServerRuntime): Promise<GqlSCvExperience[]> {
    try {
        const rows = await serverRuntime.db.select().from(cvExperience).orderBy(asc(cvExperience.position));
        return rows.map(toGqlCvExperience);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
