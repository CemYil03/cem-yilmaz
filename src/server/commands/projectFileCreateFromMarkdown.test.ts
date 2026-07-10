import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { fileUploads, projectFiles, projects } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { projectFileCreateFromMarkdown } from './projectFileCreateFromMarkdown';

async function projectSeed(): Promise<string> {
    const projectId = crypto.randomUUID();
    await testDb.insert(projects).values({
        projectId,
        title: 'Seed project',
        status: 'planning',
        position: 0,
        sourceRequestId: null,
        description: null,
        notes: null,
        startedAt: null,
        completedAt: null,
        updatedAt: new Date(),
    });
    return projectId;
}

describe('projectFileCreateFromMarkdown', () => {
    it('writes both rows and returns a text/markdown AdminProjectFile', async () => {
        const { serverRuntime, requestingSession } = await commandSetup.withUser();
        const projectId = await projectSeed();
        const markdown = '# Offer for Acme\n\n- Sprint of two weeks\n- 8 000 EUR net\n';

        const result = await projectFileCreateFromMarkdown({
            session: requestingSession,
            serverRuntime,
            projectId,
            filename: 'offer-acme.md',
            label: 'Offer — Acme',
            kind: 'offer',
            pinned: false,
            markdown,
        });

        expect(result.kind).toBe('offer');
        expect(result.label).toBe('Offer — Acme');
        expect(result.fileUpload.mediaType).toBe('text/markdown');
        expect(result.fileUpload.filename).toBe('offer-acme.md');
        expect(result.fileUpload.size).toBe(Buffer.byteLength(markdown, 'utf8'));

        const [uploadRow] = await testDb.select().from(fileUploads).where(eq(fileUploads.fileUploadId, result.fileUpload.fileUploadId));
        expect(uploadRow?.bytes.toString('utf8')).toBe(markdown);

        const [fileRow] = await testDb.select().from(projectFiles).where(eq(projectFiles.projectFileId, result.projectFileId));
        expect(fileRow?.projectId).toBe(projectId);
        expect(fileRow?.activityId).toBeNull();
    });

    it('rejects when the session has no user', async () => {
        const { serverRuntime, requestingSession } = await commandSetup();
        const sessionWithoutUser = { ...requestingSession, userId: null } as typeof requestingSession;
        const projectId = await projectSeed();

        await expect(
            projectFileCreateFromMarkdown({
                session: sessionWithoutUser,
                serverRuntime,
                projectId,
                filename: 'note.md',
                label: null,
                kind: 'other',
                pinned: false,
                markdown: 'hello',
            }),
        ).rejects.toThrow(/anonymous session/);
    });

    it('propagates the projectFileUpsert not-found error when the project is unknown', async () => {
        const { serverRuntime, requestingSession } = await commandSetup.withUser();

        await expect(
            projectFileCreateFromMarkdown({
                session: requestingSession,
                serverRuntime,
                projectId: crypto.randomUUID(),
                filename: 'note.md',
                label: null,
                kind: 'other',
                pinned: false,
                markdown: '# stranded',
            }),
        ).rejects.toThrow();
    });
});
