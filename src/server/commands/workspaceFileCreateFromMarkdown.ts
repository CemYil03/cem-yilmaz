import { tool } from 'ai';
import { z } from 'zod';
import { workspaceFiles } from '../db/schema';
import type { WorkspaceFileCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession, GqlSWorkspaceFile } from '../graphql/generated';
import { toGqlWorkspaceFile } from '../mappers/toGqlWorkspaceFile';
import { adminWorkspaceFileFindOne } from '../queries/adminWorkspaceFileFindOne';
import { requireAdminUserId } from '../agents/requireAdminUserId';
import { adminWorkspaceFileUpdate } from './adminWorkspaceFileUpdate';
import { fileUploadCreate } from './fileUploadCreate';

// Server-side path for the assistant to materialize a standalone markdown
// document as a real `FileUploads` row + a `WorkspaceFile` metadata row, owned
// directly by the admin (not tied to a project). The created file surfaces in
// chat as a clickable attachment and opens in the workspace document editor.
// See `docs/features/workspace-files.md`.
//
// Stays narrow on purpose:
// - markdown only — `mediaType` is hard-coded to `text/markdown`.
// - returns the hydrated `GqlSWorkspaceFile` (including `content`) so the
//   tool result carries the `workspaceFileId` the chat UI renders the
//   attachment from, and the agent can confirm what it wrote.
//
// Auth: the caller must already hold a session with a `userId`. The orchestrator
// only invokes this for an admin-scope session (`guardAdminMutation` runs at
// the chat boundary), so we don't re-guard here — but we do reject anonymous
// sessions defensively because `fileUploads.userId` is non-nullable.

interface WorkspaceFileCreateFromMarkdownInput {
    session: GqlSSession;
    serverRuntime: ServerRuntime;
    filename: string;
    label: string | null;
    markdown: string;
}

async function workspaceFileCreateFromMarkdown(input: WorkspaceFileCreateFromMarkdownInput): Promise<GqlSWorkspaceFile> {
    const { session, serverRuntime, filename, label, markdown } = input;
    const userId = requireAdminUserId(session);

    try {
        const upload = await fileUploadCreate(serverRuntime.db, {
            userId,
            filename,
            mediaType: 'text/markdown',
            bytes: Buffer.from(markdown, 'utf8'),
        });

        const payload: WorkspaceFileCreate = {
            workspaceFileId: crypto.randomUUID(),
            userId,
            fileUploadId: upload.fileUploadId,
            filename,
            label,
            updatedAt: new Date(),
        };
        const [inserted] = await serverRuntime.db.insert(workspaceFiles).values(payload).returning();
        if (!inserted) throw new Error('workspaceFileCreateFromMarkdown: insert returned no rows');

        await serverRuntime.publish.userUpdates({ userId });
        return toGqlWorkspaceFile(inserted, upload, markdown);
    } catch (error) {
        serverRuntime.log.error(error, session);
        throw error;
    }
}

interface WorkspaceFilesAgentToolContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
}

const filenameSchema = z
    .string()
    .min(1)
    .max(200)
    .regex(/\.md$/i, 'filename must end in .md')
    .describe('Filename including the `.md` extension. Shown verbatim in the document editor.');

const workspaceFileCreateInputSchema = z.object({
    filename: filenameSchema,
    label: z.string().max(200).optional().describe('Human-readable title shown above the filename. Defaults to the filename when omitted.'),
    markdown: z
        .string()
        .min(1)
        .max(200_000)
        .describe('The full markdown body of the document. Standard markdown — headings, lists, fenced code, tables all render.'),
});

// Creates a new markdown document. Cem opens and edits it in the workspace
// document panel; the id comes back in the result so the chat renders the
// attachment.
export function toolWorkspaceFileCreate({ serverRuntime, session }: WorkspaceFilesAgentToolContext) {
    return tool({
        description: [
            'Create a standalone markdown (`.md`) document for Cem. Use this when he asks you to draft, write, or',
            'put together a document — notes, a plan, a letter, a spec, meeting notes, etc. — that he will want to',
            'read and edit rather than just see inline in chat. The document opens in an editable side panel in the',
            'workspace, so you do NOT need to paste the whole body back into your reply — a short summary is enough.',
            'The full markdown body goes in `markdown`; pick a `filename` ending in `.md`. Markdown only.',
            'The result contains a `workspaceFileId` — mention what you created, no need to repeat the body.',
        ].join(' '),
        inputSchema: workspaceFileCreateInputSchema,
        execute: async (input) => {
            const file = await workspaceFileCreateFromMarkdown({
                session,
                serverRuntime,
                filename: input.filename,
                label: input.label ?? null,
                markdown: input.markdown,
            });
            // Return only the identity the chat UI renders the attachment from
            // and the agent needs to confirm/deep-link — NOT the full `content`.
            // The body is already durable in the DB; echoing it back would
            // bloat this turn's tool result and replay into the model's context
            // on the next turn for no benefit.
            return { workspaceFileId: file.workspaceFileId, filename: file.filename, label: file.label };
        },
    });
}

const workspaceFileGetInputSchema = z.object({
    workspaceFileId: z
        .uuid()
        .describe('Id of the document. Comes from a prior `workspaceFileCreate` result or a document Cem is referring to.'),
});

// Reads the current contents of a document, including any edits Cem made in the
// editor after it was created. Call this before rewriting so you work from the
// latest version.
export function toolWorkspaceFileGet({ serverRuntime, session }: WorkspaceFilesAgentToolContext) {
    return tool({
        description: [
            'Fetch the current contents of a markdown document by id, including any edits Cem made in the editor',
            'since it was created. Use this when he asks about, references, or wants you to revise an existing',
            'document — read the latest version first so you are not working from a stale copy.',
        ].join(' '),
        inputSchema: workspaceFileGetInputSchema,
        execute: async (input) => adminWorkspaceFileFindOne(input.workspaceFileId, session, serverRuntime),
    });
}

const workspaceFileUpdateInputSchema = z.object({
    workspaceFileId: z.uuid().describe('Id of the document to overwrite. From a prior create/get result.'),
    markdown: z
        .string()
        .min(1)
        .max(200_000)
        .describe('The full new markdown body. This REPLACES the entire document — include everything you want kept.'),
    label: z.string().max(200).optional().describe('Optional new title. Omit to leave the existing title unchanged.'),
});

// Overwrites a document's body (and optionally its title). Fetch first with
// `workspaceFileGet` if you need to preserve existing content.
export function toolWorkspaceFileUpdate({ serverRuntime, session }: WorkspaceFilesAgentToolContext) {
    return tool({
        description: [
            'Overwrite an existing markdown document with a new body. Use this when Cem asks you to revise, rewrite,',
            'or add to a document you (or he) already created. The `markdown` REPLACES the whole document, so fetch',
            'the current version with `workspaceFileGet` first if you need to keep parts of it. Markdown only.',
        ].join(' '),
        inputSchema: workspaceFileUpdateInputSchema,
        execute: async (input) => {
            const userId = requireAdminUserId(session);
            return adminWorkspaceFileUpdate(userId, input.workspaceFileId, input.markdown, input.label ?? null, session, serverRuntime);
        },
    });
}
