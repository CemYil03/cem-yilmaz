import { asc, desc, inArray } from 'drizzle-orm';
import { exercises, workoutRoutineItems, workoutRoutines, workoutSessions, workoutSets } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';

// Compact markdown snapshot embedded in the fitness sub-agent's system prompt.
// The signature use-case is "what did I bench last time?" and logging
// "5×5 squats at 100kg", so the snapshot pre-computes, per exercise, the most
// recent logged set and the best (heaviest) working set — the agent can answer
// progression questions and address ids without a list call.
export async function fitnessSnapshotForAgent(serverRuntime: ServerRuntime): Promise<string> {
    const exerciseRows = await serverRuntime.db.select().from(exercises).orderBy(asc(exercises.muscleGroup), asc(exercises.name));
    const routineRows = await serverRuntime.db
        .select()
        .from(workoutRoutines)
        .orderBy(asc(workoutRoutines.position), asc(workoutRoutines.name));
    const sessionRows = await serverRuntime.db
        .select()
        .from(workoutSessions)
        .orderBy(desc(workoutSessions.date), desc(workoutSessions.createdAt))
        .limit(8);

    const exerciseIds = exerciseRows.map((e) => e.exerciseId);
    const routineIds = routineRows.map((r) => r.routineId);

    // All working (non-warmup) sets for the listed exercises, plus the sets of
    // the recent sessions, in one pass each.
    const setRows =
        exerciseIds.length > 0 ? await serverRuntime.db.select().from(workoutSets).where(inArray(workoutSets.exerciseId, exerciseIds)) : [];
    const routineItemRows =
        routineIds.length > 0
            ? await serverRuntime.db
                  .select()
                  .from(workoutRoutineItems)
                  .where(inArray(workoutRoutineItems.routineId, routineIds))
                  .orderBy(asc(workoutRoutineItems.routineId), asc(workoutRoutineItems.position))
            : [];

    // sessionId -> date, for attributing "last set" to a date.
    const sessionDateById = new Map<string, string>();
    for (const s of sessionRows) sessionDateById.set(s.sessionId, s.date);
    // Load dates for any session referenced by a set but outside the recent 8.
    const missingSessionIds = Array.from(new Set(setRows.map((s) => s.sessionId).filter((id) => !sessionDateById.has(id))));
    if (missingSessionIds.length > 0) {
        const extra = await serverRuntime.db
            .select({ sessionId: workoutSessions.sessionId, date: workoutSessions.date })
            .from(workoutSessions)
            .where(inArray(workoutSessions.sessionId, missingSessionIds));
        for (const s of extra) sessionDateById.set(s.sessionId, s.date);
    }

    const exerciseName = new Map(exerciseRows.map((e) => [e.exerciseId, e.name] as const));

    const lines: string[] = [];

    lines.push('## Exercises (with last & best working set)');
    if (exerciseRows.length === 0) {
        lines.push('(no exercises yet)');
    } else {
        for (const e of exerciseRows) {
            const sets = setRows.filter((s) => s.exerciseId === e.exerciseId && !s.isWarmup && s.weight != null);
            let suffix = '';
            if (sets.length > 0) {
                const last = sets.reduce((a, b) =>
                    (sessionDateById.get(b.sessionId) ?? '') > (sessionDateById.get(a.sessionId) ?? '') ? b : a,
                );
                const best = sets.reduce((a, b) => ((b.weight ?? 0) > (a.weight ?? 0) ? b : a));
                const lastStr = `last ${last.weight}kg×${last.reps ?? '?'} (${sessionDateById.get(last.sessionId) ?? '?'})`;
                const bestStr = `best ${best.weight}kg×${best.reps ?? '?'}`;
                suffix = ` — ${lastStr}, ${bestStr}`;
            }
            lines.push(`- ${e.name} [${e.muscleGroup}]${suffix} (id: ${e.exerciseId})`);
        }
    }

    lines.push('', '## Routines');
    if (routineRows.length === 0) {
        lines.push('(no routines yet)');
    } else {
        for (const r of routineRows) {
            const items = routineItemRows.filter((i) => i.routineId === r.routineId);
            const itemStr = items.map((i) => exerciseName.get(i.exerciseId) ?? '?').join(', ');
            lines.push(`- ${r.name}: ${itemStr || '(empty)'} (id: ${r.routineId})`);
        }
    }

    lines.push('', '## Recent sessions (last 8)');
    if (sessionRows.length === 0) {
        lines.push('(no sessions yet)');
    } else {
        for (const s of sessionRows) {
            const count = setRows.filter((set) => set.sessionId === s.sessionId).length;
            lines.push(`- ${s.date} ${s.title ?? ''} — ${count} sets (id: ${s.sessionId})`);
        }
    }

    return lines.join('\n');
}
