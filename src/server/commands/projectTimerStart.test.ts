import { eq, isNull } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { projectActivities, projects } from '../db/schema';
import type { ProjectCreate } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { projectTimerStart } from './projectTimerStart';
import { projectTimerStop } from './projectTimerStop';

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

describe('projectTimerStart', () => {
    it('inserts a running timer row when no other timer is active', async () => {
        // Arrange
        const { serverRuntime, requestingSession } = await commandSetup();
        const project = await projectSeed();

        // Act
        const timer = await projectTimerStart(
            { projectId: project.projectId, taskId: null, title: null },
            requestingSession,
            serverRuntime,
        );

        // Assert — the returned row is running, attached to the project, and
        // has the default title.
        expect(timer.kind).toBe('work');
        expect(timer.projectId).toBe(project.projectId);
        expect(timer.endedAt).toBeNull();
        expect(timer.title).toBe('Work session');

        // DB-side: exactly one running work row exists.
        const open = await testDb.select().from(projectActivities).where(isNull(projectActivities.endedAt));
        expect(open).toHaveLength(1);
        expect(open[0]?.activityId).toBe(timer.activityId);
    });

    it('stops the existing running timer before starting a new one', async () => {
        // Arrange
        const { serverRuntime, requestingSession } = await commandSetup();
        const projectA = await projectSeed({ title: 'A' });
        const projectB = await projectSeed({ title: 'B' });

        // Act — start on A, then on B without an explicit stop.
        const timerA = await projectTimerStart(
            { projectId: projectA.projectId, taskId: null, title: 'first' },
            requestingSession,
            serverRuntime,
        );
        const timerB = await projectTimerStart(
            { projectId: projectB.projectId, taskId: null, title: 'second' },
            requestingSession,
            serverRuntime,
        );

        // Assert — exactly one running row, and it's B.
        const open = await testDb.select().from(projectActivities).where(isNull(projectActivities.endedAt));
        expect(open).toHaveLength(1);
        expect(open[0]?.activityId).toBe(timerB.activityId);

        // The A row is closed with a non-negative duration.
        const [closedA] = await testDb.select().from(projectActivities).where(eq(projectActivities.activityId, timerA.activityId));
        expect(closedA?.endedAt).not.toBeNull();
        expect(closedA?.durationSec).not.toBeNull();
        expect(closedA?.durationSec).toBeGreaterThanOrEqual(0);
    });

    it('honours an explicit title and task link', async () => {
        // Arrange
        const { serverRuntime, requestingSession } = await commandSetup();
        const project = await projectSeed();

        // Act
        const timer = await projectTimerStart(
            { projectId: project.projectId, taskId: null, title: 'Drafting offer' },
            requestingSession,
            serverRuntime,
        );

        // Assert
        expect(timer.title).toBe('Drafting offer');
        expect(timer.taskId).toBeNull();
    });

    it('projectTimerStop stamps endedAt and computes durationSec', async () => {
        // Arrange
        const { serverRuntime, requestingSession } = await commandSetup();
        const project = await projectSeed();
        const timer = await projectTimerStart(
            { projectId: project.projectId, taskId: null, title: null },
            requestingSession,
            serverRuntime,
        );

        // Act
        const stopped = await projectTimerStop({ activityId: timer.activityId }, requestingSession, serverRuntime);

        // Assert
        expect(stopped.endedAt).not.toBeNull();
        expect(stopped.durationSec).not.toBeNull();
        expect(stopped.durationSec).toBeGreaterThanOrEqual(0);
    });

    it('projectTimerStop is idempotent on an already-stopped row', async () => {
        // Arrange
        const { serverRuntime, requestingSession } = await commandSetup();
        const project = await projectSeed();
        const timer = await projectTimerStart(
            { projectId: project.projectId, taskId: null, title: null },
            requestingSession,
            serverRuntime,
        );
        const first = await projectTimerStop({ activityId: timer.activityId }, requestingSession, serverRuntime);

        // Act — stop again.
        const second = await projectTimerStop({ activityId: timer.activityId }, requestingSession, serverRuntime);

        // Assert — endedAt and durationSec did not change between calls.
        expect(second.endedAt).toStrictEqual(first.endedAt);
        expect(second.durationSec).toBe(first.durationSec);
    });
});
