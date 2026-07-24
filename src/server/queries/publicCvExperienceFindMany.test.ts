import { describe, expect, it } from 'vitest';

import { cvExperiencesUpsert } from '../commands/cvExperiencesUpsert';
import { commandSetup } from '../test/commandTestUtils';
import { publicCvExperienceFindMany } from './publicCvExperienceFindMany';

const seed = async (
    serverRuntime: Awaited<ReturnType<typeof commandSetup>>['serverRuntime'],
    requestingSession: Awaited<ReturnType<typeof commandSetup>>['requestingSession'],
    role: string,
    startDate: string,
    endDate: string | null,
) => {
    const result = await cvExperiencesUpsert(
        requestingSession.userId!,
        [
            {
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
        ],
        requestingSession,
        serverRuntime,
    );
    return result.referenceIds![0]!;
};

describe('publicCvExperienceFindMany', () => {
    it('orders ongoing roles first, then by endDate desc, then by startDate desc', async () => {
        // Arrange — four rows that exercise every ordering rule:
        //   ongoing: endDate=null            → first
        //   recent : endDate=2025-06-30      → second
        //   tieA   : endDate=2022-12-31, startDate=2022-06-01
        //   tieB   : endDate=2022-12-31, startDate=2022-01-01
        // tieA's later startDate wins the endDate tie.
        const { serverRuntime, requestingSession } = await commandSetup();
        const ongoingId = await seed(serverRuntime, requestingSession, 'ongoing', '2025-01-01', null);
        const recentId = await seed(serverRuntime, requestingSession, 'recent', '2024-01-01', '2025-06-30');
        const tieAId = await seed(serverRuntime, requestingSession, 'tieA', '2022-06-01', '2022-12-31');
        const tieBId = await seed(serverRuntime, requestingSession, 'tieB', '2022-01-01', '2022-12-31');

        // Act
        const all = await publicCvExperienceFindMany(requestingSession, serverRuntime);

        // Assert — restrict to the four seeded rows; siblings in the shared
        // test DB sit further back chronologically and would otherwise
        // perturb the assertion.
        const seededIds = new Set([ongoingId, recentId, tieAId, tieBId]);
        const projected = all.filter((row) => seededIds.has(row.cvExperienceId));
        expect(projected.map((row) => row.roleDe)).toEqual(['ongoing', 'recent', 'tieA', 'tieB']);
    });
});
