import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSProjectFile, GqlSProjectFileKind, GqlSSession } from '../graphql/generated';
import { fileUploadCreate } from './fileUploadCreate';
import { projectFileUpsert } from './projectFileUpsert';

// Server-side path for an agent (or any non-HTTP caller) to materialize a
// markdown document as a real `FileUploads` row and link it to a project via
// `projectFiles`. The browser still uses `POST /api/file-uploads` →
// `projectFileUpsert`; this command is the byte-source-is-in-process
// equivalent and stays narrow on purpose:
//
// - markdown only — `mediaType` is hard-coded to `text/markdown`. Other
//   formats need their own command so the call site is auditable and the
//   schema can't drift.
// - create-only — no `projectFileId` parameter. Edits stay on the existing
//   `projectFileUpsert` path.
// - reuses `fileUploadCreate` + `projectFileUpsert` verbatim, so the
//   project-FK check, error logging, and mapper output match the HTTP flow.
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
    kind: GqlSProjectFileKind;
    pinned: boolean;
    markdown: string;
}

export async function projectFileCreateFromMarkdown(input: ProjectFileCreateFromMarkdownInput): Promise<GqlSProjectFile> {
    const { session, serverRuntime, projectId, filename, label, kind, pinned, markdown } = input;

    if (!session.userId) {
        throw new Error('projectFileCreateFromMarkdown: anonymous session has no user to own the upload');
    }

    const upload = await fileUploadCreate(serverRuntime.db, {
        userId: session.userId,
        filename,
        mediaType: 'text/markdown',
        bytes: Buffer.from(markdown, 'utf8'),
    });

    return projectFileUpsert(
        session.userId,
        {
            input: {
                projectFileId: null,
                projectId,
                activityId: null,
                fileUploadId: upload.fileUploadId,
                label,
                kind,
                pinned,
            },
        },
        session,
        serverRuntime,
    );
}
