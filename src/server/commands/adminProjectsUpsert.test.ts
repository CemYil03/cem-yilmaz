import { desc, eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { projectRequests, projects } from '../db/schema';
import type { AdminProjectRequestCreate } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { adminProjectsUpsert } from './adminProjectsUpsert';

const requestSeed = async (overrides: Partial<AdminProjectRequestCreate> = {}) => {
    const projectRequestId = crypto.randomUUID();
    const [row] = await testDb
        .insert(projectRequests)
        .values({
            projectRequestId,
            chatId: null,
            name: 'Visitor Name',
            email: 'visitor@example.com',
            company: 'Visitor Co',
            projectType: 'webApp',
            description: 'Build a small landing page.',
            budget: '5–10k €',
            timeline: 'Q3 2026',
            status: 'emailVerified',
            otpHash: 'unused-by-test',
            otpSalt: 'unused-by-test',
            otpExpiresAt: new Date(Date.now() + 60_000),
            verifiedAt: new Date(),
            ...overrides,
        })
        .returning();
    if (!row) throw new Error('seed: insert returned no rows');
    return row;
};

describe('adminProjectsUpsert', () => {
    it('creates a hand-authored project at the requested position', async () => {
        // Arrange
        const { serverRuntime, requestingSession } = await commandSetup();

        // Act
        const result = await adminProjectsUpsert(
            requestingSession.userId!,
            [
                {
                    projectId: null,
                    title: 'New idea',
                    description: null,
                    notes: null,
                    status: 'idea',
                    position: 2,
                    sourceRequestId: null,
                    startedAt: null,
                    completedAt: null,
                },
            ],
            requestingSession,
            serverRuntime,
        );

        // Assert
        expect(result.success).toBe(true);
        expect(result.referenceIds).toHaveLength(1);
        const projectId = result.referenceIds![0]!;
        const [persisted] = await testDb.select().from(projects).where(eq(projects.projectId, projectId));
        expect(persisted?.status).toBe('idea');
        expect(persisted?.position).toBe(2);
        expect(persisted?.sourceRequestId).toBeNull();
    });

    it('defaults position to the end of the planning column when omitted on create', async () => {
        // Arrange
        const { serverRuntime, requestingSession } = await commandSetup();
        // Seed an existing planning project at a position strictly above the
        // current tail so the test never depends on whether other test files
        // left planning rows behind. The new row should land at `seedPos + 1`.
        const [currentTail] = await testDb
            .select({ position: projects.position })
            .from(projects)
            .where(eq(projects.status, 'planning'))
            .orderBy(desc(projects.position))
            .limit(1);
        const seedPos = (currentTail?.position ?? -1) + 100;
        await testDb.insert(projects).values({
            projectId: crypto.randomUUID(),
            title: 'Existing planning',
            status: 'planning',
            position: seedPos,
            sourceRequestId: null,
            description: null,
            notes: null,
            startedAt: null,
            completedAt: null,
            updatedAt: new Date(),
        });

        // Act
        const result = await adminProjectsUpsert(
            requestingSession.userId!,
            [
                {
                    projectId: null,
                    title: 'Auto-positioned',
                    description: null,
                    notes: null,
                    status: 'planning',
                    position: null,
                    sourceRequestId: null,
                    startedAt: null,
                    completedAt: null,
                },
            ],
            requestingSession,
            serverRuntime,
        );

        // Assert
        const [persisted] = await testDb.select().from(projects).where(eq(projects.projectId, result.referenceIds![0]!));
        expect(persisted?.position).toBe(seedPos + 1);
    });

    it('appends multiple planning creates contiguously from the tail read once', async () => {
        // Arrange
        const { serverRuntime, requestingSession } = await commandSetup();
        const [currentTail] = await testDb
            .select({ position: projects.position })
            .from(projects)
            .where(eq(projects.status, 'planning'))
            .orderBy(desc(projects.position))
            .limit(1);
        const seedPos = (currentTail?.position ?? -1) + 100;
        await testDb.insert(projects).values({
            projectId: crypto.randomUUID(),
            title: 'Existing planning',
            status: 'planning',
            position: seedPos,
            sourceRequestId: null,
            description: null,
            notes: null,
            startedAt: null,
            completedAt: null,
            updatedAt: new Date(),
        });

        // Act — two creates without positions land contiguously above the tail.
        const result = await adminProjectsUpsert(
            requestingSession.userId!,
            [
                {
                    projectId: null,
                    title: 'First append',
                    description: null,
                    notes: null,
                    status: 'planning',
                    position: null,
                    sourceRequestId: null,
                    startedAt: null,
                    completedAt: null,
                },
                {
                    projectId: null,
                    title: 'Second append',
                    description: null,
                    notes: null,
                    status: 'planning',
                    position: null,
                    sourceRequestId: null,
                    startedAt: null,
                    completedAt: null,
                },
            ],
            requestingSession,
            serverRuntime,
        );

        // Assert
        const [first] = await testDb.select().from(projects).where(eq(projects.projectId, result.referenceIds![0]!));
        const [second] = await testDb.select().from(projects).where(eq(projects.projectId, result.referenceIds![1]!));
        expect(first?.position).toBe(seedPos + 1);
        expect(second?.position).toBe(seedPos + 2);
    });

    it('echoes referenceIds in input order for a mixed insert + update batch', async () => {
        // Arrange — one existing row to update, one fresh insert.
        const { serverRuntime, requestingSession } = await commandSetup();
        const existingId = crypto.randomUUID();
        await testDb.insert(projects).values({
            projectId: existingId,
            title: 'Existing',
            status: 'active',
            position: 0,
            sourceRequestId: null,
            description: null,
            notes: null,
            startedAt: null,
            completedAt: null,
            updatedAt: new Date(),
        });

        // Act
        const result = await adminProjectsUpsert(
            requestingSession.userId!,
            [
                {
                    projectId: existingId,
                    title: 'Existing renamed',
                    description: null,
                    notes: null,
                    status: 'active',
                    position: 0,
                    sourceRequestId: null,
                    startedAt: null,
                    completedAt: null,
                },
                {
                    projectId: null,
                    title: 'Brand new',
                    description: null,
                    notes: null,
                    status: 'idea',
                    position: 1,
                    sourceRequestId: null,
                    startedAt: null,
                    completedAt: null,
                },
            ],
            requestingSession,
            serverRuntime,
        );

        // Assert — first referenceId is the existing id, second is a fresh uuid.
        expect(result.referenceIds).toHaveLength(2);
        expect(result.referenceIds![0]).toBe(existingId);
        expect(result.referenceIds![1]).not.toBe(existingId);
        const [updated] = await testDb.select().from(projects).where(eq(projects.projectId, existingId));
        expect(updated?.title).toBe('Existing renamed');
        const [created] = await testDb.select().from(projects).where(eq(projects.projectId, result.referenceIds![1]!));
        expect(created?.title).toBe('Brand new');
    });

    it('converts a verified request: links the project and archives the request in one transaction', async () => {
        // Arrange
        const { serverRuntime, requestingSession } = await commandSetup();
        const request = await requestSeed();

        // Act
        const result = await adminProjectsUpsert(
            requestingSession.userId!,
            [
                {
                    projectId: null,
                    title: 'Web app: Visitor Co',
                    description: request.description,
                    notes: 'Budget: 5–10k €\nTimeline: Q3 2026\nContact: Visitor Name <visitor@example.com>',
                    status: 'planning',
                    position: null,
                    sourceRequestId: request.projectRequestId,
                    startedAt: null,
                    completedAt: null,
                },
            ],
            requestingSession,
            serverRuntime,
        );

        // Assert — project persisted with `sourceRequestId`, request archived
        const [persistedProject] = await testDb.select().from(projects).where(eq(projects.projectId, result.referenceIds![0]!));
        expect(persistedProject?.status).toBe('planning');
        expect(persistedProject?.sourceRequestId).toBe(request.projectRequestId);

        const [persistedRequest] = await testDb
            .select()
            .from(projectRequests)
            .where(eq(projectRequests.projectRequestId, request.projectRequestId));
        expect(persistedRequest?.status).toBe('archived');
    });

    it('refuses to convert a request that is not emailVerified', async () => {
        // Arrange
        const { serverRuntime, requestingSession } = await commandSetup();
        const request = await requestSeed({ status: 'pendingOtp', verifiedAt: null });

        // Act + Assert
        await expect(
            adminProjectsUpsert(
                requestingSession.userId!,
                [
                    {
                        projectId: null,
                        title: 'irrelevant',
                        description: null,
                        notes: null,
                        status: 'planning',
                        position: null,
                        sourceRequestId: request.projectRequestId,
                        startedAt: null,
                        completedAt: null,
                    },
                ],
                requestingSession,
                serverRuntime,
            ),
        ).rejects.toThrow(/expected 'emailVerified'/);

        // The request must stay in its prior state — no half-baked conversion.
        const [persisted] = await testDb
            .select()
            .from(projectRequests)
            .where(eq(projectRequests.projectRequestId, request.projectRequestId));
        expect(persisted?.status).toBe('pendingOtp');
    });

    it('refuses to convert against an unknown sourceRequestId', async () => {
        // Arrange
        const { serverRuntime, requestingSession } = await commandSetup();

        // Act + Assert
        await expect(
            adminProjectsUpsert(
                requestingSession.userId!,
                [
                    {
                        projectId: null,
                        title: 'irrelevant',
                        description: null,
                        notes: null,
                        status: 'planning',
                        position: null,
                        sourceRequestId: crypto.randomUUID(),
                        startedAt: null,
                        completedAt: null,
                    },
                ],
                requestingSession,
                serverRuntime,
            ),
        ).rejects.toThrow(/source request .* not found/);
    });

    it('updates an existing project without touching any request', async () => {
        // Arrange
        const { serverRuntime, requestingSession } = await commandSetup();
        const projectId = crypto.randomUUID();
        await testDb.insert(projects).values({
            projectId,
            title: 'Original',
            status: 'planning',
            position: 0,
            sourceRequestId: null,
            description: null,
            notes: null,
            startedAt: null,
            completedAt: null,
            updatedAt: new Date(),
        });

        // Act
        const result = await adminProjectsUpsert(
            requestingSession.userId!,
            [
                {
                    projectId,
                    title: 'Renamed',
                    description: 'now with description',
                    notes: null,
                    status: 'active',
                    position: 0,
                    sourceRequestId: null,
                    startedAt: null,
                    completedAt: null,
                },
            ],
            requestingSession,
            serverRuntime,
        );

        // Assert
        expect(result.referenceIds![0]).toBe(projectId);
        const [persisted] = await testDb.select().from(projects).where(eq(projects.projectId, projectId));
        expect(persisted?.title).toBe('Renamed');
        expect(persisted?.status).toBe('active');
    });

    it('throws when updating a project id that does not exist', async () => {
        // Arrange
        const { serverRuntime, requestingSession } = await commandSetup();

        // Act + Assert
        await expect(
            adminProjectsUpsert(
                requestingSession.userId!,
                [
                    {
                        projectId: crypto.randomUUID(),
                        title: 'ghost',
                        description: null,
                        notes: null,
                        status: 'active',
                        position: 0,
                        sourceRequestId: null,
                        startedAt: null,
                        completedAt: null,
                    },
                ],
                requestingSession,
                serverRuntime,
            ),
        ).rejects.toThrow(/rows not found/);
    });
});
