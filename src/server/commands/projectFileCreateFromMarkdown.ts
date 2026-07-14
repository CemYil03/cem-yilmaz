import { tool } from 'ai';
import { z } from 'zod';
import { projectFiles } from '../db/schema';
import type { AdminProjectFileCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminProjectFile, GqlSAdminProjectFileKind, GqlSSession } from '../graphql/generated';
import { toGqlAdminProjectFile } from '../mappers/toGqlAdminProjectFile';
import { fileUploadCreate } from './fileUploadCreate';

// Server-side path for an agent (or any non-HTTP caller) to materialize a
// markdown document as a real `FileUploads` row and link it to a project via
// `projectFiles`. The browser still uses `POST /api/file-uploads` →
// `adminProjectFilesUpsert`; this command is the byte-source-is-in-process
// equivalent and stays narrow on purpose:
//
// - markdown only — `mediaType` is hard-coded to `text/markdown`. Other
//   formats need their own command so the call site is auditable and the
//   schema can't drift.
// - create-only — no `projectFileId` parameter. Edits stay on the existing
//   `adminProjectFilesUpsert` path.
// - returns the hydrated `GqlSAdminProjectFile` because the sub-agent tool
//   surfaces the created id in its summary so the orchestrator can deep-link
//   it — this is the one intentional non-batch survivor in the projects
//   domain.
//
// Auth: the caller must already hold a session with a `userId`. The agent
// orchestrator only ever invokes this for an admin-scope session
// (`guardAdminMutation` runs at the chat boundary), so we don't re-guard
// here — but we DO reject anonymous sessions defensively because the
// `fileUploads.userId` column is non-nullable.

export interface ProjectFileCreateFromMarkdownInput {
    session: GqlSSession;
    serverRuntime: ServerRuntime;
    projectId: string;
    filename: string;
    label: string | null;
    kind: GqlSAdminProjectFileKind;
    pinned: boolean;
    markdown: string;
}

export async function projectFileCreateFromMarkdown(input: ProjectFileCreateFromMarkdownInput): Promise<GqlSAdminProjectFile> {
    const { session, serverRuntime, projectId, filename, label, kind, pinned, markdown } = input;

    if (!session.userId) {
        throw new Error('projectFileCreateFromMarkdown: anonymous session has no user to own the upload');
    }

    try {
        const upload = await fileUploadCreate(serverRuntime.db, {
            userId: session.userId,
            filename,
            mediaType: 'text/markdown',
            bytes: Buffer.from(markdown, 'utf8'),
        });

        const payload: AdminProjectFileCreate = {
            projectFileId: crypto.randomUUID(),
            projectId,
            activityId: null,
            fileUploadId: upload.fileUploadId,
            label,
            kind,
            pinned,
            updatedAt: new Date(),
        };
        const [inserted] = await serverRuntime.db.insert(projectFiles).values(payload).returning();
        if (!inserted) throw new Error('projectFileCreateFromMarkdown: insert returned no rows');

        await serverRuntime.publish.userUpdates({ userId: session.userId });
        return toGqlAdminProjectFile(inserted, upload);
    } catch (error) {
        serverRuntime.log.error(error, session);
        throw error;
    }
}

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

interface ProjectsAgentToolContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
}

export function toolProjectFileCreate({ serverRuntime, session }: ProjectsAgentToolContext) {
    return tool({
        description: [
            'Create a markdown (`.md`) file on a project and link it to the project Files tab.',
            'Use this when the user asks you to draft an offer, contract, note, or any other document for a',
            'project. The file is created in one step — bytes are written directly. No HTTP upload needed.',
            'The full markdown body is the `markdown` field; pick a `kind` (`offer | invoice | contract | screenshot |',
            'other`) and a filename ending in `.md`. Markdown only — for other formats the user has to upload manually.',
        ].join(' '),
        inputSchema: projectFileCreateInputSchema,
        execute: async (input) => {
            return projectFileCreateFromMarkdown({
                session,
                serverRuntime,
                projectId: input.projectId,
                filename: input.filename,
                label: input.label ?? null,
                kind: input.kind,
                pinned: input.pinned ?? false,
                markdown: input.markdown,
            });
        },
    });
}
