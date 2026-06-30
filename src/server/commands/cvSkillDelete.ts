import { eq } from 'drizzle-orm';
import { cvSkill } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutationCvSkillDeleteArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';

export async function cvSkillDelete(
    userId: string,
    args: GqlSAdminMutationCvSkillDeleteArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const deleted = await serverRuntime.db
            .delete(cvSkill)
            .where(eq(cvSkill.cvSkillId, args.cvSkillId))
            .returning({ cvSkillId: cvSkill.cvSkillId });
        if (deleted.length === 0) throw new Error(`cvSkillDelete: row ${args.cvSkillId} not found`);
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
