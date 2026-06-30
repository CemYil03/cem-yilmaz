import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { projectActivities, projectLinks, projects } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { projectLinkDelete } from './projectLinkDelete';
import { projectLinkTogglePin } from './projectLinkTogglePin';
import { projectLinkUpsert } from './projectLinkUpsert';

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

describe('projectLinkUpsert', () => {
    it('creates a link with the given kind and pin state', async () => {
        const { serverRuntime, requestingSession } = await commandSetup();
        const projectId = await projectSeed();

        const link = await projectLinkUpsert(
            requestingSession.userId!,
            {
                input: {
                    projectLinkId: null,
                    projectId,
                    activityId: null,
                    url: 'https://github.com/me/repo',
                    label: 'Repo',
                    kind: 'github',
                    pinned: true,
                },
            },
            requestingSession,
            serverRuntime,
        );

        expect(link.url).toBe('https://github.com/me/repo');
        expect(link.kind).toBe('github');
        expect(link.pinned).toBe(true);
        expect(link.activityId).toBeNull();
    });

    it('stamps activityId on create when supplied', async () => {
        const { serverRuntime, requestingSession } = await commandSetup();
        const projectId = await projectSeed();
        const activityId = await activitySeed(projectId);

        const link = await projectLinkUpsert(
            requestingSession.userId!,
            {
                input: {
                    projectLinkId: null,
                    projectId,
                    activityId,
                    url: 'https://example.com',
                    label: null,
                    kind: 'other',
                    pinned: false,
                },
            },
            requestingSession,
            serverRuntime,
        );

        expect(link.activityId).toBe(activityId);
    });

    it('updates label / kind / pinned without changing activityId', async () => {
        const { serverRuntime, requestingSession } = await commandSetup();
        const projectId = await projectSeed();
        const activityId = await activitySeed(projectId);
        const created = await projectLinkUpsert(
            requestingSession.userId!,
            {
                input: {
                    projectLinkId: null,
                    projectId,
                    activityId,
                    url: 'https://example.com',
                    label: 'before',
                    kind: 'other',
                    pinned: false,
                },
            },
            requestingSession,
            serverRuntime,
        );

        const updated = await projectLinkUpsert(
            requestingSession.userId!,
            {
                input: {
                    projectLinkId: created.projectLinkId,
                    projectId,
                    activityId: null, // attempting to clear — should be ignored on update
                    url: 'https://example.com/new',
                    label: 'after',
                    kind: 'notion',
                    pinned: true,
                },
            },
            requestingSession,
            serverRuntime,
        );

        expect(updated.label).toBe('after');
        expect(updated.kind).toBe('notion');
        expect(updated.pinned).toBe(true);
        // activityId is the original — update path doesn't touch it
        const [persisted] = await testDb.select().from(projectLinks).where(eq(projectLinks.projectLinkId, created.projectLinkId));
        expect(persisted?.activityId).toBe(activityId);
    });
});

describe('projectLinkTogglePin', () => {
    it('flips pinned and returns the new state', async () => {
        const { serverRuntime, requestingSession } = await commandSetup();
        const projectId = await projectSeed();
        const created = await projectLinkUpsert(
            requestingSession.userId!,
            {
                input: {
                    projectLinkId: null,
                    projectId,
                    activityId: null,
                    url: 'https://example.com',
                    label: null,
                    kind: 'other',
                    pinned: false,
                },
            },
            requestingSession,
            serverRuntime,
        );

        const pinned = await projectLinkTogglePin(
            requestingSession.userId!,
            { projectLinkId: created.projectLinkId },
            requestingSession,
            serverRuntime,
        );
        expect(pinned.pinned).toBe(true);
        const unpinned = await projectLinkTogglePin(
            requestingSession.userId!,
            { projectLinkId: created.projectLinkId },
            requestingSession,
            serverRuntime,
        );
        expect(unpinned.pinned).toBe(false);
    });
});

describe('projectLinkDelete', () => {
    it('removes the row and returns success', async () => {
        const { serverRuntime, requestingSession } = await commandSetup();
        const projectId = await projectSeed();
        const created = await projectLinkUpsert(
            requestingSession.userId!,
            {
                input: {
                    projectLinkId: null,
                    projectId,
                    activityId: null,
                    url: 'https://example.com',
                    label: null,
                    kind: 'other',
                    pinned: false,
                },
            },
            requestingSession,
            serverRuntime,
        );

        const result = await projectLinkDelete(
            requestingSession.userId!,
            { projectLinkId: created.projectLinkId },
            requestingSession,
            serverRuntime,
        );
        expect(result.success).toBe(true);

        const remaining = await testDb.select().from(projectLinks).where(eq(projectLinks.projectLinkId, created.projectLinkId));
        expect(remaining).toHaveLength(0);
    });

    it('cascade-removes links when the project is deleted', async () => {
        const { serverRuntime, requestingSession } = await commandSetup();
        const projectId = await projectSeed();
        const created = await projectLinkUpsert(
            requestingSession.userId!,
            {
                input: {
                    projectLinkId: null,
                    projectId,
                    activityId: null,
                    url: 'https://example.com',
                    label: null,
                    kind: 'other',
                    pinned: false,
                },
            },
            requestingSession,
            serverRuntime,
        );

        await testDb.delete(projects).where(eq(projects.projectId, projectId));

        const remaining = await testDb.select().from(projectLinks).where(eq(projectLinks.projectLinkId, created.projectLinkId));
        expect(remaining).toHaveLength(0);
    });

    it('cascade-sets-null activityId when the activity is deleted', async () => {
        const { serverRuntime, requestingSession } = await commandSetup();
        const projectId = await projectSeed();
        const activityId = await activitySeed(projectId);
        const created = await projectLinkUpsert(
            requestingSession.userId!,
            {
                input: {
                    projectLinkId: null,
                    projectId,
                    activityId,
                    url: 'https://example.com',
                    label: null,
                    kind: 'other',
                    pinned: false,
                },
            },
            requestingSession,
            serverRuntime,
        );

        await testDb.delete(projectActivities).where(eq(projectActivities.activityId, activityId));

        const [row] = await testDb.select().from(projectLinks).where(eq(projectLinks.projectLinkId, created.projectLinkId));
        expect(row?.activityId).toBeNull();
    });
});
