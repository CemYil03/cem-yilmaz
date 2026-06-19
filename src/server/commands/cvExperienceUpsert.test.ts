import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { cvExperience } from '../db/schema';
import type { GqlSAdminMutationCvExperienceUpsertArgs } from '../graphql/generated';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { cvExperienceUpsert } from './cvExperienceUpsert';

const baseInput = (overrides: Partial<GqlSAdminMutationCvExperienceUpsertArgs['input']> = {}): GqlSAdminMutationCvExperienceUpsertArgs => ({
    input: {
        cvExperienceId: null,
        roleDe: 'Test-Rolle',
        roleEn: 'Test role',
        companyDe: 'Test GmbH',
        companyEn: 'Test Inc.',
        startDate: '2024-01-01',
        endDate: '2024-06-30',
        descriptionDe: 'Test-Beschreibung',
        descriptionEn: 'Test description',
        technologies: ['React', 'TypeScript'],
        managerName: 'Test Manager',
        position: 0,
        ...overrides,
    },
});

describe('cvExperienceUpsert', () => {
    it('inserts a new row when no cvExperienceId is supplied', async () => {
        // Arrange
        const { serverRuntime, requestingSession } = await commandSetup();

        // Act
        const result = await cvExperienceUpsert(baseInput({ position: 100 }), requestingSession, serverRuntime);

        // Assert — return shape mirrors the persisted row
        expect(result.roleDe).toBe('Test-Rolle');
        expect(result.position).toBe(100);
        expect(result.endDate).toBe('2024-06-30');

        const rows = await testDb.select().from(cvExperience).where(eq(cvExperience.cvExperienceId, result.cvExperienceId));
        expect(rows).toHaveLength(1);
        expect(rows[0]!.roleDe).toBe('Test-Rolle');
        expect(rows[0]!.technologies).toEqual(['React', 'TypeScript']);
    });

    it('updates the existing row when cvExperienceId is supplied', async () => {
        // Arrange — seed a row, then upsert with the same id and new values
        const { serverRuntime, requestingSession } = await commandSetup();
        const created = await cvExperienceUpsert(baseInput({ position: 200 }), requestingSession, serverRuntime);

        // Act
        const updated = await cvExperienceUpsert(
            baseInput({
                cvExperienceId: created.cvExperienceId,
                roleDe: 'Aktualisierte Rolle',
                position: 200,
            }),
            requestingSession,
            serverRuntime,
        );

        // Assert — the same id, new content, no second row
        expect(updated.cvExperienceId).toBe(created.cvExperienceId);
        expect(updated.roleDe).toBe('Aktualisierte Rolle');
        const rows = await testDb.select().from(cvExperience).where(eq(cvExperience.cvExperienceId, created.cvExperienceId));
        expect(rows).toHaveLength(1);
        expect(rows[0]!.roleDe).toBe('Aktualisierte Rolle');
    });

    it('throws when updating a row that does not exist', async () => {
        // Arrange
        const { serverRuntime, requestingSession } = await commandSetup();
        const missingId = crypto.randomUUID();

        // Act + Assert
        await expect(
            cvExperienceUpsert(baseInput({ cvExperienceId: missingId, position: 0 }), requestingSession, serverRuntime),
        ).rejects.toThrow(/not found/);
    });

    it('persists null endDate as the ongoing marker', async () => {
        // Arrange
        const { serverRuntime, requestingSession } = await commandSetup();

        // Act — `null` endDate is the canonical "heute" representation
        const result = await cvExperienceUpsert(baseInput({ position: 300, endDate: null }), requestingSession, serverRuntime);

        // Assert
        expect(result.endDate).toBeNull();
        const rows = await testDb.select().from(cvExperience).where(eq(cvExperience.cvExperienceId, result.cvExperienceId));
        expect(rows[0]!.endDate).toBeNull();
    });
});
