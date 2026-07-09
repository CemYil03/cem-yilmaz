import { inArray } from 'drizzle-orm';
import { cvHobby } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession } from '../graphql/generated';

export async function cvHobbiesDelete(
    userId: string,
    cvHobbyIds: readonly string[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const deleted = await serverRuntime.db
            .delete(cvHobby)
            .where(inArray(cvHobby.cvHobbyId, cvHobbyIds as string[]))
            .returning({ cvHobbyId: cvHobby.cvHobbyId });
        if (deleted.length !== cvHobbyIds.length) {
            const found = new Set(deleted.map((row) => row.cvHobbyId));
            const missing = cvHobbyIds.filter((id) => !found.has(id));
            throw new Error(`cvHobbiesDelete: rows not found: ${missing.join(', ')}`);
        }
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: [...cvHobbyIds] };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
