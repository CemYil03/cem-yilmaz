import { eq } from 'drizzle-orm';
import { cvSkill } from '../db/schema';
import type { CvSkillCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutationCvSkillUpsertArgs, GqlSCvSkill, GqlSSession } from '../graphql/generated';
import { toGqlCvSkill } from '../mappers/toGqlCvSkill';

export async function cvSkillUpsert(
    userId: string,
    args: GqlSAdminMutationCvSkillUpsertArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSCvSkill> {
    const { input } = args;
    const cvSkillId = input.cvSkillId ?? crypto.randomUUID();
    const payload: CvSkillCreate = {
        cvSkillId,
        category: input.category,
        label: input.label,
        position: input.position,
        updatedAt: new Date(),
    };

    try {
        let row;
        if (input.cvSkillId) {
            const [updated] = await serverRuntime.db.update(cvSkill).set(payload).where(eq(cvSkill.cvSkillId, input.cvSkillId)).returning();
            if (!updated) throw new Error(`cvSkillUpsert: row ${input.cvSkillId} not found`);
            row = updated;
        } else {
            const [inserted] = await serverRuntime.db.insert(cvSkill).values(payload).returning();
            if (!inserted) throw new Error('cvSkillUpsert: insert returned no rows');
            row = inserted;
        }
        await serverRuntime.publish.userUpdates({ userId });
        return toGqlCvSkill(row);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
