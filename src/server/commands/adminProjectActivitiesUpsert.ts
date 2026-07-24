import { tool } from 'ai';
import { eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { requireAdminUserId } from '../agents/requireAdminUserId';
import { fileUploads, projectActivities, projectFiles, projectLinks } from '../db/schema';
import type {
    AdminProjectActivityChannel,
    AdminProjectActivityCreate,
    AdminProjectActivityDirection,
    AdminProjectActivityKind,
} from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import {
    GqlSAdminProjectActivityChannelSchema,
    GqlSAdminProjectActivityDirectionSchema,
    GqlSAdminProjectActivityKindSchema,
    GqlSAdminProjectFileKindSchema,
    GqlSAdminProjectLinkKindSchema,
    GqlSAdminProjectOfferStatusSchema,
} from '../graphql/generated';
import type { GqlSAdminProjectActivityCreate, GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Resolve the `direction` column for a non-timer activity. `work` / `note` /
// `milestone` are always `internal` (they're not a turn in a dialogue). A
// video call is a shared moment — it belongs to neither side — so any row on
// the `videoCall` channel is `internal` too and renders centered like a note.
// For the remaining client-facing kinds we respect what the client sent and
// fall back to a kind-appropriate default: a logged client-contact row is most
// often inbound, while meeting and offer rows are typically outbound from Cem.
function resolveDirection(
    kind: AdminProjectActivityKind,
    channel: AdminProjectActivityChannel | null | undefined,
    explicit: AdminProjectActivityDirection | null | undefined,
): AdminProjectActivityDirection {
    if (kind === 'work' || kind === 'note' || kind === 'milestone') return 'internal';
    if (channel === 'videoCall') return 'internal';
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
            direction: resolveDirection(input.kind, input.channel, input.direction),
            title: input.title ?? null,
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

// Hand-built item schema (not derived from `GqlSAdminProjectActivityCreateSchema()`)
// for the same reason as `toolProjectsUpsert`: the generated schema declares
// `occurredAt` as `z.date()`, which the AI SDK cannot render cleanly into
// JSON Schema for Gemini's `structuredOutputs` constrained decoding. The wire
// shape is always JSON, so `occurredAt` declares `z.string()` here and
// `execute` converts with `new Date(...)`. The enum schemas are reused so a
// future enum addition surfaces as a TS error rather than a runtime mismatch.

const projectActivityItemSchema = z.object({
    activityId: z.uuid().nullish().describe('Omit (or null) to create a new activity row. Pass an existing id to edit.'),
    projectId: z.uuid().describe('Owning project. Ids come from the snapshot or a prior `projectsList` result.'),
    taskId: z.uuid().nullish().describe('Optional task this activity is attached to. Leave empty unless the user named a specific task.'),
    kind: GqlSAdminProjectActivityKindSchema.describe(
        'Activity type. `work` is reserved for the timer mutations — the command rejects it here; use the timer tools for timed work.',
    ),
    channel: GqlSAdminProjectActivityChannelSchema.nullish().describe(
        'Communication channel. Only valid for `clientContact` / `meeting` — the command rejects it on other kinds.',
    ),
    direction: GqlSAdminProjectActivityDirectionSchema.nullish().describe(
        'Direction of the interaction. Omit to let the command derive it from `kind` (clientContact → incoming, meeting/offer → outgoing, work/note/milestone → internal). Override only when the user explicitly says so.',
    ),
    title: z
        .string()
        .min(1)
        .max(200)
        .nullish()
        .describe('Optional one-line title for the timeline entry. Omit for a plain note-style row; put the body in `notes`.'),
    notes: z.string().max(10000).nullish().describe('Free-form notes. Optional.'),
    occurredAt: z
        .string()
        .describe('ISO-8601 timestamp when the event happened (e.g. start of the call). The command parses it into a Date.'),
    durationSec: z.number().int().min(0).nullish().describe('Known duration in seconds for the event ("the call was 45 min"). Optional.'),
    amountCents: z
        .number()
        .int()
        .min(0)
        .nullish()
        .describe('Offer amount in cents (EUR). Only valid when `kind = offer` — the command rejects it on other kinds.'),
    offerStatus: GqlSAdminProjectOfferStatusSchema.nullish().describe(
        'Offer lifecycle state. Only valid when `kind = offer` — the command rejects it on other kinds.',
    ),
    attachLinkUrl: z
        .url()
        .nullish()
        .describe(
            'One-shot side effect on create: attach an external link to the new activity row. Ignored on update — edit links through `projectLinksUpsert`. Prefer the dedicated tool unless you genuinely want the link bound to this activity.',
        ),
    attachLinkKind: GqlSAdminProjectLinkKindSchema.nullish().describe(
        'Resource category for `attachLinkUrl`. Required when `attachLinkUrl` is set.',
    ),
    attachLinkLabel: z.string().max(200).nullish().describe('Human label for `attachLinkUrl`. Defaults to the URL host when omitted.'),
    attachLinkPinned: z
        .boolean()
        .nullish()
        .describe('Whether the attached link should appear on the project header rail. Defaults to false.'),
    attachFileUploadId: z
        .uuid()
        .nullish()
        .describe(
            'One-shot side effect on create: bind an already-uploaded file (by `fileUploadId`) to the new activity. The agent has no way to produce a fresh upload id, so this is normally left null — set it only if the user just told you the id from a prior upload.',
        ),
    attachFileKind: GqlSAdminProjectFileKindSchema.nullish().describe(
        'File category for `attachFileUploadId`. Required when `attachFileUploadId` is set.',
    ),
    attachFileLabel: z
        .string()
        .max(200)
        .nullish()
        .describe('Human label for `attachFileUploadId`. Defaults to the upload filename when omitted.'),
    attachFilePinned: z
        .boolean()
        .nullish()
        .describe('Whether the attached file should appear on the project header rail. Defaults to false.'),
});

const toolProjectActivitiesUpsertInputSchema = z.object({
    projectActivities: z
        .array(projectActivityItemSchema)
        .min(1)
        .describe('One or more activity rows to log or edit. Pass a one-element array for a single entry.'),
});

interface ProjectsAgentToolContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
}

export function toolProjectActivitiesUpsert({ serverRuntime, session }: ProjectsAgentToolContext) {
    return tool({
        description: [
            'Batch log or edit event-style activity entries on a project timeline.',
            'Use this for client contacts, meetings, offers, milestones, and notes — anything the user wants to',
            'put on the project feed. Do not use it for timed work; the timer mutations own those rows. `channel`',
            'is only valid for `clientContact` / `meeting`; `amountCents` / `offerStatus` are only valid for',
            '`offer` — the command rejects mismatches. Batch same-shape writes into one call. Returns',
            '`referenceIds` in input order.',
        ].join(' '),
        inputSchema: toolProjectActivitiesUpsertInputSchema,
        execute: async (input) => {
            const inputs: GqlSAdminProjectActivityCreate[] = input.projectActivities.map((activity) => ({
                activityId: activity.activityId ?? null,
                projectId: activity.projectId,
                taskId: activity.taskId ?? null,
                kind: activity.kind,
                channel: activity.channel ?? null,
                direction: activity.direction ?? null,
                title: activity.title ?? null,
                notes: activity.notes ?? null,
                occurredAt: new Date(activity.occurredAt),
                durationSec: activity.durationSec ?? null,
                amountCents: activity.amountCents ?? null,
                offerStatus: activity.offerStatus ?? null,
                attachLinkUrl: activity.attachLinkUrl ?? null,
                attachLinkKind: activity.attachLinkKind ?? null,
                attachLinkLabel: activity.attachLinkLabel ?? null,
                attachLinkPinned: activity.attachLinkPinned ?? null,
                attachFileUploadId: activity.attachFileUploadId ?? null,
                attachFileKind: activity.attachFileKind ?? null,
                attachFileLabel: activity.attachFileLabel ?? null,
                attachFilePinned: activity.attachFilePinned ?? null,
            }));
            return adminProjectActivitiesUpsert(requireAdminUserId(session), inputs, session, serverRuntime);
        },
    });
}
