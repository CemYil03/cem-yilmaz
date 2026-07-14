import { tool } from 'ai';
import { inArray } from 'drizzle-orm';
import { z } from 'zod';
import { requireAdminUserId } from '../agents/requireAdminUserId';
import { supplements } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Batch delete of supplements. FK `ON DELETE cascade` removes the child
// `SupplementNutrients` rows automatically.
export async function adminNutritionSupplementsDelete(
    userId: string,
    supplementIds: readonly string[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const deleted = await serverRuntime.db
            .delete(supplements)
            .where(inArray(supplements.supplementId, supplementIds as string[]))
            .returning({ supplementId: supplements.supplementId });
        if (deleted.length !== supplementIds.length) {
            const found = new Set(deleted.map((row) => row.supplementId));
            const missing = supplementIds.filter((id) => !found.has(id));
            throw new Error(`adminNutritionSupplementsDelete: rows not found: ${missing.join(', ')}`);
        }
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: [...supplementIds] };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}

const supplementsDeleteInputSchema = z.object({
    supplementIds: z
        .array(z.uuid())
        .min(1)
        .describe('AdminNutritionSupplement ids to delete. Their nutrient rows are removed too (cascade).'),
});

interface NutritionAgentToolContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
}

export function toolSupplementsDelete({ serverRuntime, session }: NutritionAgentToolContext) {
    return tool({
        description: 'Permanently delete one or more supplements (and their composition). Use only when Cem explicitly says to delete.',
        inputSchema: supplementsDeleteInputSchema,
        execute: async (input) => {
            return adminNutritionSupplementsDelete(requireAdminUserId(session), input.supplementIds, session, serverRuntime);
        },
    });
}
