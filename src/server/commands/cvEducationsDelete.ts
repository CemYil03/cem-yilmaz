import { inArray } from 'drizzle-orm';
import { cvEducation } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession } from '../graphql/generated';

export async function cvEducationsDelete(
    userId: string,
    cvEducationIds: readonly string[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const deleted = await serverRuntime.db
            .delete(cvEducation)
            .where(inArray(cvEducation.cvEducationId, cvEducationIds as string[]))
            .returning({ cvEducationId: cvEducation.cvEducationId });
        if (deleted.length !== cvEducationIds.length) {
            const found = new Set(deleted.map((row) => row.cvEducationId));
            const missing = cvEducationIds.filter((id) => !found.has(id));
            throw new Error(`cvEducationsDelete: rows not found: ${missing.join(', ')}`);
        }
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: [...cvEducationIds] };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
