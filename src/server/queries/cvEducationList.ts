import { asc } from 'drizzle-orm';
import { cvEducation } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSCvEducation, GqlSSession } from '../graphql/generated';
import { toGqlCvEducation } from '../mappers/toGqlCvEducation';

export async function cvEducationList(requestingSession: GqlSSession, serverRuntime: ServerRuntime): Promise<GqlSCvEducation[]> {
    try {
        const rows = await serverRuntime.db.select().from(cvEducation).orderBy(asc(cvEducation.position));
        return rows.map(toGqlCvEducation);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
