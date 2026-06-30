import { tool } from 'ai';
import { z } from 'zod';
import { projectFileCreateFromMarkdown } from '../commands/projectFileCreateFromMarkdown';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import type { ProjectsAgentMutationLog } from './agentPersonalAssistantProjects';

// Create a markdown file on a project's Files tab from inside the projects
// sub-agent. Bytes are produced in-process by the agent's `markdown` field —
// no HTTP round-trip, no template. The underlying command writes to
// `FileUploads` with `mediaType = 'text/markdown'` and links it to the
// project via `projectFiles`, so the row surfaces on the detail page exactly
// the same way as an uploaded `.md` would. Scope is intentionally narrow:
// markdown only, create-only — edits go back through the manual upload path.

const projectFileCreateInputSchema = z.object({
    projectId: z.uuid().describe('Owning project. Ids come from the snapshot or a prior `projectsList` result.'),
    filename: z
        .string()
        .min(1)
        .max(200)
        .regex(/\.md$/i, 'filename must end in .md')
        .describe('Filename including the `.md` extension. Shown verbatim in the Files tab.'),
    label: z.string().max(200).optional().describe('Human-readable label shown above the filename. Defaults to the filename when omitted.'),
    kind: z
        .enum(['offer', 'invoice', 'contract', 'screenshot', 'other'])
        .describe(
            'File category. Drives the row label and grouping. Use `offer` for a drafted offer, `note` is not a valid value here — use `other`.',
        ),
    pinned: z.boolean().optional().describe('Surface in the project header rail. Defaults to false.'),
    markdown: z
        .string()
        .min(1)
        .max(200_000)
        .describe('The full markdown body of the file. Plain text + standard markdown — headings, lists, fenced code, tables all render.'),
});

interface ProjectsAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: ProjectsAgentMutationLog;
}

export function toolProjectFileCreate({ serverRuntime, session, mutations }: ProjectsAgentMutationContext) {
    return tool({
        description: [
            'Create a markdown (`.md`) file on a project and link it to the project Files tab.',
            'Use this when the user asks you to draft an offer, contract, note, or any other document for a',
            'project. The file is created in one step — bytes are written directly. No HTTP upload needed.',
            'Markdown only; for other formats the user has to upload manually.',
        ].join(' '),
        inputSchema: projectFileCreateInputSchema,
        execute: async (input) => {
            const result = await projectFileCreateFromMarkdown({
                session,
                serverRuntime,
                projectId: input.projectId,
                filename: input.filename,
                label: input.label ?? null,
                kind: input.kind,
                pinned: input.pinned ?? false,
                markdown: input.markdown,
            });
            mutations.push({
                kind: 'fileCreate',
                id: result.projectFileId,
                title: result.label ?? result.fileUpload.filename,
            });
            return result;
        },
    });
}
