import { tool } from 'ai';
import { inArray } from 'drizzle-orm';
import { z } from 'zod';
import { requireAdminUserId } from '../agents/requireAdminUserId';
import { tripDays } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Batch delete of trip days. FK cascade removes each day's activities.
export async function adminTravelTripDaysDelete(
    userId: string,
    tripDayIds: readonly string[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const deleted = await serverRuntime.db
            .delete(tripDays)
            .where(inArray(tripDays.tripDayId, tripDayIds as string[]))
            .returning({ tripDayId: tripDays.tripDayId });
        if (deleted.length !== tripDayIds.length) {
            const found = new Set(deleted.map((row) => row.tripDayId));
            const missing = tripDayIds.filter((id) => !found.has(id));
            throw new Error(`adminTravelTripDaysDelete: rows not found: ${missing.join(', ')}`);
        }
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: [...tripDayIds] };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}

const tripDaysDeleteInputSchema = z.object({
    tripDayIds: z.array(z.uuid()).min(1).describe('Trip-day row ids to delete. Cascade removes the activities on those days.'),
});

interface TravelAgentToolContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
}

export function toolTripDaysDelete({ serverRuntime, session }: TravelAgentToolContext) {
    return tool({
        description: 'Delete one or more days of a trip. Activities on those days cascade.',
        inputSchema: tripDaysDeleteInputSchema,
        execute: async (input) => {
            return adminTravelTripDaysDelete(requireAdminUserId(session), input.tripDayIds, session, serverRuntime);
        },
    });
}
