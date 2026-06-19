import { eq } from 'drizzle-orm';
import { cvExperience } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutationCvExperienceDeleteArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';

export async function cvExperienceDelete(
    args: GqlSAdminMutationCvExperienceDeleteArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const deleted = await serverRuntime.db
            .delete(cvExperience)
            .where(eq(cvExperience.cvExperienceId, args.cvExperienceId))
            .returning({ cvExperienceId: cvExperience.cvExperienceId });
        if (deleted.length === 0) {
            throw new Error(`cvExperienceDelete: row ${args.cvExperienceId} not found`);
        }
        return { success: true };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
