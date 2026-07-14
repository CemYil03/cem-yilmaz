import { tool } from 'ai';
import { inArray } from 'drizzle-orm';
import { z } from 'zod';
import { requireAdminUserId } from '../agents/requireAdminUserId';
import { trips } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Batch delete of trips. FK cascades remove each trip's days, activities,
// and packing items. `referenceIds` echoes the deleted ids in input order —
// a caller-supplied id that never existed makes the batch throw (same
// posture as the singular delete had).
export async function adminTravelTripsDelete(
    userId: string,
    tripIds: readonly string[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const deleted = await serverRuntime.db
            .delete(trips)
            .where(inArray(trips.tripId, tripIds as string[]))
            .returning({ tripId: trips.tripId });
        if (deleted.length !== tripIds.length) {
            const found = new Set(deleted.map((row) => row.tripId));
            const missing = tripIds.filter((id) => !found.has(id));
            throw new Error(`adminTravelTripsDelete: rows not found: ${missing.join(', ')}`);
        }
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: [...tripIds] };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}

interface TravelAgentToolContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
}

export function toolTripsDelete({ serverRuntime, session }: TravelAgentToolContext) {
    return tool({
        description: 'Permanently delete one or more trips and everything under them. Use only when Cem explicitly says to delete.',
        inputSchema: z.object({
            tripIds: z
                .array(z.uuid())
                .min(1)
                .describe('Trip row ids to delete. FK cascade removes each trip’s days, activities, and packing items.'),
        }),
        execute: async (input) => {
            return adminTravelTripsDelete(requireAdminUserId(session), input.tripIds, session, serverRuntime);
        },
    });
}
