import { eq, or } from 'drizzle-orm';
import { compassInterviews } from '../db/schema';
import type { CompassInterview } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';

// Returns the single open interview, if any — either `pending` (the cron
// inserted one and Cem hasn't started) or `in_progress` (he's mid-interview).
// The page surface uses this to render the "waiting" / "resume" card.
//
// At most one open interview can exist at a time: the cron handler short-
// circuits when a pending row already exists, and the start command can only
// transition pending → in_progress on the same row. If the invariant ever
// breaks (two opens), we return the newer one and log — the page renders
// one card; the older row will get cleaned up by a future skip or end.
export async function adminCompassInterviewPendingFindOne(serverRuntime: ServerRuntime): Promise<CompassInterview | null> {
    const rows = await serverRuntime.db
        .select()
        .from(compassInterviews)
        .where(or(eq(compassInterviews.status, 'pending'), eq(compassInterviews.status, 'in_progress')))
        .orderBy(compassInterviews.dueAt);

    if (rows.length === 0) return null;
    if (rows.length > 1) {
        serverRuntime.log.warn(
            `compassInterviewActiveDueGet: ${rows.length} open interviews exist (expected at most one); returning the newest`,
        );
    }
    // Newest by `dueAt` since the cron's idempotency check is the invariant
    // anchor: a second open row only appears if that check raced or was bypassed.
    return rows[rows.length - 1] ?? null;
}
