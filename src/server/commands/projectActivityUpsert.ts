import { eq } from 'drizzle-orm';
import { fileUploads, projectActivities, projectFiles, projectLinks } from '../db/schema';
import type {
    FileUpload,
    ProjectActivityCreate,
    ProjectActivityDirection,
    ProjectActivityKind,
    ProjectFile,
    ProjectLink,
} from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutationProjectActivityUpsertArgs, GqlSProjectActivity, GqlSSession } from '../graphql/generated';
import { toGqlProjectActivity } from '../mappers/toGqlProjectActivity';

// Resolve the `direction` column for a non-timer activity. `work` / `note` /
// `milestone` are always `internal` (they're not a turn in a dialogue); for
// the client-facing kinds we respect what the client sent and fall back to a
// kind-appropriate default: a logged client-contact row is most often
// inbound, while meeting and offer rows are typically outbound from Cem.
function resolveDirection(kind: ProjectActivityKind, explicit: ProjectActivityDirection | null | undefined): ProjectActivityDirection {
    if (kind === 'work' || kind === 'note' || kind === 'milestone') return 'internal';
    if (explicit) return explicit;
    if (kind === 'clientContact') return 'incoming';
    return 'outgoing';
}

// Create or update a project activity row. Reserved for event-style
// entries (logged call, email, offer drafted, freeform note). Timed work
// sessions are owned by `projectTimerStart` / `projectTimerStop`, so
// passing `kind = 'work'` here is rejected — it would let a hand-crafted
// payload bypass the one-active-timer invariant. Pass an explicit
// `durationSec` for non-timer rows when the duration is known
// ("the call was 45 min"); leave it null otherwise.
//
// `attachLink*` / `attachFile*` are optional one-shot side-effects on
// create: when present the server inserts a matching `ProjectLink` /
// `ProjectFile` in the same transaction with `activityId` pointing at the
// new activity. Lets the editor say "log offer + attach PDF" without two
// round-trips. Ignored on update — edit the resource rows directly through
// their own mutations.
//
// `amountCents` / `offerStatus` are meaningful only when `kind = offer`;
// other kinds reject any non-null value so the editor's "hide for non-
// offer kinds" stays a sound invariant.
export async function projectActivityUpsert(
    userId: string,
    args: GqlSAdminMutationProjectActivityUpsertArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSProjectActivity> {
    const { input } = args;

    if (input.kind === 'work') {
        throw new Error('projectActivityUpsert: work-kind rows are owned by the timer mutations');
    }
    // The channel column is meaningful only for client-contact / meeting
    // entries; reject any other combination so the UI's "hide for non-
    // contact kinds" stays a sound invariant rather than a convention.
    if (input.channel && input.kind !== 'clientContact' && input.kind !== 'meeting') {
        throw new Error(`projectActivityUpsert: channel is only valid for clientContact / meeting (got kind='${input.kind}')`);
    }
    if ((input.amountCents != null || input.offerStatus != null) && input.kind !== 'offer') {
        throw new Error(`projectActivityUpsert: amountCents / offerStatus are only valid for offer (got kind='${input.kind}')`);
    }

    const now = new Date();
    const activityId = input.activityId ?? crypto.randomUUID();
    const payload: ProjectActivityCreate = {
        activityId,
        projectId: input.projectId,
        taskId: input.taskId ?? null,
        kind: input.kind,
        channel: input.channel ?? null,
        direction: resolveDirection(input.kind, input.direction),
        title: input.title,
        notes: input.notes ?? null,
        occurredAt: input.occurredAt,
        startedAt: null,
        endedAt: null,
        durationSec: input.durationSec ?? null,
        amountCents: input.amountCents ?? null,
        offerStatus: input.offerStatus ?? null,
        updatedAt: now,
    };

    try {
        if (input.activityId) {
            const [updated] = await serverRuntime.db
                .update(projectActivities)
                .set(payload)
                .where(eq(projectActivities.activityId, input.activityId))
                .returning();
            if (!updated) {
                throw new Error(`projectActivityUpsert: row ${input.activityId} not found`);
            }
            await serverRuntime.publish.userUpdates({ userId });
            return toGqlProjectActivity(updated);
        }

        // Create path. If either attach field set is supplied, run the
        // insert + side-effect inserts as one transaction so a failed
        // resource insert rolls the activity back too.
        const hasAttachLink = !!input.attachLinkUrl && !!input.attachLinkKind;
        const hasAttachFile = !!input.attachFileUploadId && !!input.attachFileKind;

        if (!hasAttachLink && !hasAttachFile) {
            const [inserted] = await serverRuntime.db.insert(projectActivities).values(payload).returning();
            if (!inserted) throw new Error('projectActivityUpsert: insert returned no rows');
            await serverRuntime.publish.userUpdates({ userId });
            return toGqlProjectActivity(inserted);
        }

        const result = await serverRuntime.db.transaction(async (tx) => {
            const [inserted] = await tx.insert(projectActivities).values(payload).returning();
            if (!inserted) throw new Error('projectActivityUpsert: insert returned no rows');

            let linkRow: ProjectLink | undefined;
            let fileRow: ProjectFile | undefined;
            let fileUpload: FileUpload | undefined;

            if (hasAttachLink) {
                const [link] = await tx
                    .insert(projectLinks)
                    .values({
                        projectLinkId: crypto.randomUUID(),
                        projectId: inserted.projectId,
                        activityId: inserted.activityId,
                        url: input.attachLinkUrl!,
                        label: input.attachLinkLabel ?? null,
                        kind: input.attachLinkKind!,
                        pinned: input.attachLinkPinned ?? false,
                        updatedAt: now,
                    })
                    .returning();
                if (!link) throw new Error('projectActivityUpsert: attached link insert returned no rows');
                linkRow = link;
            }

            if (hasAttachFile) {
                const [upload] = await tx
                    .select()
                    .from(fileUploads)
                    .where(eq(fileUploads.fileUploadId, input.attachFileUploadId!))
                    .limit(1);
                if (!upload) throw new Error(`projectActivityUpsert: fileUpload ${input.attachFileUploadId} not found`);
                fileUpload = upload;
                const [file] = await tx
                    .insert(projectFiles)
                    .values({
                        projectFileId: crypto.randomUUID(),
                        projectId: inserted.projectId,
                        activityId: inserted.activityId,
                        fileUploadId: input.attachFileUploadId!,
                        label: input.attachFileLabel ?? null,
                        kind: input.attachFileKind!,
                        pinned: input.attachFilePinned ?? false,
                        updatedAt: now,
                    })
                    .returning();
                if (!file) throw new Error('projectActivityUpsert: attached file insert returned no rows');
                fileRow = file;
            }

            return { inserted, linkRow, fileRow, fileUpload };
        });

        const uploadsById = new Map<string, FileUpload>();
        if (result.fileUpload) uploadsById.set(result.fileUpload.fileUploadId, result.fileUpload);
        await serverRuntime.publish.userUpdates({ userId });
        return toGqlProjectActivity(
            result.inserted,
            result.linkRow ? [result.linkRow] : [],
            result.fileRow ? [result.fileRow] : [],
            uploadsById,
        );
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
