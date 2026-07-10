import { generateText, Output } from 'ai';
import { z } from 'zod';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminNutritionSupplementResearchResult } from '../graphql/generated';
import { ADMIN_CHAT_MODEL_FALLBACK_ID } from './adminChatModels';
import { currentDateForAgent, googleAgentProviderOptionsFor } from './agentScaffolding';

// Shared AI web-research for a supplement's composition. Used by both the
// `supplementResearch` GraphQL action (page dialog) and the sub-agent's
// `toolSupplementResearch`. Two-step because the Gemini 2.5 family rejects
// mixing a provider tool (Google Search grounding) with structured output in
// one call — the same limitation `agentPersonalAssistantWebSearch.ts`
// documents:
//   1. Grounded `generateText` with `webSearchTool()` gathers the product's
//      official supplement-facts panel as free text (+ cited source URLs).
//   2. `generateText` with `Output.object` distils that into structured
//      nutrient rows — instructed to return `found: false` and no invented
//      amounts when the product can't be pinned down.

const RESEARCH_SCHEMA = z.object({
    found: z.boolean().describe('True only if you identified the specific product and its supplement-facts panel.'),
    brand: z.string().nullish().describe('Manufacturer / brand as printed on the label.'),
    servingSize: z.string().nullish().describe('Serving size as printed, e.g. "2 capsules" or "1 scoop (5 g)".'),
    servingsPerContainer: z.number().int().nullish(),
    sourceUrl: z.string().nullish().describe('The single most authoritative source URL the facts came from.'),
    notes: z.string().nullish().describe('Optional one-line caveat (e.g. flavour variant assumed, region differs).'),
    nutrients: z
        .array(
            z.object({
                name: z.string().describe('Nutrient / active ingredient, e.g. "Vitamin D3", "Creatine monohydrate".'),
                amount: z.string().nullish().describe('Per-serving amount as printed. String tolerates "<1", "trace".'),
                unit: z.string().nullish().describe('Unit for the amount, e.g. "mg", "g", "IU", "µg".'),
                percentDailyValue: z.number().int().nullish().describe('%DV per serving when the label states one.'),
            }),
        )
        .describe('Per-serving composition. EMPTY ARRAY when found is false — never invent amounts.'),
    summary: z.string().describe('One sentence: what you found, or why you could not identify the product.'),
});

const EXTRACT_SYSTEM_PROMPT = [
    'You convert a web-research summary of a dietary supplement into a structured supplement-facts record.',
    '',
    'Rules:',
    '- Only report amounts that appear in the research text. NEVER invent or estimate a number.',
    '- If the research text does not clearly identify the specific product and its per-serving composition,',
    '  set `found` to false, return an empty `nutrients` array, and explain briefly in `summary`.',
    '- Keep amounts as printed (a string), including qualifiers like "<1" or "trace".',
    '- List nutrients in the order the label presents them.',
].join('\n');

export async function supplementCompositionResearch(
    input: { name: string; brand?: string | null },
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminNutritionSupplementResearchResult> {
    const label = [input.brand?.trim(), input.name.trim()].filter(Boolean).join(' ');

    // Step 1 — grounded search for the official supplement-facts panel.
    const searchModelId = ADMIN_CHAT_MODEL_FALLBACK_ID;
    const grounded = await generateText({
        model: serverRuntime.ai.userConversationModel(searchModelId),
        providerOptions: googleAgentProviderOptionsFor(searchModelId),
        tools: { googleSearch: serverRuntime.ai.webSearchTool() },
        prompt: [
            currentDateForAgent(),
            '',
            `Find the official supplement facts / nutrition information for this dietary supplement: "${label}".`,
            'Report the exact per-serving composition (serving size, servings per container, and every listed',
            'nutrient / active ingredient with its amount, unit, and %DV where given). Prefer the manufacturer',
            "page or a retailer's label image. Quote the label's numbers verbatim. If you cannot find the specific",
            'product, say so plainly and do not guess. Include the source URL you relied on.',
        ].join('\n'),
    });

    // Step 2 — distil into the structured record.
    const extracted = await generateText({
        model: serverRuntime.ai.compassAnalyzerModel(),
        output: Output.object({ schema: RESEARCH_SCHEMA }),
        system: EXTRACT_SYSTEM_PROMPT,
        prompt: [
            `AdminNutritionSupplement queried: "${label}".`,
            '',
            'Research summary:',
            grounded.text,
            '',
            'Return the structured record.',
        ].join('\n'),
    });

    const result = extracted.output;
    return {
        found: result.found,
        brand: result.brand ?? input.brand ?? null,
        servingSize: result.servingSize ?? null,
        servingsPerContainer: result.servingsPerContainer ?? null,
        sourceUrl: result.sourceUrl ?? null,
        notes: result.notes ?? null,
        nutrients: result.found
            ? result.nutrients.map((nutrient) => ({
                  name: nutrient.name,
                  amount: nutrient.amount ?? null,
                  unit: nutrient.unit ?? null,
                  percentDailyValue: nutrient.percentDailyValue ?? null,
              }))
            : [],
        summary: result.summary,
    };
}
