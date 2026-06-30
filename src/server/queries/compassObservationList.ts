import { and, desc, eq, isNull } from 'drizzle-orm';
import { chatMessages, compassObservations } from '../db/schema';
import type { CompassObservationCategory } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSCompassObservation, GqlSSession } from '../graphql/generated';
import { toGqlCompassObservation } from '../mappers/toGqlCompassObservation';

interface CompassObservationListOptions {
    category: CompassObservationCategory | null;
    includeDismissed: boolean;
}

// Reads observations newest-first, optionally filtered by category, and joins
// the spine `ChatMessages` to surface `sourceChatId` so the client can build a
// deep-link to the chat the observation came from.
export async function compassObservationList(
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
            })
            .from(compassObservations)
            .leftJoin(chatMessages, eq(chatMessages.chatMessageId, compassObservations.sourceChatMessageId))
            .where(whereClauses.length > 0 ? and(...whereClauses) : undefined)
            .orderBy(desc(compassObservations.createdAt));

        return rows.map((row) => toGqlCompassObservation(row.observation, row.sourceChatId ?? null));
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
