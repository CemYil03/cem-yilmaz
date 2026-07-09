import { inArray } from 'drizzle-orm';
import { cvExperience } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Batch delete of CV experience rows. `referenceIds` echoes the deleted
// ids in input order — a caller-supplied id that never existed makes the
// batch throw (same posture as the singular delete had).
export async function cvExperiencesDelete(
    userId: string,
    cvExperienceIds: readonly string[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const deleted = await serverRuntime.db
            .delete(cvExperience)
            .where(inArray(cvExperience.cvExperienceId, cvExperienceIds as string[]))
            .returning({ cvExperienceId: cvExperience.cvExperienceId });
        if (deleted.length !== cvExperienceIds.length) {
            const found = new Set(deleted.map((row) => row.cvExperienceId));
            const missing = cvExperienceIds.filter((id) => !found.has(id));
            throw new Error(`cvExperiencesDelete: rows not found: ${missing.join(', ')}`);
        }
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: [...cvExperienceIds] };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
