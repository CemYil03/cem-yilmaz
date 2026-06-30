import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { fileUploads, projectFiles, projects } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { projectFileDelete } from './projectFileDelete';
import { projectFileTogglePin } from './projectFileTogglePin';
import { projectFileUpsert } from './projectFileUpsert';

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

async function uploadSeed(userId: string): Promise<string> {
    const fileUploadId = crypto.randomUUID();
    await testDb.insert(fileUploads).values({
        fileUploadId,
        userId,
        filename: 'offer.pdf',
        mediaType: 'application/pdf',
        size: 4,
        bytes: Buffer.from('test'),
    });
    return fileUploadId;
}

describe('projectFileUpsert', () => {
    it('creates a file row referencing an existing upload', async () => {
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser();
        const projectId = await projectSeed();
        const fileUploadId = await uploadSeed(user.userId);

        const file = await projectFileUpsert(
            requestingSession.userId!,
            {
                input: {
                    projectFileId: null,
                    projectId,
                    activityId: null,
                    fileUploadId,
                    label: 'Initial offer',
                    kind: 'offer',
                    pinned: true,
                },
            },
            requestingSession,
            serverRuntime,
        );

        expect(file.kind).toBe('offer');
        expect(file.pinned).toBe(true);
        expect(file.fileUpload.fileUploadId).toBe(fileUploadId);
        expect(file.fileUpload.filename).toBe('offer.pdf');
        expect(file.fileUpload.url).toBe(`/api/file-uploads/${fileUploadId}`);
    });

    it('rejects when the referenced upload does not exist', async () => {
        const { serverRuntime, requestingSession } = await commandSetup();
        const projectId = await projectSeed();

        await expect(
            projectFileUpsert(
                requestingSession.userId!,
                {
                    input: {
                        projectFileId: null,
                        projectId,
                        activityId: null,
                        fileUploadId: crypto.randomUUID(),
                        label: null,
                        kind: 'other',
                        pinned: false,
                    },
                },
                requestingSession,
                serverRuntime,
            ),
        ).rejects.toThrow(/fileUpload .* not found/);
    });

    it('updates label / kind / pinned without changing the upload', async () => {
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser();
        const projectId = await projectSeed();
        const fileUploadId = await uploadSeed(user.userId);

        const created = await projectFileUpsert(
            requestingSession.userId!,
            {
                input: {
                    projectFileId: null,
                    projectId,
                    activityId: null,
                    fileUploadId,
                    label: 'before',
                    kind: 'other',
                    pinned: false,
                },
            },
            requestingSession,
            serverRuntime,
        );

        const updated = await projectFileUpsert(
            requestingSession.userId!,
            {
                input: {
                    projectFileId: created.projectFileId,
                    projectId,
                    activityId: null,
                    fileUploadId, // same id; we don't repoint to another upload through this mutation today
                    label: 'after',
                    kind: 'contract',
                    pinned: true,
                },
            },
            requestingSession,
            serverRuntime,
        );

        expect(updated.label).toBe('after');
        expect(updated.kind).toBe('contract');
        expect(updated.pinned).toBe(true);
    });
});

describe('projectFileTogglePin', () => {
    it('flips pinned and returns the upload payload too', async () => {
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser();
        const projectId = await projectSeed();
        const fileUploadId = await uploadSeed(user.userId);
        const created = await projectFileUpsert(
            requestingSession.userId!,
            {
                input: {
                    projectFileId: null,
                    projectId,
                    activityId: null,
                    fileUploadId,
                    label: null,
                    kind: 'other',
                    pinned: false,
                },
            },
            requestingSession,
            serverRuntime,
        );

        const pinned = await projectFileTogglePin(
            requestingSession.userId!,
            { projectFileId: created.projectFileId },
            requestingSession,
            serverRuntime,
        );
        expect(pinned.pinned).toBe(true);
        expect(pinned.fileUpload.fileUploadId).toBe(fileUploadId);
    });
});

describe('projectFileDelete', () => {
    it('removes the row, leaving the underlying upload in place', async () => {
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser();
        const projectId = await projectSeed();
        const fileUploadId = await uploadSeed(user.userId);
        const created = await projectFileUpsert(
            requestingSession.userId!,
            {
                input: {
                    projectFileId: null,
                    projectId,
                    activityId: null,
                    fileUploadId,
                    label: null,
                    kind: 'other',
                    pinned: false,
                },
            },
            requestingSession,
            serverRuntime,
        );

        await projectFileDelete(requestingSession.userId!, { projectFileId: created.projectFileId }, requestingSession, serverRuntime);

        const remainingFiles = await testDb.select().from(projectFiles).where(eq(projectFiles.projectFileId, created.projectFileId));
        expect(remainingFiles).toHaveLength(0);

        const [persistedUpload] = await testDb.select().from(fileUploads).where(eq(fileUploads.fileUploadId, fileUploadId));
        expect(persistedUpload?.fileUploadId).toBe(fileUploadId);
    });

    it('cascade-removes when the upload is deleted', async () => {
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser();
        const projectId = await projectSeed();
        const fileUploadId = await uploadSeed(user.userId);
        const created = await projectFileUpsert(
            requestingSession.userId!,
            {
                input: {
                    projectFileId: null,
                    projectId,
                    activityId: null,
                    fileUploadId,
                    label: null,
                    kind: 'other',
                    pinned: false,
                },
            },
            requestingSession,
            serverRuntime,
        );

        await testDb.delete(fileUploads).where(eq(fileUploads.fileUploadId, fileUploadId));

        const remaining = await testDb.select().from(projectFiles).where(eq(projectFiles.projectFileId, created.projectFileId));
        expect(remaining).toHaveLength(0);
    });
});
