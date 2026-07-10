import { tool } from 'ai';
import { z } from 'zod';
import { supplementsDelete } from '../commands/supplementsDelete';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import type { NutritionAgentMutationLog } from './agentPersonalAssistantNutrition';
import { requireAdminUserId } from './requireAdminUserId';

const supplementsDeleteInputSchema = z.object({
    supplementIds: z.array(z.uuid()).min(1).describe('Supplement ids to delete. Their nutrient rows are removed too (cascade).'),
});

interface NutritionAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: NutritionAgentMutationLog;
}

export function toolSupplementsDelete({ serverRuntime, session, mutations }: NutritionAgentMutationContext) {
    return tool({
        description: 'Permanently delete one or more supplements (and their composition). Use only when Cem explicitly says to delete.',
        inputSchema: supplementsDeleteInputSchema,
        execute: async (input) => {
            const result = await supplementsDelete(requireAdminUserId(session), input.supplementIds, session, serverRuntime);
            for (const supplementId of input.supplementIds) mutations.push({ kind: 'supplementDelete', id: supplementId });
            return result;
        },
    });
}
