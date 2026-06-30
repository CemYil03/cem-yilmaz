import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession } from '../graphql/generated';
import { profileSynthesize } from '../jobs/handlers/profileSynthesize';

// Enqueues a `profileSynthesize` job and returns immediately. The job rewrites
// the four profile fields and resets `observationsSinceSynthesis`. The
// `/workspace/profile` page polls (or re-queries on focus) to pick up the
// updated row. See `docs/features/profile.md`.
export async function profileSynthesizeRequest(
    userId: string,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const referenceId = await serverRuntime.jobs.enqueue(profileSynthesize, { reason: 'manual' });
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: referenceId ?? null };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
