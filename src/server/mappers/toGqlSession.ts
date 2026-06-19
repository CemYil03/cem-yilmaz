import type { Session } from '../db/schema';
import type { GqlSSession } from '../graphql/generated';

export function toGqlSession(session: Session): GqlSSession {
    return {
        sessionId: session.sessionId,
        userId: session.userId,

        // resolved fields
        user: null,
    };
}
