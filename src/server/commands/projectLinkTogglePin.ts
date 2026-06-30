import { eq, not } from 'drizzle-orm';
import { projectLinks } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutationProjectLinkTogglePinArgs, GqlSProjectLink, GqlSSession } from '../graphql/generated';
import { toGqlProjectLink } from '../mappers/toGqlProjectLink';

// Flip `pinned` on a single link row. Returns the row in its new state so
// the URQL cache update is a straight write, no follow-up read needed.
export async function projectLinkTogglePin(
    userId: string,
    args: GqlSAdminMutationProjectLinkTogglePinArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSProjectLink> {
    try {
        const [updated] = await serverRuntime.db
            .update(projectLinks)
            .set({ pinned: not(projectLinks.pinned), updatedAt: new Date() })
            .where(eq(projectLinks.projectLinkId, args.projectLinkId))
            .returning();
        if (!updated) throw new Error(`projectLinkTogglePin: row ${args.projectLinkId} not found`);
        await serverRuntime.publish.userUpdates({ userId });
        return toGqlProjectLink(updated);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
