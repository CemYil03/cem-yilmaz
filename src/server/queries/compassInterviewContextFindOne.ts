import { desc, eq, isNull } from 'drizzle-orm';
import { compass, compassObservations } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { COMPASS_SINGLETON_ID } from '../agents/compassConfig';
import { COMPASS_INTERVIEW_RECENT_OBSERVATIONS_COUNT } from '../agents/compassInterviewConfig';

// FIREWALL EXCEPTION ANCHOR.
//
// The personal assistant sees only `Compass.summary` (via `compassSummaryGet`).
// The psychological-interview agent — and ONLY that agent — sees a wider
// slice: `summary` + `psychology` + recent non-dismissed observations. Its
// whole job is to probe gaps in the existing picture without repeating
// itself; without `psychology` and recent observations it would ask
// redundant questions every time.
//
// The widening is anchored here on purpose. There must be exactly one
// caller (`agentCompassInterviewer`). If you find yourself wanting another
// reader of this richer slice — DO NOT add it. Write a narrower query.
//
// See `docs/features/compass.md` ("Psychological-interview agent" →
// "Firewall exception").

export interface CompassInterviewContext {
    summary: string;
    psychology: string;
    // Newest-first, capped at `COMPASS_INTERVIEW_RECENT_OBSERVATIONS_COUNT`,
    // dismissed rows excluded. Each entry is `[category] content`.
    recentObservations: string[];
}

export async function compassInterviewContextFindOne(serverRuntime: ServerRuntime): Promise<CompassInterviewContext> {
    try {
        const [compassRow] = await serverRuntime.db
            .select({ summary: compass.summary, psychology: compass.psychology })
            .from(compass)
            .where(eq(compass.compassId, COMPASS_SINGLETON_ID))
            .limit(1);

        const observations = await serverRuntime.db
            .select({
                category: compassObservations.category,
                content: compassObservations.content,
            })
            .from(compassObservations)
            .where(isNull(compassObservations.dismissedAt))
            .orderBy(desc(compassObservations.createdAt))
            .limit(COMPASS_INTERVIEW_RECENT_OBSERVATIONS_COUNT);

        return {
            summary: compassRow?.summary ?? '',
            psychology: compassRow?.psychology ?? '',
            recentObservations: observations.map((o) => `[${o.category}] ${o.content}`),
        };
    } catch (error) {
        // A failed context read shouldn't prevent the interview from running
        // — degrade to "no prior context" and let the agent ask broader
        // questions. Same pattern as `compassSummaryGet` for the personal
        // assistant.
        serverRuntime.log.error(error, null);
        return { summary: '', psychology: '', recentObservations: [] };
    }
}
