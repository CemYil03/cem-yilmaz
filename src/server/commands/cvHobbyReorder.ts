import { eq } from 'drizzle-orm';
import { cvHobby } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutationCvHobbyReorderArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';

export async function cvHobbyReorder(
    args: GqlSAdminMutationCvHobbyReorderArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        await serverRuntime.db.transaction(async (transaction) => {
            for (let position = 0; position < args.orderedIds.length; position++) {
                const cvHobbyId = args.orderedIds[position]!;
                await transaction.update(cvHobby).set({ position, updatedAt: new Date() }).where(eq(cvHobby.cvHobbyId, cvHobbyId));
            }
        });
        return { success: true };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
