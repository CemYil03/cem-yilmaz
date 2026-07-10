import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { fileUploads, projectFiles, projects } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { adminProjectFilesDelete } from './adminProjectFilesDelete';
import { adminProjectFilesUpsert } from './adminProjectFilesUpsert';

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

describe('adminProjectFilesUpsert', () => {
    it('creates a file row referencing an existing upload', async () => {
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser();
        const projectId = await projectSeed();
        const fileUploadId = await uploadSeed(user.userId);

        const result = await adminProjectFilesUpsert(
            requestingSession.userId!,
            [
                {
                    projectFileId: null,
                    projectId,
                    activityId: null,
                    fileUploadId,
                    label: 'Initial offer',
                    kind: 'offer',
                    pinned: true,
                },
            ],
            requestingSession,
            serverRuntime,
        );

        const [file] = await testDb.select().from(projectFiles).where(eq(projectFiles.projectFileId, result.referenceIds![0]!));
        expect(file?.kind).toBe('offer');
        expect(file?.pinned).toBe(true);
        expect(file?.fileUploadId).toBe(fileUploadId);
    });

    it('rejects when the referenced upload does not exist', async () => {
        const { serverRuntime, requestingSession } = await commandSetup();
        const projectId = await projectSeed();

        await expect(
            adminProjectFilesUpsert(
                requestingSession.userId!,
                [
                    {
                        projectFileId: null,
                        projectId,
                        activityId: null,
                        fileUploadId: crypto.randomUUID(),
                        label: null,
                        kind: 'other',
                        pinned: false,
                    },
                ],
                requestingSession,
                serverRuntime,
            ),
        ).rejects.toThrow(/fileUpload.* not found/);
    });

    it('updates label / kind / pinned without changing the upload', async () => {
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser();
        const projectId = await projectSeed();
        const fileUploadId = await uploadSeed(user.userId);

        const created = await adminProjectFilesUpsert(
            requestingSession.userId!,
            [{ projectFileId: null, projectId, activityId: null, fileUploadId, label: 'before', kind: 'other', pinned: false }],
            requestingSession,
            serverRuntime,
        );
        const fileId = created.referenceIds![0]!;

        await adminProjectFilesUpsert(
            requestingSession.userId!,
            [{ projectFileId: fileId, projectId, activityId: null, fileUploadId, label: 'after', kind: 'contract', pinned: true }],
            requestingSession,
            serverRuntime,
        );

        const [persisted] = await testDb.select().from(projectFiles).where(eq(projectFiles.projectFileId, fileId));
        expect(persisted?.label).toBe('after');
        expect(persisted?.kind).toBe('contract');
        expect(persisted?.pinned).toBe(true);
        expect(persisted?.fileUploadId).toBe(fileUploadId);
    });

    it('flips pinned when the existing row is passed back with pinned inverted', async () => {
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser();
        const projectId = await projectSeed();
        const fileUploadId = await uploadSeed(user.userId);
        const created = await adminProjectFilesUpsert(
            requestingSession.userId!,
            [{ projectFileId: null, projectId, activityId: null, fileUploadId, label: null, kind: 'other', pinned: false }],
            requestingSession,
            serverRuntime,
        );
        const fileId = created.referenceIds![0]!;

        await adminProjectFilesUpsert(
            requestingSession.userId!,
            [{ projectFileId: fileId, projectId, activityId: null, fileUploadId, label: null, kind: 'other', pinned: true }],
            requestingSession,
            serverRuntime,
        );
        const [pinned] = await testDb.select().from(projectFiles).where(eq(projectFiles.projectFileId, fileId));
        expect(pinned?.pinned).toBe(true);
    });
});

describe('adminProjectFilesDelete', () => {
    it('removes the row, leaving the underlying upload in place', async () => {
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser();
        const projectId = await projectSeed();
        const fileUploadId = await uploadSeed(user.userId);
        const created = await adminProjectFilesUpsert(
            requestingSession.userId!,
            [{ projectFileId: null, projectId, activityId: null, fileUploadId, label: null, kind: 'other', pinned: false }],
            requestingSession,
            serverRuntime,
        );
        const fileId = created.referenceIds![0]!;

        await adminProjectFilesDelete(requestingSession.userId!, [fileId], requestingSession, serverRuntime);

        const remainingFiles = await testDb.select().from(projectFiles).where(eq(projectFiles.projectFileId, fileId));
        expect(remainingFiles).toHaveLength(0);

        const [persistedUpload] = await testDb.select().from(fileUploads).where(eq(fileUploads.fileUploadId, fileUploadId));
        expect(persistedUpload?.fileUploadId).toBe(fileUploadId);
    });

    it('cascade-removes when the upload is deleted', async () => {
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser();
        const projectId = await projectSeed();
        const fileUploadId = await uploadSeed(user.userId);
        const created = await adminProjectFilesUpsert(
            requestingSession.userId!,
            [{ projectFileId: null, projectId, activityId: null, fileUploadId, label: null, kind: 'other', pinned: false }],
            requestingSession,
            serverRuntime,
        );

        await testDb.delete(fileUploads).where(eq(fileUploads.fileUploadId, fileUploadId));

        const remaining = await testDb.select().from(projectFiles).where(eq(projectFiles.projectFileId, created.referenceIds![0]!));
        expect(remaining).toHaveLength(0);
    });
});
