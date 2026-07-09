import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { fileUploads, projectActivities, projectFiles, projectLinks, projects } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { projectActivitiesUpsert } from './projectActivitiesUpsert';

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

describe('projectActivitiesUpsert — atomic attach', () => {
    it('creates the activity and the link in one transaction with matching activityId', async () => {
        const { serverRuntime, requestingSession } = await commandSetup();
        const projectId = await projectSeed();

        const result = await projectActivitiesUpsert(
            requestingSession.userId!,
            [
                {
                    activityId: null,
                    projectId,
                    taskId: null,
                    kind: 'milestone',
                    channel: null,
                    direction: null,
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
            ],
            requestingSession,
            serverRuntime,
        );

        const activityId = result.referenceIds![0]!;
        const persisted = await testDb.select().from(projectLinks).where(eq(projectLinks.activityId, activityId));
        expect(persisted).toHaveLength(1);
        expect(persisted[0]!.kind).toBe('github');
        expect(persisted[0]!.pinned).toBe(true);
    });

    it('creates the activity and the file in one transaction', async () => {
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser();
        const projectId = await projectSeed();
        const fileUploadId = await uploadSeed(user.userId);

        const result = await projectActivitiesUpsert(
            requestingSession.userId!,
            [
                {
                    activityId: null,
                    projectId,
                    taskId: null,
                    kind: 'offer',
                    channel: null,
                    direction: null,
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
            ],
            requestingSession,
            serverRuntime,
        );

        const activityId = result.referenceIds![0]!;
        const files = await testDb.select().from(projectFiles).where(eq(projectFiles.activityId, activityId));
        expect(files).toHaveLength(1);
        expect(files[0]!.fileUploadId).toBe(fileUploadId);
        const [activity] = await testDb.select().from(projectActivities).where(eq(projectActivities.activityId, activityId));
        expect(activity?.amountCents).toBe(500000);
        expect(activity?.offerStatus).toBe('sent');
    });

    it('rolls back the activity insert if the attached file references an unknown upload', async () => {
        const { serverRuntime, requestingSession } = await commandSetup();
        const projectId = await projectSeed();

        await expect(
            projectActivitiesUpsert(
                requestingSession.userId!,
                [
                    {
                        activityId: null,
                        projectId,
                        taskId: null,
                        kind: 'offer',
                        channel: null,
                        direction: null,
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
                ],
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
            projectActivitiesUpsert(
                requestingSession.userId!,
                [
                    {
                        activityId: null,
                        projectId,
                        taskId: null,
                        kind: 'note',
                        channel: null,
                        direction: null,
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
                ],
                requestingSession,
                serverRuntime,
            ),
        ).rejects.toThrow(/amountCents \/ offerStatus are only valid for offer/);
    });

    it('rejects work-kind rows — those are owned by the timer mutations', async () => {
        const { serverRuntime, requestingSession } = await commandSetup();
        const projectId = await projectSeed();

        await expect(
            projectActivitiesUpsert(
                requestingSession.userId!,
                [
                    {
                        activityId: null,
                        projectId,
                        taskId: null,
                        kind: 'work',
                        channel: null,
                        direction: null,
                        title: 'sneaky work',
                        notes: null,
                        occurredAt: new Date(),
                        durationSec: null,
                        amountCents: null,
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
                ],
                requestingSession,
                serverRuntime,
            ),
        ).rejects.toThrow(/work-kind rows are owned by the timer mutations/);
    });
});

describe('projectActivitiesUpsert — direction normalization', () => {
    it('forces `internal` for note / milestone even when an outgoing direction was sent', async () => {
        const { serverRuntime, requestingSession } = await commandSetup();
        const projectId = await projectSeed();

        const result = await projectActivitiesUpsert(
            requestingSession.userId!,
            [
                {
                    activityId: null,
                    projectId,
                    taskId: null,
                    kind: 'note',
                    channel: null,
                    direction: 'outgoing',
                    title: 'Quick thought',
                    notes: null,
                    occurredAt: new Date(),
                    durationSec: null,
                    amountCents: null,
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
            ],
            requestingSession,
            serverRuntime,
        );

        const [note] = await testDb.select().from(projectActivities).where(eq(projectActivities.activityId, result.referenceIds![0]!));
        expect(note?.direction).toBe('internal');
    });

    it('defaults clientContact to incoming and offer to outgoing when direction is omitted', async () => {
        const { serverRuntime, requestingSession } = await commandSetup();
        const projectId = await projectSeed();

        // Both defaults asserted in one batch — order is preserved in referenceIds.
        const result = await projectActivitiesUpsert(
            requestingSession.userId!,
            [
                {
                    activityId: null,
                    projectId,
                    taskId: null,
                    kind: 'clientContact',
                    channel: 'malt',
                    direction: null,
                    title: 'Client wrote',
                    notes: null,
                    occurredAt: new Date(),
                    durationSec: null,
                    amountCents: null,
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
                {
                    activityId: null,
                    projectId,
                    taskId: null,
                    kind: 'offer',
                    channel: null,
                    direction: null,
                    title: 'Sent offer',
                    notes: null,
                    occurredAt: new Date(),
                    durationSec: null,
                    amountCents: 100000,
                    offerStatus: 'sent',
                    attachLinkUrl: null,
                    attachLinkKind: null,
                    attachLinkLabel: null,
                    attachLinkPinned: null,
                    attachFileUploadId: null,
                    attachFileKind: null,
                    attachFileLabel: null,
                    attachFilePinned: null,
                },
            ],
            requestingSession,
            serverRuntime,
        );

        const [contact] = await testDb.select().from(projectActivities).where(eq(projectActivities.activityId, result.referenceIds![0]!));
        expect(contact?.direction).toBe('incoming');
        const [offer] = await testDb.select().from(projectActivities).where(eq(projectActivities.activityId, result.referenceIds![1]!));
        expect(offer?.direction).toBe('outgoing');
    });
});
