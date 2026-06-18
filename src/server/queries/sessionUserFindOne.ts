import { eq } from 'drizzle-orm';
import { users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession, GqlSUser } from '../graphql/generated';
import { toGqlUser } from '../mappers/toGqlUser';

export async function sessionUserFindOne(requestingSession: GqlSSession, serverRuntime: ServerRuntime): Promise<GqlSUser | null> {
    if (!requestingSession.userId) {
        return null;
    }

    try {
        const [user] = await serverRuntime.db.select().from(users).where(eq(users.userId, requestingSession.userId));

        if (!user) {
            throw new Error('user not found');
        }

        return toGqlUser(user);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
