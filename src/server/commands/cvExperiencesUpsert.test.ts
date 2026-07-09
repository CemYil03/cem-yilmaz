import { eq, inArray } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { cvExperience } from '../db/schema';
import type { GqlSCvExperienceInput } from '../graphql/generated';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { cvExperiencesUpsert } from './cvExperiencesUpsert';

const baseInput = (overrides: Partial<GqlSCvExperienceInput> = {}): GqlSCvExperienceInput => ({
    cvExperienceId: null,
    roleDe: 'Test-Rolle',
    roleEn: 'Test role',
    company: 'Test GmbH',
    startDate: '2024-01-01',
    endDate: '2024-06-30',
    descriptionDe: 'Test-Beschreibung',
    descriptionEn: 'Test description',
    technologies: ['React', 'TypeScript'],
    managerName: 'Test Manager',
    ...overrides,
});

describe('cvExperiencesUpsert', () => {
    it('inserts a new row when no cvExperienceId is supplied', async () => {
        // Arrange
        const { serverRuntime, requestingSession } = await commandSetup();

        // Act
        const result = await cvExperiencesUpsert(requestingSession.userId!, [baseInput()], requestingSession, serverRuntime);

        // Assert — batch result echoes the id of the freshly-created row
        expect(result.success).toBe(true);
        expect(result.referenceId).toBeNull();
        expect(result.referenceIds).toHaveLength(1);

        const createdId = result.referenceIds![0]!;
        const rows = await testDb.select().from(cvExperience).where(eq(cvExperience.cvExperienceId, createdId));
        expect(rows).toHaveLength(1);
        expect(rows[0]!.roleDe).toBe('Test-Rolle');
        expect(rows[0]!.technologies).toEqual(['React', 'TypeScript']);
        expect(serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: requestingSession.userId });
    });

    it('updates the existing row when cvExperienceId is supplied', async () => {
        // Arrange — seed a row, then upsert with the same id and new values
        const { serverRuntime, requestingSession } = await commandSetup();
        const seeded = await cvExperiencesUpsert(requestingSession.userId!, [baseInput()], requestingSession, serverRuntime);
        const createdId = seeded.referenceIds![0]!;

        // Act
        const updated = await cvExperiencesUpsert(
            requestingSession.userId!,
            [baseInput({ cvExperienceId: createdId, roleDe: 'Aktualisierte Rolle' })],
            requestingSession,
            serverRuntime,
        );

        // Assert — the same id, new content, no second row
        expect(updated.referenceIds).toEqual([createdId]);
        const rows = await testDb.select().from(cvExperience).where(eq(cvExperience.cvExperienceId, createdId));
        expect(rows).toHaveLength(1);
        expect(rows[0]!.roleDe).toBe('Aktualisierte Rolle');
    });

    it('throws when updating a row that does not exist', async () => {
        // Arrange
        const { serverRuntime, requestingSession } = await commandSetup();
        const missingId = crypto.randomUUID();

        // Act + Assert
        await expect(
            cvExperiencesUpsert(requestingSession.userId!, [baseInput({ cvExperienceId: missingId })], requestingSession, serverRuntime),
        ).rejects.toThrow(/not found/);
    });

    it('persists null endDate as the ongoing marker', async () => {
        // Arrange
        const { serverRuntime, requestingSession } = await commandSetup();

        // Act — `null` endDate is the canonical "heute" representation
        const result = await cvExperiencesUpsert(
            requestingSession.userId!,
            [baseInput({ endDate: null })],
            requestingSession,
            serverRuntime,
        );

        // Assert
        const createdId = result.referenceIds![0]!;
        const rows = await testDb.select().from(cvExperience).where(eq(cvExperience.cvExperienceId, createdId));
        expect(rows[0]!.endDate).toBeNull();
    });

    it('rolls the whole batch back when one row cannot be updated', async () => {
        // Arrange — one insert alongside one update targeting a missing id.
        // The transactional posture means the insert must not survive.
        const { serverRuntime, requestingSession } = await commandSetup();
        const missingId = crypto.randomUUID();
        const insertInput = baseInput({ roleDe: 'Nicht persistieren' });

        // Act + Assert
        await expect(
            cvExperiencesUpsert(
                requestingSession.userId!,
                [insertInput, baseInput({ cvExperienceId: missingId })],
                requestingSession,
                serverRuntime,
            ),
        ).rejects.toThrow(/not found/);

        // The insert side of the batch must not have leaked through.
        const rows = await testDb.select().from(cvExperience).where(eq(cvExperience.roleDe, 'Nicht persistieren'));
        expect(rows).toHaveLength(0);
        expect(serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
    });

    it('echoes referenceIds in input order for a mixed insert + update batch', async () => {
        // Arrange — seed two rows we can update, then hand back a batch that
        // interleaves inserts and updates. The point of the assertion is that
        // `referenceIds[i]` corresponds to `inputs[i]`, regardless of whether
        // the row already existed.
        const { serverRuntime, requestingSession } = await commandSetup();
        const seedA = await cvExperiencesUpsert(
            requestingSession.userId!,
            [baseInput({ roleDe: 'Seed A' })],
            requestingSession,
            serverRuntime,
        );
        const seedB = await cvExperiencesUpsert(
            requestingSession.userId!,
            [baseInput({ roleDe: 'Seed B' })],
            requestingSession,
            serverRuntime,
        );
        const seededA = seedA.referenceIds![0]!;
        const seededB = seedB.referenceIds![0]!;

        // Act — insert, update, insert, update in that specific order.
        const result = await cvExperiencesUpsert(
            requestingSession.userId!,
            [
                baseInput({ roleDe: 'Insert 1' }),
                baseInput({ cvExperienceId: seededA, roleDe: 'Updated A' }),
                baseInput({ roleDe: 'Insert 2' }),
                baseInput({ cvExperienceId: seededB, roleDe: 'Updated B' }),
            ],
            requestingSession,
            serverRuntime,
        );

        // Assert — length, index-aligned ids for the two updates, and the two
        // inserts got freshly-minted ids that also line up with the DB rows.
        expect(result.referenceIds).toHaveLength(4);
        expect(result.referenceIds![1]).toBe(seededA);
        expect(result.referenceIds![3]).toBe(seededB);

        const insertedIds = [result.referenceIds![0]!, result.referenceIds![2]!];
        const insertedRows = await testDb.select().from(cvExperience).where(inArray(cvExperience.cvExperienceId, insertedIds));
        const rolesById = Object.fromEntries(insertedRows.map((r) => [r.cvExperienceId, r.roleDe]));
        expect(rolesById[insertedIds[0]!]).toBe('Insert 1');
        expect(rolesById[insertedIds[1]!]).toBe('Insert 2');
    });
});
