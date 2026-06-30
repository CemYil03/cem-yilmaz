import { eq } from 'drizzle-orm';
import { cvHobby } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutationCvHobbyDeleteArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';

export async function cvHobbyDelete(
    userId: string,
    args: GqlSAdminMutationCvHobbyDeleteArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const deleted = await serverRuntime.db
            .delete(cvHobby)
            .where(eq(cvHobby.cvHobbyId, args.cvHobbyId))
            .returning({ cvHobbyId: cvHobby.cvHobbyId });
        if (deleted.length === 0) throw new Error(`cvHobbyDelete: row ${args.cvHobbyId} not found`);
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
