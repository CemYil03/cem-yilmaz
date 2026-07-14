import { tool } from 'ai';
import { inArray } from 'drizzle-orm';
import { z } from 'zod';
import { requireAdminUserId } from '../agents/requireAdminUserId';
import { projects } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Batch delete of projects. The `Tasks.projectId` FK is `ON DELETE CASCADE`,
// so every project-bound task is wiped along with each project. Standalone
// todos (projectId IS NULL) are untouched. `referenceIds` echoes the deleted
// ids in input order — a caller-supplied id that never existed makes the
// batch throw.
export async function adminProjectsDelete(
    userId: string,
    projectIds: readonly string[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const deleted = await serverRuntime.db
            .delete(projects)
            .where(inArray(projects.projectId, projectIds as string[]))
            .returning({ projectId: projects.projectId });
        if (deleted.length !== projectIds.length) {
            const found = new Set(deleted.map((row) => row.projectId));
            const missing = projectIds.filter((id) => !found.has(id));
            throw new Error(`adminProjectsDelete: rows not found: ${missing.join(', ')}`);
        }
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: [...projectIds] };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}

const toolProjectsDeleteInputSchema = z.object({
    projectIds: z.array(z.uuid()).min(1).describe('AdminProject ids from the system-prompt snapshot or a prior list call.'),
});

interface ProjectsAgentToolContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
}

export function toolProjectsDelete({ serverRuntime, session }: ProjectsAgentToolContext) {
    return tool({
        description: [
            'Permanently delete one or more projects. Every task under each project is cascaded away in the same',
            'transaction. Standalone todos (no parent project) are unaffected. Use this only when the user is',
            'unambiguously asking for a delete; for soft-archive, prefer `projectsUpsert` with `status: "archived"`.',
        ].join(' '),
        inputSchema: toolProjectsDeleteInputSchema,
        execute: async (input) => {
            return adminProjectsDelete(requireAdminUserId(session), input.projectIds, session, serverRuntime);
        },
    });
}
