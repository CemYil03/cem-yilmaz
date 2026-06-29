import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { projectRequests, projects } from '../db/schema';
import type { ProjectRequestCreate } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { projectFromRequest } from './projectFromRequest';

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

describe('projectFromRequest', () => {
    it('creates a planning project linked to the request and archives the request in one transaction', async () => {
        // Arrange
        const { serverRuntime, requestingSession } = await commandSetup();
        const request = await requestSeed();

        // Act
        const project = await projectFromRequest({ projectRequestId: request.projectRequestId }, requestingSession, serverRuntime);

        // Assert — returned project has the expected shape
        expect(project.status).toBe('planning');
        expect(project.sourceRequest?.projectRequestId).toBe(request.projectRequestId);
        expect(project.title).toContain('Visitor Co');
        expect(project.description).toBe('Build a small landing page.');
        expect(project.notes).toContain('Budget: 5–10k €');
        expect(project.notes).toContain('Timeline: Q3 2026');
        expect(project.notes).toContain('visitor@example.com');

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
        await expect(projectFromRequest({ projectRequestId: request.projectRequestId }, requestingSession, serverRuntime)).rejects.toThrow(
            /expected 'emailVerified'/,
        );

        // The request must stay in its prior state — no half-baked conversion.
        const [persisted] = await testDb
            .select()
            .from(projectRequests)
            .where(eq(projectRequests.projectRequestId, request.projectRequestId));
        expect(persisted?.status).toBe('pendingOtp');
    });

    it('uses the visitor name when no company is supplied', async () => {
        // Arrange
        const { serverRuntime, requestingSession } = await commandSetup();
        const request = await requestSeed({ company: null });

        // Act
        const project = await projectFromRequest({ projectRequestId: request.projectRequestId }, requestingSession, serverRuntime);

        // Assert
        expect(project.title).toContain('Visitor Name');
    });
});
