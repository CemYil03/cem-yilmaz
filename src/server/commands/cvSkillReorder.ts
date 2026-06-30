import { eq } from 'drizzle-orm';
import { cvSkill } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutationCvSkillReorderArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';

export async function cvSkillReorder(
    userId: string,
    args: GqlSAdminMutationCvSkillReorderArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        await serverRuntime.db.transaction(async (transaction) => {
            for (let position = 0; position < args.orderedIds.length; position++) {
                const cvSkillId = args.orderedIds[position]!;
                await transaction.update(cvSkill).set({ position, updatedAt: new Date() }).where(eq(cvSkill.cvSkillId, cvSkillId));
            }
        });
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
