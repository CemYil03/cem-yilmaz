import type { ProfileObservation } from '../db/schema';
import type { GqlSProfileObservation } from '../graphql/generated';

// Mapper takes the row plus the source chat id so the chat-deep-link can
// resolve in one hop on the UI side. The query that loads observations joins
// the spine row to discover `sourceChatId` — see `profileObservationList`.
export function toGqlProfileObservation(row: ProfileObservation, sourceChatId: string | null): GqlSProfileObservation {
    return {
        observationId: row.observationId,
        category: row.category,
        content: row.content,
        confidence: row.confidence,
        analyzerModelId: row.analyzerModelId,
        sourceChatMessageId: row.sourceChatMessageId,
        sourceChatId,
        dismissedAt: row.dismissedAt,
        createdAt: row.createdAt,
    };
}
