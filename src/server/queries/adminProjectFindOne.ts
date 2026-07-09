import { asc, desc, eq, inArray } from 'drizzle-orm';
import { fileUploads, projectActivities, projectFiles, projectLinks, projectRequests, projects, tasks } from '../db/schema';
import type { FileUpload } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSProject, GqlSSession } from '../graphql/generated';
import { toGqlProject } from '../mappers/toGqlProject';

// Loads a single project by id with every nested row needed by the detail
// route (`/workspace/projects/$projectId`): tasks, activities, links,
// files (with their underlying uploads), and the optional source request.
// Mirrors the in-memory normalization strategy in `projectsList`, but
// scoped to one project — cheaper than running the list and filtering
// client-side.
//
// Throws when the project does not exist.
export async function adminProjectFindOne(
    projectId: string,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSProject> {
    try {
        const [row] = await serverRuntime.db
            .select({ project: projects, sourceRequest: projectRequests })
            .from(projects)
            .leftJoin(projectRequests, eq(projectRequests.projectRequestId, projects.sourceRequestId))
            .where(eq(projects.projectId, projectId))
            .limit(1);

        if (!row) throw new Error(`project ${projectId} not found`);

        const taskRows = await serverRuntime.db.select().from(tasks).where(eq(tasks.projectId, projectId)).orderBy(asc(tasks.position));

        const activityRows = await serverRuntime.db
            .select()
            .from(projectActivities)
            .where(eq(projectActivities.projectId, projectId))
            .orderBy(desc(projectActivities.occurredAt));

        const totalWorkSec = activityRows.reduce((sum, a) => (a.kind === 'work' && a.durationSec ? sum + a.durationSec : sum), 0);

        const linkRows = await serverRuntime.db
            .select()
            .from(projectLinks)
            .where(eq(projectLinks.projectId, projectId))
            .orderBy(desc(projectLinks.createdAt));

        const fileRows = await serverRuntime.db
            .select()
            .from(projectFiles)
            .where(eq(projectFiles.projectId, projectId))
            .orderBy(desc(projectFiles.createdAt));

        const fileUploadsById = new Map<string, FileUpload>();
        if (fileRows.length > 0) {
            const uploadIds = Array.from(new Set(fileRows.map((f) => f.fileUploadId)));
            const uploadRows = await serverRuntime.db.select().from(fileUploads).where(inArray(fileUploads.fileUploadId, uploadIds));
            for (const u of uploadRows) fileUploadsById.set(u.fileUploadId, u);
        }

        return toGqlProject(row.project, taskRows, row.sourceRequest, activityRows, totalWorkSec, linkRows, fileRows, fileUploadsById);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
