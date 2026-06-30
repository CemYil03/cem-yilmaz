import type { CompassObservation } from '../db/schema';
import type { GqlSCompassObservation } from '../graphql/generated';

// Mapper takes the row plus the resolved chat/interview ids so the source
// deep-links resolve in one hop on the UI side. Exactly one of the two
// source FKs on the row is set (`sourceChatMessageId` for admin-chat
// origins, `sourceInterviewMessageId` for psychological-interview origins);
// the corresponding parent id (`sourceChatId` / `sourceInterviewId`) is
// looked up by the query and threaded here.
export function toGqlCompassObservation(
    row: CompassObservation,
    sourceChatId: string | null,
    sourceInterviewId: string | null = null,
): GqlSCompassObservation {
    return {
        observationId: row.observationId,
        category: row.category,
        content: row.content,
        confidence: row.confidence,
        analyzerModelId: row.analyzerModelId,
        sourceChatMessageId: row.sourceChatMessageId,
        sourceChatId,
        sourceInterviewMessageId: row.sourceInterviewMessageId,
        sourceInterviewId,
        dismissedAt: row.dismissedAt,
        createdAt: row.createdAt,
    };
}
