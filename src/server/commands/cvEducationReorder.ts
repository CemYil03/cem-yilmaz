import { eq } from 'drizzle-orm';
import { cvEducation } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutationCvEducationReorderArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';

export async function cvEducationReorder(
    userId: string,
    args: GqlSAdminMutationCvEducationReorderArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        await serverRuntime.db.transaction(async (transaction) => {
            for (let position = 0; position < args.orderedIds.length; position++) {
                const cvEducationId = args.orderedIds[position]!;
                await transaction
                    .update(cvEducation)
                    .set({ position, updatedAt: new Date() })
                    .where(eq(cvEducation.cvEducationId, cvEducationId));
            }
        });
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
