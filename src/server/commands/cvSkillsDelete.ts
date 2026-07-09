import { inArray } from 'drizzle-orm';
import { cvSkill } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession } from '../graphql/generated';

export async function cvSkillsDelete(
    userId: string,
    cvSkillIds: readonly string[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const deleted = await serverRuntime.db
            .delete(cvSkill)
            .where(inArray(cvSkill.cvSkillId, cvSkillIds as string[]))
            .returning({ cvSkillId: cvSkill.cvSkillId });
        if (deleted.length !== cvSkillIds.length) {
            const found = new Set(deleted.map((row) => row.cvSkillId));
            const missing = cvSkillIds.filter((id) => !found.has(id));
            throw new Error(`cvSkillsDelete: rows not found: ${missing.join(', ')}`);
        }
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: [...cvSkillIds] };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
