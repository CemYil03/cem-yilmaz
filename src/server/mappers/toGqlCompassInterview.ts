import type { CompassInterview, CompassInterviewMessage } from '../db/schema';
import type { GqlSCompassInterview } from '../graphql/generated';
import { toGqlCompassInterviewMessage } from './toGqlCompassInterviewMessage';

// Maps a `CompassInterviews` row + its messages to the GraphQL `CompassInterview`
// type. `messages` is empty when the caller hasn't loaded them yet (e.g. the
// list-of-interviews query, which doesn't need the transcript per row); the
// single-interview query passes the full chronological list.
export function toGqlCompassInterview(row: CompassInterview, messages: CompassInterviewMessage[] = []): GqlSCompassInterview {
    return {
        interviewId: row.interviewId,
        status: row.status,
        dueAt: row.dueAt,
        startedAt: row.startedAt,
        completedAt: row.completedAt,
        endReason: row.endReason,
        triggerReason: row.triggerReason,
        observationCount: row.observationCount,
        messages: messages.map(toGqlCompassInterviewMessage),
    };
}
