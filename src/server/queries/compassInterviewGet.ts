import { asc, eq } from 'drizzle-orm';
import { compassInterviewMessages, compassInterviews } from '../db/schema';
import type { CompassInterview, CompassInterviewMessage } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';

// Loads one interview row and its messages in chronological order. Returns
// `null` when the id doesn't resolve; callers translate that into the
// "not found" GraphQL response.
export async function compassInterviewGet(
    interviewId: string,
    serverRuntime: ServerRuntime,
): Promise<{ interview: CompassInterview; messages: CompassInterviewMessage[] } | null> {
    const [interview] = await serverRuntime.db
        .select()
        .from(compassInterviews)
        .where(eq(compassInterviews.interviewId, interviewId))
        .limit(1);
    if (!interview) return null;

    // Tie-break ties (two rows in the same millisecond) by id so the order is
    // deterministic across reads even when timestamps collide.
    const messages = await serverRuntime.db
        .select()
        .from(compassInterviewMessages)
        .where(eq(compassInterviewMessages.interviewId, interviewId))
        .orderBy(asc(compassInterviewMessages.createdAt), asc(compassInterviewMessages.interviewMessageId));

    return { interview, messages };
}
