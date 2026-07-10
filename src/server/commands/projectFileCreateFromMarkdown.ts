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
// - returns the hydrated `GqlSAdminProjectFile` because the sub-agent tool needs
//   the created id for its mutation log — this is the one intentional
//   non-batch survivor in the projects domain, not exposed on `AdminMutation`.
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
