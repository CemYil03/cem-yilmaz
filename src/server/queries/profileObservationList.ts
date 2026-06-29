import { and, desc, eq, isNull } from 'drizzle-orm';
import { chatMessages, profileObservations } from '../db/schema';
import type { ProfileObservationCategory } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSProfileObservation, GqlSSession } from '../graphql/generated';
import { toGqlProfileObservation } from '../mappers/toGqlProfileObservation';

interface ProfileObservationListOptions {
    category: ProfileObservationCategory | null;
    includeDismissed: boolean;
}

// Reads observations newest-first, optionally filtered by category, and joins
// the spine `ChatMessages` to surface `sourceChatId` so the client can build a
// deep-link to the chat the observation came from.
export async function profileObservationList(
    options: ProfileObservationListOptions,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSProfileObservation[]> {
    try {
        const whereClauses = [];
        if (options.category) {
            whereClauses.push(eq(profileObservations.category, options.category));
        }
        if (!options.includeDismissed) {
            whereClauses.push(isNull(profileObservations.dismissedAt));
        }

        const rows = await serverRuntime.db
            .select({
                observation: profileObservations,
                sourceChatId: chatMessages.chatId,
            })
            .from(profileObservations)
            .leftJoin(chatMessages, eq(chatMessages.chatMessageId, profileObservations.sourceChatMessageId))
            .where(whereClauses.length > 0 ? and(...whereClauses) : undefined)
            .orderBy(desc(profileObservations.createdAt));

        return rows.map((row) => toGqlProfileObservation(row.observation, row.sourceChatId ?? null));
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
