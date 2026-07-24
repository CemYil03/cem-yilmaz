import { tool } from 'ai';
import { z } from 'zod';
import { requireAdminUserId } from '../agents/requireAdminUserId';
import { workspaceFiles } from '../db/schema';
import type { WorkspaceFileCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession, GqlSWorkspaceFile } from '../graphql/generated';
import { toGqlWorkspaceFile } from '../mappers/toGqlWorkspaceFile';
import { adminWorkspaceFileFindOne } from '../queries/adminWorkspaceFileFindOne';
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
        description:
            'Create a markdown (`.md`) document for the editable side panel. Put the full body in `markdown`; do not paste it back into chat — a short confirmation is enough.',
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
// editor after it was created. Use it both to answer questions about a document
// and as the read-before-write step for a revision.
export function toolWorkspaceFileGet({ serverRuntime, session }: WorkspaceFilesAgentToolContext) {
    return tool({
        description:
            'Fetch the latest markdown body by id. Always answer Cem in chat after reading (summarize/quote). Only chain into `workspaceFileUpdate` when he asked to change it.',
        inputSchema: workspaceFileGetInputSchema,
        execute: async (input) => {
            const file = await adminWorkspaceFileFindOne(input.workspaceFileId, session, serverRuntime);
            // Return a JSON-safe, trimmed view. `adminWorkspaceFileFindOne`
            // hands back the full `GqlSWorkspaceFile`, whose `createdAt` /
            // `updatedAt` are JS `Date` objects and which nests a `fileUpload`.
            // A `Date` is not a valid `JSONValue`: the AI SDK validates each
            // tool result against `jsonValueSchema` before feeding it into the
            // next model step, so returning the raw shape throws *after*
            // `onStepEnd` has persisted the tool-call row but *before* any
            // assistant text — the runner logs the error, emits `TurnEnded`,
            // and the user sees the read happen with no answer. (Asking again
            // "worked" only because the replayed result comes back through
            // JSONB with the dates already stringified.) The agent only needs
            // the body + identity to answer or to revise. See
            // `docs/features/workspace-files.md`.
            return {
                workspaceFileId: file.workspaceFileId,
                filename: file.filename,
                label: file.label,
                content: file.content,
            };
        },
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
        description: 'Overwrite an existing markdown document. `markdown` replaces the whole body — get first if you need to keep parts.',
        inputSchema: workspaceFileUpdateInputSchema,
        execute: async (input) => {
            const userId = requireAdminUserId(session);
            return adminWorkspaceFileUpdate(userId, input.workspaceFileId, input.markdown, input.label ?? null, session, serverRuntime);
        },
    });
}
