import { desc, eq } from 'drizzle-orm';
import { tripActivities, tripDays } from '../db/schema';
import type { TripActivityCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutationTripActivityUpsertArgs, GqlSSession, GqlSTripActivity } from '../graphql/generated';
import { toGqlTripActivity } from '../mappers/toGqlTripActivity';

// Upsert one activity on a `TripDay`. Verifies the parent day exists.
// `position` defaults to "one past the current max" for the day so an
// unspecified insert lands at the end.
export async function tripActivityUpsert(
    userId: string,
    args: GqlSAdminMutationTripActivityUpsertArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSTripActivity> {
    const { input } = args;
    const tripActivityId = input.tripActivityId ?? crypto.randomUUID();
    const now = new Date();

    try {
        const [parent] = await serverRuntime.db
            .select({ tripDayId: tripDays.tripDayId })
            .from(tripDays)
            .where(eq(tripDays.tripDayId, input.tripDayId))
            .limit(1);
        if (!parent) throw new Error(`tripActivityUpsert: tripDay ${input.tripDayId} not found`);

        let position = input.position ?? null;
        if (position === null && !input.tripActivityId) {
            const [top] = await serverRuntime.db
                .select({ position: tripActivities.position })
                .from(tripActivities)
                .where(eq(tripActivities.tripDayId, input.tripDayId))
                .orderBy(desc(tripActivities.position))
                .limit(1);
            position = top ? top.position + 1 : 0;
        }

        const payload: TripActivityCreate = {
            tripActivityId,
            tripDayId: input.tripDayId,
            position: position ?? 0,
            startsAt: input.startsAt ?? null,
            endsAt: input.endsAt ?? null,
            title: input.title,
            location: input.location ?? null,
            url: input.url ?? null,
            notes: input.notes ?? null,
            updatedAt: now,
        };

        let row;
        if (input.tripActivityId) {
            const [updated] = await serverRuntime.db
                .update(tripActivities)
                .set(payload)
                .where(eq(tripActivities.tripActivityId, input.tripActivityId))
                .returning();
            if (!updated) throw new Error(`tripActivityUpsert: row ${input.tripActivityId} not found`);
            row = updated;
        } else {
            const [inserted] = await serverRuntime.db.insert(tripActivities).values(payload).returning();
            if (!inserted) throw new Error('tripActivityUpsert: insert returned no rows');
            row = inserted;
        }

        await serverRuntime.publish.userUpdates({ userId });
        return toGqlTripActivity(row);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
