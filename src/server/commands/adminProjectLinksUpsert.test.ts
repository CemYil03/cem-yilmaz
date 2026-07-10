import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { projectActivities, projectLinks, projects } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { adminProjectLinksDelete } from './adminProjectLinksDelete';
import { adminProjectLinksUpsert } from './adminProjectLinksUpsert';

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

async function activitySeed(projectId: string): Promise<string> {
    const activityId = crypto.randomUUID();
    await testDb.insert(projectActivities).values({
        activityId,
        projectId,
        taskId: null,
        kind: 'milestone',
        channel: null,
        title: 'seed',
        notes: null,
        occurredAt: new Date(),
        startedAt: null,
        endedAt: null,
        durationSec: null,
        amountCents: null,
        offerStatus: null,
        updatedAt: new Date(),
    });
    return activityId;
}

describe('adminProjectLinksUpsert', () => {
    it('creates a link with the given kind and pin state', async () => {
        const { serverRuntime, requestingSession } = await commandSetup();
        const projectId = await projectSeed();

        const result = await adminProjectLinksUpsert(
            requestingSession.userId!,
            [
                {
                    projectLinkId: null,
                    projectId,
                    activityId: null,
                    url: 'https://github.com/me/repo',
                    label: 'Repo',
                    kind: 'github',
                    pinned: true,
                },
            ],
            requestingSession,
            serverRuntime,
        );

        const [link] = await testDb.select().from(projectLinks).where(eq(projectLinks.projectLinkId, result.referenceIds![0]!));
        expect(link?.url).toBe('https://github.com/me/repo');
        expect(link?.kind).toBe('github');
        expect(link?.pinned).toBe(true);
        expect(link?.activityId).toBeNull();
    });

    it('stamps activityId on create when supplied', async () => {
        const { serverRuntime, requestingSession } = await commandSetup();
        const projectId = await projectSeed();
        const activityId = await activitySeed(projectId);

        const result = await adminProjectLinksUpsert(
            requestingSession.userId!,
            [
                {
                    projectLinkId: null,
                    projectId,
                    activityId,
                    url: 'https://example.com',
                    label: null,
                    kind: 'other',
                    pinned: false,
                },
            ],
            requestingSession,
            serverRuntime,
        );

        const [link] = await testDb.select().from(projectLinks).where(eq(projectLinks.projectLinkId, result.referenceIds![0]!));
        expect(link?.activityId).toBe(activityId);
    });

    it('updates label / kind / pinned without changing activityId', async () => {
        const { serverRuntime, requestingSession } = await commandSetup();
        const projectId = await projectSeed();
        const activityId = await activitySeed(projectId);
        const created = await adminProjectLinksUpsert(
            requestingSession.userId!,
            [
                {
                    projectLinkId: null,
                    projectId,
                    activityId,
                    url: 'https://example.com',
                    label: 'before',
                    kind: 'other',
                    pinned: false,
                },
            ],
            requestingSession,
            serverRuntime,
        );
        const linkId = created.referenceIds![0]!;

        await adminProjectLinksUpsert(
            requestingSession.userId!,
            [
                {
                    projectLinkId: linkId,
                    projectId,
                    activityId: null, // attempting to clear — should be ignored on update
                    url: 'https://example.com/new',
                    label: 'after',
                    kind: 'notion',
                    pinned: true,
                },
            ],
            requestingSession,
            serverRuntime,
        );

        const [persisted] = await testDb.select().from(projectLinks).where(eq(projectLinks.projectLinkId, linkId));
        expect(persisted?.label).toBe('after');
        expect(persisted?.kind).toBe('notion');
        expect(persisted?.pinned).toBe(true);
        // activityId is the original — update path doesn't touch it
        expect(persisted?.activityId).toBe(activityId);
    });

    it('flips pinned when the existing row is passed back with pinned inverted', async () => {
        const { serverRuntime, requestingSession } = await commandSetup();
        const projectId = await projectSeed();
        const created = await adminProjectLinksUpsert(
            requestingSession.userId!,
            [
                {
                    projectLinkId: null,
                    projectId,
                    activityId: null,
                    url: 'https://example.com',
                    label: null,
                    kind: 'other',
                    pinned: false,
                },
            ],
            requestingSession,
            serverRuntime,
        );
        const linkId = created.referenceIds![0]!;

        await adminProjectLinksUpsert(
            requestingSession.userId!,
            [{ projectLinkId: linkId, projectId, activityId: null, url: 'https://example.com', label: null, kind: 'other', pinned: true }],
            requestingSession,
            serverRuntime,
        );
        const [pinned] = await testDb.select().from(projectLinks).where(eq(projectLinks.projectLinkId, linkId));
        expect(pinned?.pinned).toBe(true);

        await adminProjectLinksUpsert(
            requestingSession.userId!,
            [{ projectLinkId: linkId, projectId, activityId: null, url: 'https://example.com', label: null, kind: 'other', pinned: false }],
            requestingSession,
            serverRuntime,
        );
        const [unpinned] = await testDb.select().from(projectLinks).where(eq(projectLinks.projectLinkId, linkId));
        expect(unpinned?.pinned).toBe(false);
    });
});

describe('adminProjectLinksDelete', () => {
    it('removes the row and returns success', async () => {
        const { serverRuntime, requestingSession } = await commandSetup();
        const projectId = await projectSeed();
        const created = await adminProjectLinksUpsert(
            requestingSession.userId!,
            [{ projectLinkId: null, projectId, activityId: null, url: 'https://example.com', label: null, kind: 'other', pinned: false }],
            requestingSession,
            serverRuntime,
        );
        const linkId = created.referenceIds![0]!;

        const result = await adminProjectLinksDelete(requestingSession.userId!, [linkId], requestingSession, serverRuntime);
        expect(result.success).toBe(true);
        expect(result.referenceIds).toEqual([linkId]);

        const remaining = await testDb.select().from(projectLinks).where(eq(projectLinks.projectLinkId, linkId));
        expect(remaining).toHaveLength(0);
    });

    it('cascade-removes links when the project is deleted', async () => {
        const { serverRuntime, requestingSession } = await commandSetup();
        const projectId = await projectSeed();
        const created = await adminProjectLinksUpsert(
            requestingSession.userId!,
            [{ projectLinkId: null, projectId, activityId: null, url: 'https://example.com', label: null, kind: 'other', pinned: false }],
            requestingSession,
            serverRuntime,
        );

        await testDb.delete(projects).where(eq(projects.projectId, projectId));

        const remaining = await testDb.select().from(projectLinks).where(eq(projectLinks.projectLinkId, created.referenceIds![0]!));
        expect(remaining).toHaveLength(0);
    });

    it('cascade-sets-null activityId when the activity is deleted', async () => {
        const { serverRuntime, requestingSession } = await commandSetup();
        const projectId = await projectSeed();
        const activityId = await activitySeed(projectId);
        const created = await adminProjectLinksUpsert(
            requestingSession.userId!,
            [{ projectLinkId: null, projectId, activityId, url: 'https://example.com', label: null, kind: 'other', pinned: false }],
            requestingSession,
            serverRuntime,
        );

        await testDb.delete(projectActivities).where(eq(projectActivities.activityId, activityId));

        const [row] = await testDb.select().from(projectLinks).where(eq(projectLinks.projectLinkId, created.referenceIds![0]!));
        expect(row?.activityId).toBeNull();
    });
});
