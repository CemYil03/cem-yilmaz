import { eq } from 'drizzle-orm';
import { projectLinks } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutationProjectLinkDeleteArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Permanent delete of one project link row. Underlying resource (the URL
// itself) is unmanaged — this just removes the project-side reference.
export async function projectLinkDelete(
    args: GqlSAdminMutationProjectLinkDeleteArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const deleted = await serverRuntime.db
            .delete(projectLinks)
            .where(eq(projectLinks.projectLinkId, args.projectLinkId))
            .returning({ projectLinkId: projectLinks.projectLinkId });
        if (deleted.length === 0) {
            throw new Error(`projectLinkDelete: row ${args.projectLinkId} not found`);
        }
        return { success: true, referenceId: null };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
