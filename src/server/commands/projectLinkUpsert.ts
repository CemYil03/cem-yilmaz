import { eq } from 'drizzle-orm';
import { projectLinks } from '../db/schema';
import type { ProjectLinkCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutationProjectLinkUpsertArgs, GqlSProjectLink, GqlSSession } from '../graphql/generated';
import { toGqlProjectLink } from '../mappers/toGqlProjectLink';

// Create or update a project link. `activityId` is honoured on create
// (marks the link as "born from" that activity); on update it's ignored —
// the relationship to the activity is immutable once set, the FK
// cascade-set-null handles activity deletion.
export async function projectLinkUpsert(
    userId: string,
    args: GqlSAdminMutationProjectLinkUpsertArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSProjectLink> {
    const { input } = args;

    const now = new Date();
    const projectLinkId = input.projectLinkId ?? crypto.randomUUID();
    const payload: ProjectLinkCreate = {
        projectLinkId,
        projectId: input.projectId,
        activityId: input.activityId ?? null,
        url: input.url,
        label: input.label ?? null,
        kind: input.kind,
        pinned: input.pinned ?? false,
        updatedAt: now,
    };

    try {
        let row;
        if (input.projectLinkId) {
            const [updated] = await serverRuntime.db
                .update(projectLinks)
                .set({
                    url: payload.url,
                    label: payload.label,
                    kind: payload.kind,
                    pinned: payload.pinned,
                    updatedAt: now,
                })
                .where(eq(projectLinks.projectLinkId, input.projectLinkId))
                .returning();
            if (!updated) throw new Error(`projectLinkUpsert: row ${input.projectLinkId} not found`);
            row = updated;
        } else {
            const [inserted] = await serverRuntime.db.insert(projectLinks).values(payload).returning();
            if (!inserted) throw new Error('projectLinkUpsert: insert returned no rows');
            row = inserted;
        }
        await serverRuntime.publish.userUpdates({ userId });
        return toGqlProjectLink(row);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
