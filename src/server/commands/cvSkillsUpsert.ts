import { eq, inArray } from 'drizzle-orm';
import { cvSkill } from '../db/schema';
import type { CvSkillCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSCvSkillInput, GqlSMutationResult, GqlSSession } from '../graphql/generated';

export async function cvSkillsUpsert(
    userId: string,
    inputs: readonly GqlSCvSkillInput[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    const now = new Date();

    // Phase 1 — payload construction.
    const rows = inputs.map((input) => {
        const cvSkillId = input.cvSkillId ?? crypto.randomUUID();
        const payload: CvSkillCreate = {
            cvSkillId,
            category: input.category,
            label: input.label,
            position: input.position,
            updatedAt: now,
        };
        return { cvSkillId, isUpdate: Boolean(input.cvSkillId), payload };
    });

    // Phase 2 — transactional execution.
    try {
        const updateIds = rows.filter((row) => row.isUpdate).map((row) => row.cvSkillId);
        await serverRuntime.db.transaction(async (transaction) => {
            if (updateIds.length > 0) {
                const existing = await transaction
                    .select({ cvSkillId: cvSkill.cvSkillId })
                    .from(cvSkill)
                    .where(inArray(cvSkill.cvSkillId, updateIds));
                if (existing.length !== updateIds.length) {
                    const found = new Set(existing.map((row) => row.cvSkillId));
                    const missing = updateIds.filter((id) => !found.has(id));
                    throw new Error(`cvSkillsUpsert: rows not found: ${missing.join(', ')}`);
                }
            }
            for (const row of rows) {
                if (row.isUpdate) {
                    await transaction.update(cvSkill).set(row.payload).where(eq(cvSkill.cvSkillId, row.cvSkillId));
                } else {
                    await transaction.insert(cvSkill).values(row.payload);
                }
            }
        });
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: rows.map((row) => row.cvSkillId) };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
