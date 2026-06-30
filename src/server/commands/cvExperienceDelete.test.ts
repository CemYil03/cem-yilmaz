import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { cvExperience } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { cvExperienceDelete } from './cvExperienceDelete';
import { cvExperienceUpsert } from './cvExperienceUpsert';

describe('cvExperienceDelete', () => {
    it('removes the row and reports success', async () => {
        // Arrange — seed a row
        const { serverRuntime, requestingSession } = await commandSetup();
        const created = await cvExperienceUpsert(
            requestingSession.userId!,
            {
                input: {
                    cvExperienceId: null,
                    roleDe: 'r',
                    roleEn: 'r',
                    company: 'c',
                    startDate: '2024-01-01',
                    endDate: '2024-12-31',
                    descriptionDe: 'd',
                    descriptionEn: 'd',
                    technologies: [],
                    managerName: null,
                },
            },
            requestingSession,
            serverRuntime,
        );

        // Act
        const result = await cvExperienceDelete(
            requestingSession.userId!,
            { cvExperienceId: created.cvExperienceId },
            requestingSession,
            serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: true });
        const rows = await testDb.select().from(cvExperience).where(eq(cvExperience.cvExperienceId, created.cvExperienceId));
        expect(rows).toHaveLength(0);
    });

    it('throws when the row does not exist', async () => {
        // Arrange
        const { serverRuntime, requestingSession } = await commandSetup();
        const missingId = crypto.randomUUID();

        // Act + Assert
        await expect(
            cvExperienceDelete(requestingSession.userId!, { cvExperienceId: missingId }, requestingSession, serverRuntime),
        ).rejects.toThrow(/not found/);
    });
});
