import { tool } from 'ai';
import { z } from 'zod';
import { projectActivityUpsert } from '../commands/projectActivityUpsert';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import type { ProjectsAgentMutationLog } from './agentPersonalAssistantProjects';

// Log an event-style entry on a project's timeline (call, meeting, offer,
// milestone, note). Timed work sessions stay owned by the timer mutations —
// passing `kind = 'work'` here is rejected by the command. The `attach*`
// fields on the underlying mutation are deliberately not exposed: agent-side
// link/file creation is a separate tool (`projectLinkUpsert`), and files
// require a real upload step the agent can't perform.

const projectActivityUpsertInputSchema = z.object({
    activityId: z.string().uuid().optional().describe('Omit to create a new activity row. Pass an existing id to edit.'),
    projectId: z.string().uuid().describe('Owning project. Ids come from the snapshot or a prior `projectsList` result.'),
    taskId: z
        .string()
        .uuid()
        .optional()
        .describe('Optional task this activity is attached to. Leave empty unless the user named a specific task.'),
    kind: z
        .enum(['clientContact', 'meeting', 'offer', 'milestone', 'note'])
        .describe('Activity type. `work` is reserved for the timer — do not pass it here.'),
    channel: z
        .enum(['malt', 'email', 'phone', 'videoCall', 'inPerson', 'aiAssistant', 'other'])
        .optional()
        .describe('Communication channel. Only meaningful for `clientContact` / `meeting` — the command rejects it on other kinds.'),
    title: z.string().min(1).max(200).describe('One-line title for the timeline entry.'),
    notes: z.string().max(10000).optional().describe('Free-form notes. Optional.'),
    occurredAt: z.string().describe('ISO-8601 timestamp when the event happened (e.g. start of the call).'),
    durationSec: z.number().int().min(0).optional().describe('Known duration in seconds for the event ("the call was 45 min"). Optional.'),
    amountCents: z.number().int().min(0).optional().describe('Offer amount in cents (EUR). Only valid when `kind = offer`.'),
    offerStatus: z
        .enum(['sent', 'accepted', 'rejected', 'withdrawn'])
        .optional()
        .describe('Offer lifecycle state. Only valid when `kind = offer`.'),
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
                {
                    input: {
                        activityId: input.activityId ?? null,
                        projectId: input.projectId,
                        taskId: input.taskId ?? null,
                        kind: input.kind,
                        channel: input.channel ?? null,
                        title: input.title,
                        notes: input.notes ?? null,
                        occurredAt: new Date(input.occurredAt),
                        durationSec: input.durationSec ?? null,
                        amountCents: input.amountCents ?? null,
                        offerStatus: input.offerStatus ?? null,
                        attachLinkUrl: null,
                        attachLinkKind: null,
                        attachLinkLabel: null,
                        attachLinkPinned: null,
                        attachFileUploadId: null,
                        attachFileKind: null,
                        attachFileLabel: null,
                        attachFilePinned: null,
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
