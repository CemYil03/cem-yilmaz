import { asc } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { cvExperience } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { cvExperienceReorder } from './cvExperienceReorder';
import { cvExperienceUpsert } from './cvExperienceUpsert';

const seed = async (
    serverRuntime: Awaited<ReturnType<typeof commandSetup>>['serverRuntime'],
    requestingSession: Awaited<ReturnType<typeof commandSetup>>['requestingSession'],
    role: string,
    position: number,
) =>
    cvExperienceUpsert(
        {
            input: {
                cvExperienceId: null,
                roleDe: role,
                roleEn: role,
                companyDe: 'c',
                companyEn: 'c',
                startDate: '2024-01-01',
                endDate: '2024-12-31',
                descriptionDe: 'd',
                descriptionEn: 'd',
                technologies: [],
                managerName: null,
                position,
            },
        },
        requestingSession,
        serverRuntime,
    );

describe('cvExperienceReorder', () => {
    it('rewrites position to the array order', async () => {
        // Arrange — three rows seeded in one order
        const { serverRuntime, requestingSession } = await commandSetup();
        const a = await seed(serverRuntime, requestingSession, 'A', 0);
        const b = await seed(serverRuntime, requestingSession, 'B', 1);
        const c = await seed(serverRuntime, requestingSession, 'C', 2);

        // Act — reorder to C, A, B
        await cvExperienceReorder({ orderedIds: [c.cvExperienceId, a.cvExperienceId, b.cvExperienceId] }, requestingSession, serverRuntime);

        // Assert — positions follow the new order, ascending
        const rows = await testDb.select().from(cvExperience).orderBy(asc(cvExperience.position));
        const onlyMine = rows.filter((row) => [a, b, c].some((seeded) => seeded.cvExperienceId === row.cvExperienceId));
        expect(onlyMine.map((row) => row.roleDe)).toEqual(['C', 'A', 'B']);
        expect(onlyMine.map((row) => row.position)).toEqual([0, 1, 2]);
    });
});
