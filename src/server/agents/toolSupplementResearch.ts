import { tool } from 'ai';
import { z } from 'zod';
import { supplementCompositionResearch } from './supplementCompositionResearch';
import type { ServerRuntime } from '../domain/ServerRuntime';

// AI web-research for a supplement's composition. Persists nothing — it returns
// the proposed serving info and nutrient rows so the agent can feed them into
// `supplementsUpsert` + `supplementNutrientsReplace`. Wraps the same
// `supplementCompositionResearch` the page's `supplementResearch` action uses.

interface NutritionAgentReadContext {
    serverRuntime: ServerRuntime;
}

const supplementResearchInputSchema = z.object({
    name: z.string().min(1).describe('Supplement / product name to look up, e.g. "Creatine Monohydrate".'),
    brand: z.string().nullish().describe('Optional brand / manufacturer to disambiguate the exact product.'),
});

export function toolSupplementResearch({ serverRuntime }: NutritionAgentReadContext) {
    return tool({
        description: [
            'Research a supplement’s exact per-serving composition from the web (grounded search). Returns',
            '`found`, serving size, servings per container, source URL, and a `nutrients` array (name, amount,',
            'unit, %DV). Persists NOTHING — call this first when Cem adds a supplement, then pass the confirmed',
            'values to `supplementsUpsert` and `supplementNutrientsReplace`. When `found` is false, do NOT invent',
            'amounts: add the supplement with just its name/brand and tell Cem the composition could not be found.',
        ].join(' '),
        inputSchema: supplementResearchInputSchema,
        execute: async (input) => {
            return supplementCompositionResearch({ name: input.name, brand: input.brand ?? null }, serverRuntime);
        },
    });
}
