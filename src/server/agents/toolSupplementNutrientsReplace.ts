import { tool } from 'ai';
import { z } from 'zod';
import { supplementNutrientsReplace } from '../commands/supplementNutrientsReplace';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSupplementNutrientInput, GqlSSession } from '../graphql/generated';
import type { NutritionAgentMutationLog } from './agentPersonalAssistantNutrition';
import { requireAdminUserId } from './requireAdminUserId';

// Replace a supplement's entire per-serving composition. Call after
// `supplementsUpsert` with the confirmed nutrient rows (usually straight from a
// `supplementResearch` result). Never invent amounts — pass an empty array to
// clear the composition.

const supplementNutrientItemSchema = z.object({
    name: z.string().min(1).max(300).describe('Nutrient / active ingredient, e.g. "Vitamin D3".'),
    amount: z.string().max(100).nullish().describe('Per-serving amount as printed (string tolerates "<1", "trace").'),
    unit: z.string().max(50).nullish().describe('Unit for the amount, e.g. "mg", "g", "IU", "µg".'),
    percentDailyValue: z.number().int().min(0).max(100000).nullish().describe('%DV per serving when stated.'),
});

const toolSupplementNutrientsReplaceInputSchema = z.object({
    supplementId: z.uuid().describe('The supplement whose composition to replace.'),
    nutrients: z
        .array(supplementNutrientItemSchema)
        .describe('The full per-serving composition, in label order. Empty array clears it. Never invent amounts.'),
});

interface NutritionAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: NutritionAgentMutationLog;
}

export function toolSupplementNutrientsReplace({ serverRuntime, session, mutations }: NutritionAgentMutationContext) {
    return tool({
        description: [
            'Replace a supplement’s whole per-serving composition with the given nutrient rows (name, amount, unit,',
            '%DV), in label order. Use right after `supplementsUpsert` to store the researched or user-confirmed',
            'composition. Pass an empty `nutrients` array to clear it. Do NOT invent amounts.',
        ].join(' '),
        inputSchema: toolSupplementNutrientsReplaceInputSchema,
        execute: async (input) => {
            const nutrients: GqlSSupplementNutrientInput[] = input.nutrients.map((nutrient, index) => ({
                name: nutrient.name,
                amount: nutrient.amount ?? null,
                unit: nutrient.unit ?? null,
                percentDailyValue: nutrient.percentDailyValue ?? null,
                sortOrder: index,
            }));
            const result = await supplementNutrientsReplace(
                requireAdminUserId(session),
                input.supplementId,
                nutrients,
                session,
                serverRuntime,
            );
            mutations.push({ kind: 'supplementUpdate', id: input.supplementId });
            return result;
        },
    });
}
