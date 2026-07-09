import { and, eq, isNull } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { projectActivities, projects } from '../db/schema';
import type { ProjectCreate } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { projectTimersStart } from './projectTimersStart';
import { projectTimersStop } from './projectTimersStop';

const projectSeed = async (overrides: Partial<ProjectCreate> = {}) => {
    const projectId = crypto.randomUUID();
    const [row] = await testDb
        .insert(projects)
        .values({
            projectId,
            title: 'Test project',
            status: 'active',
            position: 0,
            sourceRequestId: null,
            description: null,
            notes: null,
            startedAt: null,
            completedAt: null,
            updatedAt: new Date(),
            ...overrides,
        })
        .returning();
    if (!row) throw new Error('seed: insert returned no rows');
    return row;
};

describe('projectTimersStart', () => {
    it('inserts a running timer row when no other timer is active', async () => {
        // Arrange
        const { serverRuntime, requestingSession } = await commandSetup();
        const project = await projectSeed();

        // Act
        const result = await projectTimersStart(
            requestingSession.userId!,
            [{ projectId: project.projectId, taskId: null, title: null }],
            requestingSession,
            serverRuntime,
        );

        // Assert — the new row is running, attached to the project, default title.
        expect(result.referenceIds).toHaveLength(1);
        const activityId = result.referenceIds![0]!;
        const [timer] = await testDb.select().from(projectActivities).where(eq(projectActivities.activityId, activityId));
        expect(timer?.kind).toBe('work');
        expect(timer?.projectId).toBe(project.projectId);
        expect(timer?.endedAt).toBeNull();
        expect(timer?.title).toBe('Work session');

        // DB-side: exactly one running work row exists for this project.
        const open = await testDb
            .select()
            .from(projectActivities)
            .where(
                and(
                    eq(projectActivities.projectId, project.projectId),
                    eq(projectActivities.kind, 'work'),
                    isNull(projectActivities.endedAt),
                ),
            );
        expect(open).toHaveLength(1);
        expect(open[0]?.activityId).toBe(activityId);
    });

    it('stops the existing running timer before starting a new one', async () => {
        // Arrange
        const { serverRuntime, requestingSession } = await commandSetup();
        const projectA = await projectSeed({ title: 'A' });
        const projectB = await projectSeed({ title: 'B' });

        // Act — start on A, then on B without an explicit stop.
        const startA = await projectTimersStart(
            requestingSession.userId!,
            [{ projectId: projectA.projectId, taskId: null, title: 'first' }],
            requestingSession,
            serverRuntime,
        );
        const startB = await projectTimersStart(
            requestingSession.userId!,
            [{ projectId: projectB.projectId, taskId: null, title: 'second' }],
            requestingSession,
            serverRuntime,
        );
        const activityA = startA.referenceIds![0]!;
        const activityB = startB.referenceIds![0]!;

        // Assert — across the two projects, exactly one work timer runs, on B.
        const openA = await testDb
            .select()
            .from(projectActivities)
            .where(
                and(
                    eq(projectActivities.projectId, projectA.projectId),
                    eq(projectActivities.kind, 'work'),
                    isNull(projectActivities.endedAt),
                ),
            );
        const openB = await testDb
            .select()
            .from(projectActivities)
            .where(
                and(
                    eq(projectActivities.projectId, projectB.projectId),
                    eq(projectActivities.kind, 'work'),
                    isNull(projectActivities.endedAt),
                ),
            );
        expect(openA).toHaveLength(0);
        expect(openB).toHaveLength(1);
        expect(openB[0]?.activityId).toBe(activityB);

        // The A row is closed with a non-negative duration.
        const [closedA] = await testDb.select().from(projectActivities).where(eq(projectActivities.activityId, activityA));
        expect(closedA?.endedAt).not.toBeNull();
        expect(closedA?.durationSec).not.toBeNull();
        expect(closedA?.durationSec).toBeGreaterThanOrEqual(0);
    });

    it('leaves only the last row open across a multi-element batch', async () => {
        // Arrange
        const { serverRuntime, requestingSession } = await commandSetup();
        const projectA = await projectSeed({ title: 'A' });
        const projectB = await projectSeed({ title: 'B' });

        // Act — two starts in one call; each stops the prior.
        const result = await projectTimersStart(
            requestingSession.userId!,
            [
                { projectId: projectA.projectId, taskId: null, title: null },
                { projectId: projectB.projectId, taskId: null, title: null },
            ],
            requestingSession,
            serverRuntime,
        );

        // Assert — referenceIds echoes both new ids in input order; only the
        // second (B) is still open.
        expect(result.referenceIds).toHaveLength(2);
        const [first] = await testDb.select().from(projectActivities).where(eq(projectActivities.activityId, result.referenceIds![0]!));
        const [second] = await testDb.select().from(projectActivities).where(eq(projectActivities.activityId, result.referenceIds![1]!));
        expect(first?.endedAt).not.toBeNull();
        expect(second?.endedAt).toBeNull();
    });

    it('honours an explicit title and task link', async () => {
        // Arrange
        const { serverRuntime, requestingSession } = await commandSetup();
        const project = await projectSeed();

        // Act
        const result = await projectTimersStart(
            requestingSession.userId!,
            [{ projectId: project.projectId, taskId: null, title: 'Drafting offer' }],
            requestingSession,
            serverRuntime,
        );

        // Assert
        const [timer] = await testDb.select().from(projectActivities).where(eq(projectActivities.activityId, result.referenceIds![0]!));
        expect(timer?.title).toBe('Drafting offer');
        expect(timer?.taskId).toBeNull();
    });

    it('projectTimersStop stamps endedAt and computes durationSec', async () => {
        // Arrange
        const { serverRuntime, requestingSession } = await commandSetup();
        const project = await projectSeed();
        const started = await projectTimersStart(
            requestingSession.userId!,
            [{ projectId: project.projectId, taskId: null, title: null }],
            requestingSession,
            serverRuntime,
        );
        const activityId = started.referenceIds![0]!;

        // Act
        await projectTimersStop(requestingSession.userId!, [activityId], requestingSession, serverRuntime);

        // Assert
        const [stopped] = await testDb.select().from(projectActivities).where(eq(projectActivities.activityId, activityId));
        expect(stopped?.endedAt).not.toBeNull();
        expect(stopped?.durationSec).not.toBeNull();
        expect(stopped?.durationSec).toBeGreaterThanOrEqual(0);
    });

    it('projectTimersStop is idempotent on an already-stopped row', async () => {
        // Arrange
        const { serverRuntime, requestingSession } = await commandSetup();
        const project = await projectSeed();
        const started = await projectTimersStart(
            requestingSession.userId!,
            [{ projectId: project.projectId, taskId: null, title: null }],
            requestingSession,
            serverRuntime,
        );
        const activityId = started.referenceIds![0]!;
        await projectTimersStop(requestingSession.userId!, [activityId], requestingSession, serverRuntime);
        const [first] = await testDb.select().from(projectActivities).where(eq(projectActivities.activityId, activityId));

        // Act — stop again.
        await projectTimersStop(requestingSession.userId!, [activityId], requestingSession, serverRuntime);

        // Assert — endedAt and durationSec did not change between calls.
        const [second] = await testDb.select().from(projectActivities).where(eq(projectActivities.activityId, activityId));
        expect(second?.endedAt).toStrictEqual(first?.endedAt);
        expect(second?.durationSec).toBe(first?.durationSec);
    });

    it('projectTimersStop throws if an id does not exist', async () => {
        // Arrange
        const { serverRuntime, requestingSession } = await commandSetup();

        // Act + Assert
        await expect(projectTimersStop(requestingSession.userId!, [crypto.randomUUID()], requestingSession, serverRuntime)).rejects.toThrow(
            /rows not found/,
        );
    });
});
