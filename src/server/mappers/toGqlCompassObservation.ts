import type { CompassObservation } from '../db/schema';
import type { GqlSCompassObservation } from '../graphql/generated';

// Mapper takes the row plus the source chat id so the chat-deep-link can
// resolve in one hop on the UI side. The query that loads observations joins
// the spine row to discover `sourceChatId` — see `compassObservationList`.
export function toGqlCompassObservation(row: CompassObservation, sourceChatId: string | null): GqlSCompassObservation {
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
