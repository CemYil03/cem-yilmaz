import { eq, inArray } from 'drizzle-orm';
import { workoutRoutines, workoutSessions } from '../db/schema';
import type { WorkoutSessionCreate } from '../db/schema';
import type { GqlSMutationResult, GqlSSession, GqlSWorkoutSessionInput } from '../graphql/generated';
import type { ServerRuntime } from '../domain/ServerRuntime';

// Batch upsert of gym sessions. Every row with a `sessionId` is updated; every
// row without one is inserted. An optional `routineId` (the session was seeded
// from a routine) is verified in one round-trip. The `date` scalar is a
// `YYYY-MM-DD` string, matching the string-mode `date` column directly.
export async function workoutSessionsUpsert(
    userId: string,
    inputs: readonly GqlSWorkoutSessionInput[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    const now = new Date();

    const rows = inputs.map((session) => {
        const sessionId = session.sessionId ?? crypto.randomUUID();
        const payload: WorkoutSessionCreate = {
            sessionId,
            date: session.date,
            title: session.title ?? null,
            routineId: session.routineId ?? null,
            durationMinutes: session.durationMinutes ?? null,
            notes: session.notes ?? null,
            updatedAt: now,
        };
        return { sessionId, isUpdate: Boolean(session.sessionId), routineId: session.routineId ?? null, payload };
    });

    try {
        const routineIds = Array.from(new Set(rows.map((row) => row.routineId).filter((id): id is string => id !== null)));
        const updateIds = rows.filter((row) => row.isUpdate).map((row) => row.sessionId);
        await serverRuntime.db.transaction(async (transaction) => {
            if (routineIds.length > 0) {
                const found = await transaction
                    .select({ routineId: workoutRoutines.routineId })
                    .from(workoutRoutines)
                    .where(inArray(workoutRoutines.routineId, routineIds));
                if (found.length !== routineIds.length) {
                    const present = new Set(found.map((row) => row.routineId));
                    const missing = routineIds.filter((id) => !present.has(id));
                    throw new Error(`workoutSessionsUpsert: routines not found: ${missing.join(', ')}`);
                }
            }
            if (updateIds.length > 0) {
                const existing = await transaction
                    .select({ sessionId: workoutSessions.sessionId })
                    .from(workoutSessions)
                    .where(inArray(workoutSessions.sessionId, updateIds));
                if (existing.length !== updateIds.length) {
                    const present = new Set(existing.map((row) => row.sessionId));
                    const missing = updateIds.filter((id) => !present.has(id));
                    throw new Error(`workoutSessionsUpsert: rows not found: ${missing.join(', ')}`);
                }
            }
            for (const row of rows) {
                if (row.isUpdate) {
                    await transaction.update(workoutSessions).set(row.payload).where(eq(workoutSessions.sessionId, row.sessionId));
                } else {
                    await transaction.insert(workoutSessions).values(row.payload);
                }
            }
        });
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: rows.map((row) => row.sessionId) };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
