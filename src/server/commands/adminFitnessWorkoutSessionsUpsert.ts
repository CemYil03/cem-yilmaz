import { tool } from 'ai';
import { eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { requireAdminUserId } from '../agents/requireAdminUserId';
import { workoutRoutines, workoutSessions } from '../db/schema';
import type { AdminFitnessWorkoutSessionCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { GqlSAdminFitnessWorkoutSessionInputSchema } from '../graphql/generated';
import type { GqlSAdminFitnessWorkoutSessionInput, GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Batch upsert of gym sessions. Every row with a `sessionId` is updated; every
// row without one is inserted. An optional `routineId` (the session was seeded
// from a routine) is verified in one round-trip. The `date` scalar is a
// `YYYY-MM-DD` string, matching the string-mode `date` column directly.
export async function adminFitnessWorkoutSessionsUpsert(
    userId: string,
    inputs: readonly GqlSAdminFitnessWorkoutSessionInput[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    const now = new Date();

    const rows = inputs.map((session) => {
        const sessionId = session.sessionId ?? crypto.randomUUID();
        const payload: AdminFitnessWorkoutSessionCreate = {
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
                    throw new Error(`adminFitnessWorkoutSessionsUpsert: routines not found: ${missing.join(', ')}`);
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
                    throw new Error(`adminFitnessWorkoutSessionsUpsert: rows not found: ${missing.join(', ')}`);
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

const toolWorkoutSessionsUpsertInputSchema = z.object({
    workoutSessions: z.array(GqlSAdminFitnessWorkoutSessionInputSchema()).min(1),
});

interface FitnessAgentToolContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
}

export function toolWorkoutSessionsUpsert({ serverRuntime, session }: FitnessAgentToolContext) {
    return tool({
        description: [
            'Batch create-or-edit of gym sessions (the workout header: date, title, duration). Logging a workout is',
            'this call (one session) followed by `workoutSetsUpsert` (every set) using the returned `referenceIds`',
            'as the parent `sessionId`. `date` is `YYYY-MM-DD` — use today unless Cem says otherwise. Every row with',
            'a `sessionId` is updated; every row without one is inserted.',
        ].join(' '),
        inputSchema: toolWorkoutSessionsUpsertInputSchema,
        execute: async (rawInput) => {
            const inputs = rawInput.workoutSessions as GqlSAdminFitnessWorkoutSessionInput[];
            return adminFitnessWorkoutSessionsUpsert(requireAdminUserId(session), inputs, session, serverRuntime);
        },
    });
}
