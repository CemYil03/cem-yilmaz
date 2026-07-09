import { tool } from 'ai';
import { z } from 'zod';
import { projectsUpsert } from '../commands/projectsUpsert';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { GqlSProjectStatusSchema } from '../graphql/generated';
import type { GqlSProjectCreate, GqlSSession } from '../graphql/generated';
import type { ProjectsAgentMutationLog } from './agentPersonalAssistantProjects';
import { requireAdminUserId } from './requireAdminUserId';

// Batch create-or-update of workspace projects. Thin wrapper around
// `commands/projectsUpsert` — every constraint (position defaulting, source
// request validation on convert) lives in the command, not here. On success
// pushes one entry per input onto the shared mutation log so
// `toolDelegateToProjects` can surface them back to the orchestrator.
//
// The item schema is hand-built here rather than derived from
// `GqlSProjectCreateSchema()`. The generated schema carries `z.date()` for
// the two timestamp scalars; under `structuredOutputs: true` the AI SDK
// converts the tool schema to JSON Schema for Gemini's constrained decoding,
// and `z.date()` has no clean JSON-Schema representation. The wire shape is
// always JSON, so every timestamp field declares `z.string()` here and the
// `execute` converts with `new Date(...)`. Only the GraphQL enum schema
// (`GqlSProjectStatusSchema`) is reused so a future status addition surfaces
// as a TS error here rather than a runtime mismatch.

const projectItemSchema = z.object({
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

const toolProjectsUpsertInputSchema = z.object({
    projects: z
        .array(projectItemSchema)
        .min(1)
        .describe('One or more projects to create or update. Pass a one-element array for a single edit.'),
});

interface ProjectsAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: ProjectsAgentMutationLog;
}

export function toolProjectsUpsert({ serverRuntime, session, mutations }: ProjectsAgentMutationContext) {
    return tool({
        description: [
            'Batch create or update workspace projects.',
            'For a new project: omit `projectId` — the server allocates one. For an edit: pass the id from the',
            'system-prompt snapshot or a prior `projectsList` call. `position` is required on edit and ignored on',
            'create (the server appends to the planning column). Status `done` does not auto-stamp `completedAt`.',
            'Batch same-shape writes into one call; every row with a `projectId` is updated, every row without one',
            'is inserted. Returns `referenceIds` in input order.',
        ].join(' '),
        inputSchema: toolProjectsUpsertInputSchema,
        execute: async (input) => {
            const inputs: GqlSProjectCreate[] = input.projects.map((project) => ({
                projectId: project.projectId ?? null,
                title: project.title,
                description: project.description ?? null,
                notes: project.notes ?? null,
                status: project.status,
                position: project.position ?? null,
                sourceRequestId: project.sourceRequestId ?? null,
                startedAt: project.startedAt ? new Date(project.startedAt) : null,
                completedAt: project.completedAt ? new Date(project.completedAt) : null,
            }));
            const result = await projectsUpsert(requireAdminUserId(session), inputs, session, serverRuntime);
            const referenceIds = result.referenceIds ?? [];
            input.projects.forEach((project, index) => {
                mutations.push({
                    kind: project.projectId ? 'projectUpdate' : 'projectCreate',
                    id: referenceIds[index] ?? project.projectId ?? '',
                    title: project.title,
                });
            });
            return result;
        },
    });
}
