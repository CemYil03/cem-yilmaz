import { asc } from 'drizzle-orm';
import { cvSkill } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSCvSkill, GqlSSession } from '../graphql/generated';
import { toGqlCvSkill } from '../mappers/toGqlCvSkill';

export async function cvSkillList(requestingSession: GqlSSession, serverRuntime: ServerRuntime): Promise<GqlSCvSkill[]> {
    try {
        const rows = await serverRuntime.db.select().from(cvSkill).orderBy(asc(cvSkill.position));
        return rows.map(toGqlCvSkill);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
