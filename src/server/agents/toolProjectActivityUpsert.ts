import { tool } from 'ai';
import { z } from 'zod';
import { projectActivityUpsert } from '../commands/projectActivityUpsert';
import type { ServerRuntime } from '../domain/ServerRuntime';
import {
    GqlSProjectActivityChannelSchema,
    GqlSProjectActivityDirectionSchema,
    GqlSProjectActivityKindSchema,
    GqlSProjectFileKindSchema,
    GqlSProjectLinkKindSchema,
    GqlSProjectOfferStatusSchema,
} from '../graphql/generated';
import type { GqlSSession } from '../graphql/generated';
import type { ProjectsAgentMutationLog } from './agentPersonalAssistantProjects';
import { requireAdminUserId } from './requireAdminUserId';

// Log an event-style entry on a project's timeline. Thin wrapper around the
// `projectActivityUpsert` command — every behavior rule (kind=work rejected,
// channel/offerStatus mismatches rejected, direction derived from kind) lives
// in the command, not here.
//
// Hand-built schema (not derived from `GqlSProjectActivityCreateSchema()`)
// for the same reason as `toolProjectUpsert`: the generated schema declares
// `occurredAt` as `z.date()`, which the AI SDK cannot render cleanly into
// JSON Schema for Gemini's `structuredOutputs` constrained decoding. The
// wire shape is always JSON, so `occurredAt` declares `z.string()` here
// and `execute` converts with `new Date(...)`. The enum schemas are reused
// so a future enum addition surfaces as a TS error rather than a runtime
// mismatch.

const projectActivityUpsertInputSchema = z.object({
    activityId: z.uuid().nullish().describe('Omit (or null) to create a new activity row. Pass an existing id to edit.'),
    projectId: z.uuid().describe('Owning project. Ids come from the snapshot or a prior `projectsList` result.'),
    taskId: z.uuid().nullish().describe('Optional task this activity is attached to. Leave empty unless the user named a specific task.'),
    kind: GqlSProjectActivityKindSchema.describe(
        'Activity type. `work` is reserved for the timer mutations — the command rejects it here; use the timer tools for timed work.',
    ),
    channel: GqlSProjectActivityChannelSchema.nullish().describe(
        'Communication channel. Only valid for `clientContact` / `meeting` — the command rejects it on other kinds.',
    ),
    direction: GqlSProjectActivityDirectionSchema.nullish().describe(
        'Direction of the interaction. Omit to let the command derive it from `kind` (clientContact → incoming, meeting/offer → outgoing, work/note/milestone → internal). Override only when the user explicitly says so.',
    ),
    title: z.string().min(1).max(200).describe('One-line title for the timeline entry.'),
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
    offerStatus: GqlSProjectOfferStatusSchema.nullish().describe(
        'Offer lifecycle state. Only valid when `kind = offer` — the command rejects it on other kinds.',
    ),
    attachLinkUrl: z
        .url()
        .nullish()
        .describe(
            'One-shot side effect on create: attach an external link to the new activity row. Ignored on update — edit links through `projectLinkUpsert`. Prefer the dedicated tool unless you genuinely want the link bound to this activity.',
        ),
    attachLinkKind: GqlSProjectLinkKindSchema.nullish().describe(
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
    attachFileKind: GqlSProjectFileKindSchema.nullish().describe(
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

interface ProjectsAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: ProjectsAgentMutationLog;
}

export function toolProjectActivityUpsert({ serverRuntime, session, mutations }: ProjectsAgentMutationContext) {
    return tool({
        description: [
            'Log or edit an event-style activity entry on a project timeline.',
            'Use this for client contacts, meetings, offers, milestones, and notes — anything the user wants to',
            'put on the project feed. Do not use it for timed work; the timer mutations own those rows. `channel`',
            'is only valid for `clientContact` / `meeting`; `amountCents` / `offerStatus` are only valid for',
            '`offer` — the command rejects mismatches.',
        ].join(' '),
        inputSchema: projectActivityUpsertInputSchema,
        execute: async (input) => {
            const result = await projectActivityUpsert(
                requireAdminUserId(session),
                {
                    input: {
                        activityId: input.activityId ?? null,
                        projectId: input.projectId,
                        taskId: input.taskId ?? null,
                        kind: input.kind,
                        channel: input.channel ?? null,
                        direction: input.direction ?? null,
                        title: input.title,
                        notes: input.notes ?? null,
                        occurredAt: new Date(input.occurredAt),
                        durationSec: input.durationSec ?? null,
                        amountCents: input.amountCents ?? null,
                        offerStatus: input.offerStatus ?? null,
                        attachLinkUrl: input.attachLinkUrl ?? null,
                        attachLinkKind: input.attachLinkKind ?? null,
                        attachLinkLabel: input.attachLinkLabel ?? null,
                        attachLinkPinned: input.attachLinkPinned ?? null,
                        attachFileUploadId: input.attachFileUploadId ?? null,
                        attachFileKind: input.attachFileKind ?? null,
                        attachFileLabel: input.attachFileLabel ?? null,
                        attachFilePinned: input.attachFilePinned ?? null,
                    },
                },
                session,
                serverRuntime,
            );
            mutations.push({
                kind: input.activityId ? 'activityUpdate' : 'activityCreate',
                id: result.activityId,
                title: result.title,
            });
            return result;
        },
    });
}
