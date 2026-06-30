import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession } from '../graphql/generated';
import { compassSynthesize } from '../jobs/handlers/compassSynthesize';

// Enqueues a `compassSynthesize` job and returns immediately. The job rewrites
// the three compass artifacts and resets `observationsSinceSynthesis`. The
// `/workspace/compass` page polls (or re-queries on focus) to pick up the
// updated row. See `docs/features/compass.md`.
export async function compassSynthesizeRequest(
    userId: string,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const referenceId = await serverRuntime.jobs.enqueue(compassSynthesize, { reason: 'manual' });
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: referenceId ?? null };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
