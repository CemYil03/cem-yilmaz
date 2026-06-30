import { asc, desc, sql } from 'drizzle-orm';
import { cvExperience } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSCvExperience, GqlSSession } from '../graphql/generated';
import { toGqlCvExperience } from '../mappers/toGqlCvExperience';

// Lists every CV experience entry, ordered chronologically — ongoing roles
// (`endDate IS NULL`) first, then by `endDate` descending, with `startDate`
// descending as a tiebreak for two roles that ended in the same month.
// Experience has no `position` column: it is intrinsically date-ordered,
// so there is nothing for the editor to override. See `docs/features/cv.md`.
export async function cvExperienceList(requestingSession: GqlSSession, serverRuntime: ServerRuntime): Promise<GqlSCvExperience[]> {
    try {
        const rows = await serverRuntime.db
            .select()
            .from(cvExperience)
            .orderBy(sql`${cvExperience.endDate} DESC NULLS FIRST`, desc(cvExperience.startDate), asc(cvExperience.cvExperienceId));
        return rows.map(toGqlCvExperience);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
