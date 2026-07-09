import { eq, inArray } from 'drizzle-orm';
import { cvExperience } from '../db/schema';
import type { CvExperienceCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSCvExperienceInput, GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Batch upsert of CV experience rows. Every input with a `cvExperienceId`
// is updated; every input without one is inserted under a freshly-minted
// UUID. The whole batch runs inside a single transaction so a partial
// failure rolls back to zero writes. `referenceIds` echoes the id per
// input row (in input order) so the caller can address newly-created rows
// without a follow-up read. Experience has no `position` column — rows
// are ordered by `endDate` / `startDate` on read.
export async function cvExperiencesUpsert(
    userId: string,
    inputs: readonly GqlSCvExperienceInput[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    const now = new Date();

    // Phase 1 — payload construction.
    const rows = inputs.map((input) => {
        const cvExperienceId = input.cvExperienceId ?? crypto.randomUUID();
        const payload: CvExperienceCreate = {
            cvExperienceId,
            roleDe: input.roleDe,
            roleEn: input.roleEn,
            company: input.company,
            startDate: input.startDate,
            endDate: input.endDate ?? null,
            descriptionDe: input.descriptionDe,
            descriptionEn: input.descriptionEn,
            technologies: input.technologies,
            managerName: input.managerName ?? null,
            updatedAt: now,
        };
        return { cvExperienceId, isUpdate: Boolean(input.cvExperienceId), payload };
    });

    // Phase 2 — transactional execution.
    try {
        const updateIds = rows.filter((row) => row.isUpdate).map((row) => row.cvExperienceId);
        await serverRuntime.db.transaction(async (transaction) => {
            if (updateIds.length > 0) {
                const existing = await transaction
                    .select({ cvExperienceId: cvExperience.cvExperienceId })
                    .from(cvExperience)
                    .where(inArray(cvExperience.cvExperienceId, updateIds));
                if (existing.length !== updateIds.length) {
                    const found = new Set(existing.map((row) => row.cvExperienceId));
                    const missing = updateIds.filter((id) => !found.has(id));
                    throw new Error(`cvExperiencesUpsert: rows not found: ${missing.join(', ')}`);
                }
            }
            for (const row of rows) {
                if (row.isUpdate) {
                    await transaction.update(cvExperience).set(row.payload).where(eq(cvExperience.cvExperienceId, row.cvExperienceId));
                } else {
                    await transaction.insert(cvExperience).values(row.payload);
                }
            }
        });
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: rows.map((row) => row.cvExperienceId) };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
