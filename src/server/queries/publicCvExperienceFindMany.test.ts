import { describe, expect, it } from 'vitest';

import { commandSetup } from '../test/commandTestUtils';
import { cvExperienceUpsert } from '../commands/cvExperienceUpsert';
import { publicCvExperienceFindMany } from './publicCvExperienceFindMany';

const seed = async (
    serverRuntime: Awaited<ReturnType<typeof commandSetup>>['serverRuntime'],
    requestingSession: Awaited<ReturnType<typeof commandSetup>>['requestingSession'],
    role: string,
    startDate: string,
    endDate: string | null,
) =>
    cvExperienceUpsert(
        requestingSession.userId!,
        {
            input: {
                cvExperienceId: null,
                roleDe: role,
                roleEn: role,
                company: 'c',
                startDate,
                endDate,
                descriptionDe: 'd',
                descriptionEn: 'd',
                technologies: [],
                managerName: null,
            },
        },
        requestingSession,
        serverRuntime,
    );

describe('publicCvExperienceFindMany', () => {
    it('orders ongoing roles first, then by endDate desc, then by startDate desc', async () => {
        // Arrange — four rows that exercise every ordering rule:
        //   ongoing: endDate=null            → first
        //   recent : endDate=2025-06-30      → second
        //   tieA   : endDate=2022-12-31, startDate=2022-06-01
        //   tieB   : endDate=2022-12-31, startDate=2022-01-01
        // tieA's later startDate wins the endDate tie.
        const { serverRuntime, requestingSession } = await commandSetup();
        const ongoing = await seed(serverRuntime, requestingSession, 'ongoing', '2025-01-01', null);
        const recent = await seed(serverRuntime, requestingSession, 'recent', '2024-01-01', '2025-06-30');
        const tieA = await seed(serverRuntime, requestingSession, 'tieA', '2022-06-01', '2022-12-31');
        const tieB = await seed(serverRuntime, requestingSession, 'tieB', '2022-01-01', '2022-12-31');

        // Act
        const all = await publicCvExperienceFindMany(requestingSession, serverRuntime);

        // Assert — restrict to the four seeded rows; siblings in the shared
        // test DB sit further back chronologically and would otherwise
        // perturb the assertion.
        const seededIds = new Set([ongoing.cvExperienceId, recent.cvExperienceId, tieA.cvExperienceId, tieB.cvExperienceId]);
        const projected = all.filter((row) => seededIds.has(row.cvExperienceId));
        expect(projected.map((row) => row.roleDe)).toEqual(['ongoing', 'recent', 'tieA', 'tieB']);
    });
});
