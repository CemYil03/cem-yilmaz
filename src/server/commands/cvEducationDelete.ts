import { eq } from 'drizzle-orm';
import { cvEducation } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutationCvEducationDeleteArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';

export async function cvEducationDelete(
    userId: string,
    args: GqlSAdminMutationCvEducationDeleteArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const deleted = await serverRuntime.db
            .delete(cvEducation)
            .where(eq(cvEducation.cvEducationId, args.cvEducationId))
            .returning({ cvEducationId: cvEducation.cvEducationId });
        if (deleted.length === 0) throw new Error(`cvEducationDelete: row ${args.cvEducationId} not found`);
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
