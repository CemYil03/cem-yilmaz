import { asc, eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { tasks } from '../db/schema';
import type { AdminProjectTaskCreate } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { adminProjectTaskReorder } from './adminProjectTaskReorder';

const taskSeed = async (overrides: Partial<AdminProjectTaskCreate> = {}) => {
    const taskId = crypto.randomUUID();
    const [row] = await testDb
        .insert(tasks)
        .values({
            taskId,
            projectId: null,
            title: 'task',
            status: 'todo',
            position: 0,
            ...overrides,
        })
        .returning();
    if (!row) throw new Error('seed: insert returned no rows');
    return row;
};

describe('adminProjectTaskReorder', () => {
    it('rewrites position to match the array order', async () => {
        // Arrange — three standalone todos seeded out of order
        const { serverRuntime, requestingSession } = await commandSetup();
        const a = await taskSeed({ title: 'A', position: 0 });
        const b = await taskSeed({ title: 'B', position: 1 });
        const c = await taskSeed({ title: 'C', position: 2 });

        // Act — reorder to C, A, B
        await adminProjectTaskReorder(
            requestingSession.userId!,
            { orderedIds: [c.taskId, a.taskId, b.taskId] },
            requestingSession,
            serverRuntime,
        );

        // Assert — positions follow the new order, ascending and monotonic
        const rows = await testDb.select().from(tasks).orderBy(asc(tasks.position));
        const mine = rows.filter((row) => [a.taskId, b.taskId, c.taskId].includes(row.taskId));
        expect(mine.map((row) => row.title)).toEqual(['C', 'A', 'B']);
        expect(mine.map((row) => row.position)).toEqual([0, 1, 2]);
    });

    it('is idempotent for a single-id list', async () => {
        // Arrange
        const { serverRuntime, requestingSession } = await commandSetup();
        const a = await taskSeed({ title: 'only', position: 7 });

        // Act
        await adminProjectTaskReorder(requestingSession.userId!, { orderedIds: [a.taskId] }, requestingSession, serverRuntime);

        // Assert
        const [persisted] = await testDb.select().from(tasks).where(eq(tasks.taskId, a.taskId));
        expect(persisted?.position).toBe(0);
    });
});
