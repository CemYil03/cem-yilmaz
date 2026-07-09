import { eq, inArray } from 'drizzle-orm';
import { cvHobby } from '../db/schema';
import type { CvHobbyCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSCvHobbyInput, GqlSMutationResult, GqlSSession } from '../graphql/generated';

export async function cvHobbiesUpsert(
    userId: string,
    inputs: readonly GqlSCvHobbyInput[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    const now = new Date();

    // Phase 1 — payload construction.
    const rows = inputs.map((input) => {
        const cvHobbyId = input.cvHobbyId ?? crypto.randomUUID();
        const payload: CvHobbyCreate = {
            cvHobbyId,
            textDe: input.textDe,
            textEn: input.textEn,
            since: input.since ?? null,
            position: input.position,
            updatedAt: now,
        };
        return { cvHobbyId, isUpdate: Boolean(input.cvHobbyId), payload };
    });

    // Phase 2 — transactional execution.
    try {
        const updateIds = rows.filter((row) => row.isUpdate).map((row) => row.cvHobbyId);
        await serverRuntime.db.transaction(async (transaction) => {
            if (updateIds.length > 0) {
                const existing = await transaction
                    .select({ cvHobbyId: cvHobby.cvHobbyId })
                    .from(cvHobby)
                    .where(inArray(cvHobby.cvHobbyId, updateIds));
                if (existing.length !== updateIds.length) {
                    const found = new Set(existing.map((row) => row.cvHobbyId));
                    const missing = updateIds.filter((id) => !found.has(id));
                    throw new Error(`cvHobbiesUpsert: rows not found: ${missing.join(', ')}`);
                }
            }
            for (const row of rows) {
                if (row.isUpdate) {
                    await transaction.update(cvHobby).set(row.payload).where(eq(cvHobby.cvHobbyId, row.cvHobbyId));
                } else {
                    await transaction.insert(cvHobby).values(row.payload);
                }
            }
        });
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: rows.map((row) => row.cvHobbyId) };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
