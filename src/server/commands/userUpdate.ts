import { eq } from 'drizzle-orm';

import { users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession, GqlSUserMutationUserUpdateArgs } from '../graphql/generated';

export async function userUpdate(
    userId: string,
    { user }: GqlSUserMutationUserUpdateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const name = user.name.trim();

        if (name.length === 0) {
            throw new Error('userUpdate: name must not be empty');
        }

        const updated = await serverRuntime.db
            .update(users)
            .set({
                name,
            })
            .where(eq(users.userId, userId))
            .returning({ userId: users.userId });

        if (updated.length === 0) {
            throw new Error('userUpdate: user not found');
        }

        await serverRuntime.publish.userUpdates({ userId });

        return {
            success: true,
        };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
