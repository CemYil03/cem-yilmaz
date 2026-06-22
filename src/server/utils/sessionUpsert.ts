import { and, eq, isNull } from 'drizzle-orm';
import { createHash } from 'node:crypto';

import type { GqlSSession } from '../graphql/generated';
import { sessions } from '../db/schema';
import type { Session } from '../db/schema';
import type { Database } from '../db';
import { environmentVariables } from '../env/environmentVariablesCreate';
import type { Logger } from '../utils/loggerCreate';
import { toGqlSession } from '../mappers/toGqlSession';

// Hashes the request IP into the column we persist on `Sessions.ipHash`.
// Salted with `VISITOR_IP_HASH_SALT` (per-deploy) so a DB leak does not
// expose visitor IPs and two deploys cannot be cross-correlated. Returns
// `null` when no client IP was resolvable — see `clientIpFromRequest`.
function ipHashCompute(clientIp: string | null): string | null {
    if (!clientIp) return null;
    return createHash('sha256').update(`${environmentVariables.visitorIpHashSalt}:${clientIp}`).digest('hex');
}

export async function sessionUpsert(
    db: Database,
    log: Logger,
    existingSessionId: string | null,
    userAgent: string | null,
    clientIp: string | null,
): Promise<GqlSSession> {
    try {
        const ipHash = ipHashCompute(clientIp);

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
                .set({ lastInteractionAt: new Date(), userAgent, ipHash })
                .where(eq(sessions.sessionId, existingSession.sessionId))
                .returning();

            if (updatedSession) {
                return toGqlSession(updatedSession);
            }
        }

        const [createdSession] = await db.insert(sessions).values({ sessionId: crypto.randomUUID(), userAgent, ipHash }).returning();

        if (!createdSession) {
            throw new Error('Session could not be created in sessionUpsert.');
        }

        return toGqlSession(createdSession);
    } catch (error) {
        log.error(error, existingSessionId ? { sessionId: existingSessionId } : undefined);
        throw error;
    }
}
