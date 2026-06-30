import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { fileUploads, projectActivities, projectFiles, projectLinks, projects } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { projectActivityUpsert } from './projectActivityUpsert';

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

describe('projectActivityUpsert — atomic attach', () => {
    it('creates the activity and the link in one transaction with matching activityId', async () => {
        const { serverRuntime, requestingSession } = await commandSetup();
        const projectId = await projectSeed();

        const activity = await projectActivityUpsert(
            {
                input: {
                    activityId: null,
                    projectId,
                    taskId: null,
                    kind: 'milestone',
                    channel: null,
                    title: 'Kickoff',
                    notes: null,
                    occurredAt: new Date(),
                    durationSec: null,
                    amountCents: null,
                    offerStatus: null,
                    attachLinkUrl: 'https://github.com/me/repo',
                    attachLinkKind: 'github',
                    attachLinkLabel: 'Repo',
                    attachLinkPinned: true,
                    attachFileUploadId: null,
                    attachFileKind: null,
                    attachFileLabel: null,
                    attachFilePinned: null,
                },
            },
            requestingSession,
            serverRuntime,
        );

        expect(activity.links).toHaveLength(1);
        const link = activity.links[0]!;
        expect(link.activityId).toBe(activity.activityId);
        expect(link.kind).toBe('github');
        expect(link.pinned).toBe(true);

        const persisted = await testDb.select().from(projectLinks).where(eq(projectLinks.activityId, activity.activityId));
        expect(persisted).toHaveLength(1);
    });

    it('creates the activity and the file in one transaction', async () => {
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser();
        const projectId = await projectSeed();
        const fileUploadId = await uploadSeed(user.userId);

        const activity = await projectActivityUpsert(
            {
                input: {
                    activityId: null,
                    projectId,
                    taskId: null,
                    kind: 'offer',
                    channel: null,
                    title: 'Sent offer',
                    notes: null,
                    occurredAt: new Date(),
                    durationSec: null,
                    amountCents: 500000,
                    offerStatus: 'sent',
                    attachLinkUrl: null,
                    attachLinkKind: null,
                    attachLinkLabel: null,
                    attachLinkPinned: null,
                    attachFileUploadId: fileUploadId,
                    attachFileKind: 'offer',
                    attachFileLabel: 'Offer v1.pdf',
                    attachFilePinned: false,
                },
            },
            requestingSession,
            serverRuntime,
        );

        expect(activity.files).toHaveLength(1);
        const file = activity.files[0]!;
        expect(file.activityId).toBe(activity.activityId);
        expect(file.fileUpload.fileUploadId).toBe(fileUploadId);
        expect(activity.amountCents).toBe(500000);
        expect(activity.offerStatus).toBe('sent');
    });

    it('rolls back the activity insert if the attached file references an unknown upload', async () => {
        const { serverRuntime, requestingSession } = await commandSetup();
        const projectId = await projectSeed();

        await expect(
            projectActivityUpsert(
                {
                    input: {
                        activityId: null,
                        projectId,
                        taskId: null,
                        kind: 'offer',
                        channel: null,
                        title: 'Sent offer',
                        notes: null,
                        occurredAt: new Date(),
                        durationSec: null,
                        amountCents: 500000,
                        offerStatus: 'sent',
                        attachLinkUrl: null,
                        attachLinkKind: null,
                        attachLinkLabel: null,
                        attachLinkPinned: null,
                        attachFileUploadId: crypto.randomUUID(),
                        attachFileKind: 'offer',
                        attachFileLabel: null,
                        attachFilePinned: null,
                    },
                },
                requestingSession,
                serverRuntime,
            ),
        ).rejects.toThrow(/fileUpload .* not found/);

        // No activity row was created — the transaction rolled back.
        const persisted = await testDb.select().from(projectActivities).where(eq(projectActivities.projectId, projectId));
        expect(persisted).toHaveLength(0);

        const orphanFiles = await testDb.select().from(projectFiles).where(eq(projectFiles.projectId, projectId));
        expect(orphanFiles).toHaveLength(0);
    });

    it('rejects amountCents / offerStatus on non-offer kinds', async () => {
        const { serverRuntime, requestingSession } = await commandSetup();
        const projectId = await projectSeed();

        await expect(
            projectActivityUpsert(
                {
                    input: {
                        activityId: null,
                        projectId,
                        taskId: null,
                        kind: 'note',
                        channel: null,
                        title: 'a note',
                        notes: null,
                        occurredAt: new Date(),
                        durationSec: null,
                        amountCents: 100,
                        offerStatus: null,
                        attachLinkUrl: null,
                        attachLinkKind: null,
                        attachLinkLabel: null,
                        attachLinkPinned: null,
                        attachFileUploadId: null,
                        attachFileKind: null,
                        attachFileLabel: null,
                        attachFilePinned: null,
                    },
                },
                requestingSession,
                serverRuntime,
            ),
        ).rejects.toThrow(/amountCents \/ offerStatus are only valid for offer/);
    });
});
