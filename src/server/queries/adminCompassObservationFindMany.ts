import { and, desc, eq, isNull } from 'drizzle-orm';
import { chatMessages, compassInterviewMessages, compassObservations } from '../db/schema';
import type { CompassObservationCategory } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSCompassObservation, GqlSSession } from '../graphql/generated';
import { toGqlCompassObservation } from '../mappers/toGqlCompassObservation';

interface CompassObservationListOptions {
    category: CompassObservationCategory | null;
    includeDismissed: boolean;
}

// Reads observations newest-first, optionally filtered by category, and joins
// either spine table to surface the source parent id (chat or interview) so
// the client can build a deep-link to the originating thread without a
// second round-trip. Each row has exactly one source set; the corresponding
// join populates one of the two parent ids.
export async function adminCompassObservationFindMany(
    options: CompassObservationListOptions,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSCompassObservation[]> {
    try {
        const whereClauses = [];
        if (options.category) {
            whereClauses.push(eq(compassObservations.category, options.category));
        }
        if (!options.includeDismissed) {
            whereClauses.push(isNull(compassObservations.dismissedAt));
        }

        const rows = await serverRuntime.db
            .select({
                observation: compassObservations,
                sourceChatId: chatMessages.chatId,
                sourceInterviewId: compassInterviewMessages.interviewId,
            })
            .from(compassObservations)
            .leftJoin(chatMessages, eq(chatMessages.chatMessageId, compassObservations.sourceChatMessageId))
            .leftJoin(
                compassInterviewMessages,
                eq(compassInterviewMessages.interviewMessageId, compassObservations.sourceInterviewMessageId),
            )
            .where(whereClauses.length > 0 ? and(...whereClauses) : undefined)
            .orderBy(desc(compassObservations.createdAt));

        return rows.map((row) => toGqlCompassObservation(row.observation, row.sourceChatId ?? null, row.sourceInterviewId ?? null));
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
