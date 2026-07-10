import { tool } from 'ai';
import { z } from 'zod';
import { supplementsUpsert } from '../commands/supplementsUpsert';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSupplementInput, GqlSSession } from '../graphql/generated';
import type { NutritionAgentMutationLog } from './agentPersonalAssistantNutrition';
import { requireAdminUserId } from './requireAdminUserId';

// Batch create-or-edit of the supplement record (parent row only — the
// per-serving nutrient rows are written by `supplementNutrientsReplace`).
// Hand-built schema so `researchedAt` rides the wire as an ISO string (Gemini's
// structured output rejects `z.date()` — same rationale as `toolRecipesUpsert`).

const supplementItemSchema = z.object({
    supplementId: z.uuid().nullish().describe('Omit (or null) to create a new supplement. Pass an existing id to edit.'),
    name: z.string().min(1).max(300).describe('Supplement / product name.'),
    brand: z.string().max(300).nullish().describe('Manufacturer / brand.'),
    servingSize: z.string().max(300).nullish().describe('Serving size as printed, e.g. "2 capsules" or "1 scoop (5 g)".'),
    servingsPerContainer: z.number().int().min(0).max(100000).nullish(),
    sourceUrl: z.string().max(2000).nullish().describe('Product page the composition came from.'),
    notes: z.string().max(4000).nullish(),
    researchedAt: z
        .string()
        .nullish()
        .describe('ISO-8601 timestamp. Set to now when the composition came from `supplementResearch`; omit otherwise.'),
});

const toolSupplementsUpsertInputSchema = z.object({
    supplements: z
        .array(supplementItemSchema)
        .min(1)
        .describe('One or more supplements to create or edit. One-element array for a single edit.'),
});

interface NutritionAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: NutritionAgentMutationLog;
}

export function toolSupplementsUpsert({ serverRuntime, session, mutations }: NutritionAgentMutationContext) {
    return tool({
        description: [
            'Batch create-or-edit of supplement records (parent row: name, brand, serving info, notes). Every row',
            'with a `supplementId` is updated; every row without one is inserted. Returns `referenceIds` in input',
            'order — pass the new id straight into `supplementNutrientsReplace` to write the composition.',
        ].join(' '),
        inputSchema: toolSupplementsUpsertInputSchema,
        execute: async (input) => {
            const inputs: GqlSSupplementInput[] = input.supplements.map((supplement) => ({
                supplementId: supplement.supplementId ?? null,
                name: supplement.name,
                brand: supplement.brand ?? null,
                servingSize: supplement.servingSize ?? null,
                servingsPerContainer: supplement.servingsPerContainer ?? null,
                sourceUrl: supplement.sourceUrl ?? null,
                notes: supplement.notes ?? null,
                researchedAt: supplement.researchedAt ? new Date(supplement.researchedAt) : null,
            }));
            const result = await supplementsUpsert(requireAdminUserId(session), inputs, session, serverRuntime);
            const referenceIds = result.referenceIds ?? [];
            input.supplements.forEach((supplement, index) => {
                mutations.push({
                    kind: supplement.supplementId ? 'supplementUpdate' : 'supplementAdd',
                    id: referenceIds[index] ?? supplement.supplementId ?? '',
                    title: supplement.name,
                });
            });
            return result;
        },
    });
}
