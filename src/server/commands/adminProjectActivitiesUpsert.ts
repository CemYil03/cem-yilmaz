import { eq, inArray } from 'drizzle-orm';
import { fileUploads, projectActivities, projectFiles, projectLinks } from '../db/schema';
import type { AdminProjectActivityCreate, AdminProjectActivityDirection, AdminProjectActivityKind } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSAdminProjectActivityCreate, GqlSSession } from '../graphql/generated';

// Resolve the `direction` column for a non-timer activity. `work` / `note` /
// `milestone` are always `internal` (they're not a turn in a dialogue); for
// the client-facing kinds we respect what the client sent and fall back to a
// kind-appropriate default: a logged client-contact row is most often
// inbound, while meeting and offer rows are typically outbound from Cem.
function resolveDirection(
    kind: AdminProjectActivityKind,
    explicit: AdminProjectActivityDirection | null | undefined,
): AdminProjectActivityDirection {
    if (kind === 'work' || kind === 'note' || kind === 'milestone') return 'internal';
    if (explicit) return explicit;
    if (kind === 'clientContact') return 'incoming';
    return 'outgoing';
}

// Batch create-or-update of project activity rows. Reserved for event-style
// entries (logged call, email, offer drafted, freeform note). Timed work
// sessions are owned by `adminProjectTimersStart` / `adminProjectTimersStop`, so any
// input with `kind = 'work'` is rejected — it would let a hand-crafted
// payload bypass the one-active-timer invariant.
//
// Per input, `attachLink*` / `attachFile*` are optional one-shot side effects
// on create: when present the command inserts a matching `AdminProjectLink` /
// `AdminProjectFile` in the same transaction with `activityId` pointing at the new
// activity. Ignored on update — edit the resource rows through their own
// mutations. `amountCents` / `offerStatus` are meaningful only for
// `kind = offer`; `channel` only for `clientContact` / `meeting`. The whole
// batch runs inside a single transaction so a partial failure rolls back to
// zero writes. `referenceIds` echoes the id per input row (in input order).
export async function adminProjectActivitiesUpsert(
    userId: string,
    inputs: readonly GqlSAdminProjectActivityCreate[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    const now = new Date();

    // Phase 1 — validation + payload construction (pure).
    const seeds = inputs.map((input) => {
        if (input.kind === 'work') {
            throw new Error('adminProjectActivitiesUpsert: work-kind rows are owned by the timer mutations');
        }
        if (input.channel && input.kind !== 'clientContact' && input.kind !== 'meeting') {
            throw new Error(`adminProjectActivitiesUpsert: channel is only valid for clientContact / meeting (got kind='${input.kind}')`);
        }
        if ((input.amountCents != null || input.offerStatus != null) && input.kind !== 'offer') {
            throw new Error(`adminProjectActivitiesUpsert: amountCents / offerStatus are only valid for offer (got kind='${input.kind}')`);
        }

        const activityId = input.activityId ?? crypto.randomUUID();
        const isUpdate = Boolean(input.activityId);
        const payload: AdminProjectActivityCreate = {
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
        return { activityId, input, isUpdate, payload };
    });

    // Phase 2 — transactional execution.
    try {
        const updateIds = seeds.filter((seed) => seed.isUpdate).map((seed) => seed.activityId);
        await serverRuntime.db.transaction(async (transaction) => {
            if (updateIds.length > 0) {
                const existing = await transaction
                    .select({ activityId: projectActivities.activityId })
                    .from(projectActivities)
                    .where(inArray(projectActivities.activityId, updateIds));
                if (existing.length !== updateIds.length) {
                    const found = new Set(existing.map((row) => row.activityId));
                    const missing = updateIds.filter((id) => !found.has(id));
                    throw new Error(`adminProjectActivitiesUpsert: rows not found: ${missing.join(', ')}`);
                }
            }

            for (const { activityId, input, isUpdate, payload } of seeds) {
                if (isUpdate) {
                    await transaction.update(projectActivities).set(payload).where(eq(projectActivities.activityId, activityId));
                    continue;
                }

                await transaction.insert(projectActivities).values(payload);

                // Create-only one-shot attach side effects.
                const hasAttachLink = !!input.attachLinkUrl && !!input.attachLinkKind;
                const hasAttachFile = !!input.attachFileUploadId && !!input.attachFileKind;

                if (hasAttachLink) {
                    await transaction.insert(projectLinks).values({
                        projectLinkId: crypto.randomUUID(),
                        projectId: input.projectId,
                        activityId,
                        url: input.attachLinkUrl!,
                        label: input.attachLinkLabel ?? null,
                        kind: input.attachLinkKind!,
                        pinned: input.attachLinkPinned ?? false,
                        updatedAt: now,
                    });
                }

                if (hasAttachFile) {
                    const [upload] = await transaction
                        .select({ fileUploadId: fileUploads.fileUploadId })
                        .from(fileUploads)
                        .where(eq(fileUploads.fileUploadId, input.attachFileUploadId!))
                        .limit(1);
                    if (!upload) throw new Error(`adminProjectActivitiesUpsert: fileUpload ${input.attachFileUploadId} not found`);
                    await transaction.insert(projectFiles).values({
                        projectFileId: crypto.randomUUID(),
                        projectId: input.projectId,
                        activityId,
                        fileUploadId: input.attachFileUploadId!,
                        label: input.attachFileLabel ?? null,
                        kind: input.attachFileKind!,
                        pinned: input.attachFilePinned ?? false,
                        updatedAt: now,
                    });
                }
            }
        });
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: seeds.map((seed) => seed.activityId) };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
