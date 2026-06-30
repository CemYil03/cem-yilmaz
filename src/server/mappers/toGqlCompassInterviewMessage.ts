import type { CompassInterviewMessage } from '../db/schema';
import type { GqlSCompassInterviewMessage } from '../graphql/generated';

export function toGqlCompassInterviewMessage(row: CompassInterviewMessage): GqlSCompassInterviewMessage {
    return {
        interviewMessageId: row.interviewMessageId,
        role: row.role,
        content: row.content,
        modelId: row.modelId,
        createdAt: row.createdAt,
    };
}
