import { eq, inArray } from 'drizzle-orm';
import { cvEducation } from '../db/schema';
import type { CvEducationCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSCvEducationInput, GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Batch upsert of CV education rows. Same shape as `cvExperiencesUpsert`.
// Education carries a `position` column that the editor writes explicitly;
// bulk reordering across the list goes through `cvEducationReorder`.
export async function cvEducationsUpsert(
    userId: string,
    inputs: readonly GqlSCvEducationInput[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    const now = new Date();

    // Phase 1 — payload construction.
    const rows = inputs.map((input) => {
        const cvEducationId = input.cvEducationId ?? crypto.randomUUID();
        const payload: CvEducationCreate = {
            cvEducationId,
            degreeDe: input.degreeDe,
            degreeEn: input.degreeEn,
            institution: input.institution,
            subjectDe: input.subjectDe,
            subjectEn: input.subjectEn,
            startDate: input.startDate ?? null,
            endDate: input.endDate,
            notesDe: input.notesDe,
            notesEn: input.notesEn,
            position: input.position,
            updatedAt: now,
        };
        return { cvEducationId, isUpdate: Boolean(input.cvEducationId), payload };
    });

    // Phase 2 — transactional execution.
    try {
        const updateIds = rows.filter((row) => row.isUpdate).map((row) => row.cvEducationId);
        await serverRuntime.db.transaction(async (transaction) => {
            if (updateIds.length > 0) {
                const existing = await transaction
                    .select({ cvEducationId: cvEducation.cvEducationId })
                    .from(cvEducation)
                    .where(inArray(cvEducation.cvEducationId, updateIds));
                if (existing.length !== updateIds.length) {
                    const found = new Set(existing.map((row) => row.cvEducationId));
                    const missing = updateIds.filter((id) => !found.has(id));
                    throw new Error(`cvEducationsUpsert: rows not found: ${missing.join(', ')}`);
                }
            }
            for (const row of rows) {
                if (row.isUpdate) {
                    await transaction.update(cvEducation).set(row.payload).where(eq(cvEducation.cvEducationId, row.cvEducationId));
                } else {
                    await transaction.insert(cvEducation).values(row.payload);
                }
            }
        });
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: rows.map((row) => row.cvEducationId) };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
