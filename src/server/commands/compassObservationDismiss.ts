import { eq } from 'drizzle-orm';
import { compassObservations } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutationCompassObservationDismissArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Soft-dismiss an observation: stamp `dismissedAt` rather than deleting the
// row. Dismissed observations are excluded from the synthesizer's input but
// remain visible at `/workspace/compass` (toggle filter) so Cem can review
// what the analyzer once recorded. Idempotent — re-dismissing is a no-op.
export async function compassObservationDismiss(
    userId: string,
    args: GqlSAdminMutationCompassObservationDismissArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const result = await serverRuntime.db
            .update(compassObservations)
            .set({ dismissedAt: new Date() })
            .where(eq(compassObservations.observationId, args.observationId))
            .returning({ observationId: compassObservations.observationId });
        if (result.length === 0) {
            return { success: false, referenceId: null };
        }
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: args.observationId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
