import { tool } from 'ai';
import { z } from 'zod';
import { foodLogEntriesDelete } from '../commands/foodLogEntriesDelete';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import type { NutritionAgentMutationLog } from './agentPersonalAssistantNutrition';
import { requireAdminUserId } from './requireAdminUserId';

const foodLogEntriesDeleteInputSchema = z.object({
    logIds: z.array(z.uuid()).min(1).describe('Diary entry ids to delete.'),
});

interface NutritionAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: NutritionAgentMutationLog;
}

export function toolFoodLogEntriesDelete({ serverRuntime, session, mutations }: NutritionAgentMutationContext) {
    return tool({
        description: 'Delete one or more diary entries. Use when Cem wants to remove something he logged.',
        inputSchema: foodLogEntriesDeleteInputSchema,
        execute: async (input) => {
            const result = await foodLogEntriesDelete(requireAdminUserId(session), input.logIds, session, serverRuntime);
            for (const logId of input.logIds) mutations.push({ kind: 'foodLogDelete', id: logId });
            return result;
        },
    });
}
