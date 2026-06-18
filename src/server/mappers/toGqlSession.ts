import type { Session } from '../db/schema';
import type { GqlSChat, GqlSSession } from '../graphql/generated';

export function toGqlSession(session: Session): GqlSSession {
    return {
        sessionId: session.sessionId,
        userId: session.userId,

        // resolved fields
        user: null,
        chat: null as unknown as GqlSChat,
    };
}
