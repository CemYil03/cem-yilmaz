import { desc } from 'drizzle-orm';
import { compassInterviews } from '../db/schema';
import type { CompassInterview } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';

// Lists all interviews newest-first for the "Past interviews" rail on the
// compass page. The pending and in-progress rows naturally sit at the top —
// the page renders them with prominent affordances ("Start" / "Resume") and
// the completed/skipped ones as a quiet history strip beneath.
//
// No pagination today — the cadence is weekly and Cem is the only user, so
// even a year of interviews is well under any UI ceiling. Phase 2 can add a
// limit once that stops being true.
export async function adminCompassInterviewFindMany(serverRuntime: ServerRuntime): Promise<CompassInterview[]> {
    return serverRuntime.db.select().from(compassInterviews).orderBy(desc(compassInterviews.createdAt));
}
