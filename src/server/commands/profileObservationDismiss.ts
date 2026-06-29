import { eq } from 'drizzle-orm';
import { profileObservations } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutationProfileObservationDismissArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Soft-dismiss an observation: stamp `dismissedAt` rather than deleting the
// row. Dismissed observations are excluded from the synthesizer's input but
// remain visible at `/workspace/profile` (toggle filter) so Cem can review
// what the analyzer once recorded. Idempotent — re-dismissing is a no-op.
export async function profileObservationDismiss(
    args: GqlSAdminMutationProfileObservationDismissArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const result = await serverRuntime.db
            .update(profileObservations)
            .set({ dismissedAt: new Date() })
            .where(eq(profileObservations.observationId, args.observationId))
            .returning({ observationId: profileObservations.observationId });
        if (result.length === 0) {
            return { success: false, referenceId: null };
        }
        return { success: true, referenceId: args.observationId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
