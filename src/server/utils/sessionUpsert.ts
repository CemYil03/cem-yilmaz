import { and, eq, isNull } from 'drizzle-orm';

import type { GqlSSession } from '../graphql/generated';
import { sessions } from '../db/schema';
import type { Session } from '../db/schema';
import type { Database } from '../db';
import type { Logger } from '../utils/loggerCreate';
import { toGqlSession } from '../mappers/toGqlSession';

export async function sessionUpsert(
    db: Database,
    log: Logger,
    existingSessionId: string | null,
    userAgent: string | null,
): Promise<GqlSSession> {
    try {
        let existingSession: Session | undefined;

        if (existingSessionId) {
            const result = await db
                .select()
                .from(sessions)
                .where(and(eq(sessions.sessionId, existingSessionId), isNull(sessions.wasTerminatedAt)));
            existingSession = result[0];
        }

        if (existingSession) {
            const [updatedSession] = await db
                .update(sessions)
                .set({ lastInteractionAt: new Date(), userAgent })
                .where(eq(sessions.sessionId, existingSession.sessionId))
                .returning();

            if (updatedSession) {
                return toGqlSession(updatedSession);
            }
        }

        const [createdSession] = await db.insert(sessions).values({ sessionId: crypto.randomUUID(), userAgent }).returning();

        if (!createdSession) {
            throw new Error('Session could not be created in sessionUpsert.');
        }

        return toGqlSession(createdSession);
    } catch (error) {
        log.error(error, existingSessionId ? { sessionId: existingSessionId } : undefined);
        throw error;
    }
}
