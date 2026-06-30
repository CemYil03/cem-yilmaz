import type { Session } from '../db/schema';
import type { GqlSSession } from '../graphql/generated';

export function toGqlSession(session: Session): GqlSSession {
    return {
        sessionId: session.sessionId,
        userId: session.userId,

        // resolved fields — populated by Session.* resolvers in resolversCreate.ts.
        // The mapper still has to satisfy the generated type, so the placeholder
        // values mirror the corresponding resolvers' return shapes.
        user: null,
        visitorChats: [],
        visitorChat: {} as never,
        visitorChatQuota: { used: 0, limit: 0, resetsAt: null },
    };
}
