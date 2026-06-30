import { desc, eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { projectRequests, projects } from '../db/schema';
import type { ProjectRequestCreate } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { projectUpsert } from './projectUpsert';

const requestSeed = async (overrides: Partial<ProjectRequestCreate> = {}) => {
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

describe('projectUpsert', () => {
    it('creates a hand-authored project at the requested position', async () => {
        // Arrange
        const { serverRuntime, requestingSession } = await commandSetup();

        // Act
        const project = await projectUpsert(
            requestingSession.userId!,
            {
                input: {
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
            },
            requestingSession,
            serverRuntime,
        );

        // Assert
        expect(project.status).toBe('idea');
        expect(project.position).toBe(2);
        expect(project.sourceRequest).toBeNull();
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
        const project = await projectUpsert(
            requestingSession.userId!,
            {
                input: {
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
            },
            requestingSession,
            serverRuntime,
        );

        // Assert
        expect(project.position).toBe(seedPos + 1);
    });

    it('converts a verified request: links the project and archives the request in one transaction', async () => {
        // Arrange
        const { serverRuntime, requestingSession } = await commandSetup();
        const request = await requestSeed();

        // Act
        const project = await projectUpsert(
            requestingSession.userId!,
            {
                input: {
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
            },
            requestingSession,
            serverRuntime,
        );

        // Assert — returned project links back to the request
        expect(project.status).toBe('planning');
        expect(project.sourceRequest?.projectRequestId).toBe(request.projectRequestId);

        // Assert — DB-side: project persisted with `sourceRequestId`, request archived
        const [persistedProject] = await testDb.select().from(projects).where(eq(projects.projectId, project.projectId));
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
            projectUpsert(
                requestingSession.userId!,
                {
                    input: {
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
                },
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
            projectUpsert(
                requestingSession.userId!,
                {
                    input: {
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
                },
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
        const project = await projectUpsert(
            requestingSession.userId!,
            {
                input: {
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
            },
            requestingSession,
            serverRuntime,
        );

        // Assert
        expect(project.title).toBe('Renamed');
        expect(project.status).toBe('active');
    });
});
