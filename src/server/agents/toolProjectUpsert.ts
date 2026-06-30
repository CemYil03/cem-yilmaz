import { tool } from 'ai';
import { z } from 'zod';
import { projectUpsert } from '../commands/projectUpsert';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { GqlSProjectStatusSchema } from '../graphql/generated';
import type { GqlSSession } from '../graphql/generated';
import type { ProjectsAgentMutationLog } from './agentPersonalAssistantProjects';
import { requireAdminUserId } from './requireAdminUserId';

// Create-or-update a workspace project. Thin wrapper around
// `commands/projectUpsert` — every constraint (position defaulting, source
// request validation on convert) lives in the command, not here. On success
// pushes one entry onto the shared mutation log so `toolDelegateToProjects`
// can surface it back to the orchestrator.
//
// The input schema is hand-built here rather than derived from
// `GqlSProjectCreateSchema()`. The generated schema carries `z.date()` for
// the two timestamp scalars; under `structuredOutputs: true` the AI SDK
// converts the tool schema to JSON Schema for Gemini's constrained
// decoding, and `z.date()` has no clean JSON-Schema representation — the
// `MALFORMED_FUNCTION_CALL` failures the user hit on a plain "create
// project X" turn trace back to this. The wire shape is always JSON, so
// every timestamp field declares `z.string()` here and the `execute`
// converts with `new Date(...)`. Only the GraphQL enum schema
// (`GqlSProjectStatusSchema`) is reused so a future status addition
// surfaces as a TS error here rather than a runtime mismatch.

const projectUpsertInputSchema = z.object({
    projectId: z
        .uuid()
        .nullish()
        .describe(
            'Omit (or null) to create a new project. Pass an existing id to update; ids come from the prompt snapshot or projectsList.',
        ),
    title: z.string().min(1).max(200).describe('Single-line project title.'),
    description: z.string().max(2000).nullish().describe('Short summary shown on the card. Optional.'),
    notes: z.string().max(10000).nullish().describe('Long-form notes / markdown context. Optional.'),
    status: GqlSProjectStatusSchema.describe('Board column. New projects typically land in `planning` or `idea`.'),
    position: z
        .number()
        .int()
        .min(0)
        .nullish()
        .describe('Within-status ordering. Required when updating; on create the server appends to the planning column if omitted.'),
    startedAt: z
        .string()
        .nullish()
        .describe('ISO-8601 timestamp when work started. Optional; the editor stamps this manually rather than auto-derived.'),
    completedAt: z
        .string()
        .nullish()
        .describe('ISO-8601 timestamp when work completed. Optional; not auto-stamped by `status: done` — leave that to a follow-up edit.'),
    sourceRequestId: z
        .uuid()
        .nullish()
        .describe(
            'Optional: id of a verified `ProjectRequest` to convert into this project. Leave null unless the user is explicitly converting an inbox request.',
        ),
});

interface ProjectsAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: ProjectsAgentMutationLog;
}

export function toolProjectUpsert({ serverRuntime, session, mutations }: ProjectsAgentMutationContext) {
    return tool({
        description: [
            'Create or update a workspace project.',
            'For a new project: omit `projectId` — the server allocates one. For an edit: pass the id from the',
            'system-prompt snapshot or a prior `projectsList` call. `position` is required on edit and ignored on',
            'create (the server appends to the planning column). Status `done` does not auto-stamp `completedAt`;',
            'leave that to the user via a follow-up edit.',
        ].join(' '),
        inputSchema: projectUpsertInputSchema,
        execute: async (input) => {
            const result = await projectUpsert(
                requireAdminUserId(session),
                {
                    input: {
                        projectId: input.projectId ?? null,
                        title: input.title,
                        description: input.description ?? null,
                        notes: input.notes ?? null,
                        status: input.status,
                        position: input.position ?? null,
                        sourceRequestId: input.sourceRequestId ?? null,
                        startedAt: input.startedAt ? new Date(input.startedAt) : null,
                        completedAt: input.completedAt ? new Date(input.completedAt) : null,
                    },
                },
                session,
                serverRuntime,
            );
            mutations.push({
                kind: input.projectId ? 'projectUpdate' : 'projectCreate',
                id: result.projectId,
                title: result.title,
            });
            return result;
        },
    });
}
