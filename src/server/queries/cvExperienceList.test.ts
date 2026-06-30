import { describe, expect, it } from 'vitest';

import { commandSetup } from '../test/commandTestUtils';
import { cvExperienceUpsert } from '../commands/cvExperienceUpsert';
import { cvExperienceList } from './cvExperienceList';

const seed = async (
    serverRuntime: Awaited<ReturnType<typeof commandSetup>>['serverRuntime'],
    requestingSession: Awaited<ReturnType<typeof commandSetup>>['requestingSession'],
    role: string,
    position: number,
) =>
    cvExperienceUpsert(
        requestingSession.userId!,
        {
            input: {
                cvExperienceId: null,
                roleDe: role,
                roleEn: role,
                company: 'c',
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

describe('cvExperienceList', () => {
    it('returns rows ordered by position ascending', async () => {
        // Arrange — three rows seeded with non-monotonic positions far above
        // anything other tests in the shared DB might use, so the ordering
        // assertion is not perturbed by sibling data.
        const { serverRuntime, requestingSession } = await commandSetup();
        const aPos = 9_000_001;
        const bPos = 9_000_000;
        const cPos = 9_000_002;
        const a = await seed(serverRuntime, requestingSession, 'A', aPos);
        const b = await seed(serverRuntime, requestingSession, 'B', bPos);
        const c = await seed(serverRuntime, requestingSession, 'C', cPos);

        // Act
        const all = await cvExperienceList(requestingSession, serverRuntime);

        // Assert — ascending by `position` projects "B" before "A" before "C"
        const seededIds = new Set([a.cvExperienceId, b.cvExperienceId, c.cvExperienceId]);
        const projected = all.filter((row) => seededIds.has(row.cvExperienceId));
        expect(projected.map((row) => row.roleDe)).toEqual(['B', 'A', 'C']);
    });
});
