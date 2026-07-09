import { asc } from 'drizzle-orm';
import { cvHobby } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSCvHobby, GqlSSession } from '../graphql/generated';
import { toGqlCvHobby } from '../mappers/toGqlCvHobby';

export async function publicCvHobbyFindMany(requestingSession: GqlSSession, serverRuntime: ServerRuntime): Promise<GqlSCvHobby[]> {
    try {
        const rows = await serverRuntime.db.select().from(cvHobby).orderBy(asc(cvHobby.position));
        return rows.map(toGqlCvHobby);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
