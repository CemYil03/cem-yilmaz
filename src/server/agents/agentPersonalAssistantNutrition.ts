import type { GenerateTextOnStepEndCallback } from 'ai';
import { ToolLoopAgent, isStepCount } from 'ai';
import { toolFoodLogEntriesDelete } from '../commands/adminNutritionFoodLogEntriesDelete';
import { toolFoodLogEntriesUpsert } from '../commands/adminNutritionFoodLogEntriesUpsert';
import { toolMealPlanEntriesDelete } from '../commands/adminNutritionMealPlanEntriesDelete';
import { toolMealPlanEntriesUpsert } from '../commands/adminNutritionMealPlanEntriesUpsert';
import { toolRecipesDelete } from '../commands/adminNutritionRecipesDelete';
import { toolRecipesUpsert } from '../commands/adminNutritionRecipesUpsert';
import { toolSupplementNutrientsReplace } from '../commands/adminNutritionSupplementNutrientsReplace';
import { toolSupplementsDelete } from '../commands/adminNutritionSupplementsDelete';
import { toolSupplementsUpsert } from '../commands/adminNutritionSupplementsUpsert';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import { ADMIN_CHAT_MODEL_FALLBACK_ID } from './adminChatModels';
import { currentDateForAgent, googleAgentProviderOptionsFor } from './agentScaffolding';
import { nutritionSnapshotForAgent } from './nutritionSnapshotForAgent';
import { toolFoodLogList } from './toolFoodLogList';
import { toolMealPlanList } from './toolMealPlanList';
import { toolRecipesList } from './toolRecipesList';
import { toolSupplementResearch } from './toolSupplementResearch';
import { toolSupplementsList } from './toolSupplementsList';

// Nutrition domain sub-agent under the orchestrator pattern documented in
// `docs/architecture/agent-delegation.md`. Runs in-process inside
// `toolDelegateToNutrition`'s `execute`, receives an `onStepEnd` from the
// delegate tool, and returns a final text (or `needsMoreInfo` / `noOp` JSON
// sentinel). When it creates or changes a row Cem may want to open, it names
// that row's id in its final summary so the orchestrator can deep-link it.
//
// It owns three surfaces: the cookbook (`Recipes`), the soft weekly plan
// (`MealPlanEntries`), and the food/drink diary (`FoodLogEntries`). The
// signature use-case is a snack suggestion drawn from what Cem actually likes:
// the snapshot pre-computes favourites and last-made dates so the agent can
// rank without a list call.

export interface NutritionAgentOptions {
    session: GqlSSession;
    serverRuntime: ServerRuntime;
    onStepEnd?: GenerateTextOnStepEndCallback<any>;
}

function buildSystemPrompt(snapshot: string): string {
    return [
        "You are the nutrition sub-agent inside Cem's personal workspace. You handle every ask about food and",
        'supplements: the cookbook of favourite dishes, the soft weekly meal plan, the food/drink diary, and the',
        'supplement tracker. Your tools mutate the workspace DB. Each tool carries its own description of when to',
        'reach for it and how its inputs are shaped; the cross-tool workflow rules below are all the guidance you',
        'need beyond those descriptions.',
        '',
        currentDateForAgent(),
        '',
        'Workflow rules:',
        '- Snack / meal idea: when Cem asks "what should I snack on?" or "give me a dinner idea", pick from HIS',
        '  cookbook in the snapshot. Prefer favourites (★fav) that match the meal type and that he has NOT made',
        '  recently (older or missing `last made`). Suggest by name; do not invent dishes that are not in the',
        '  cookbook unless he asks for something new. If the cookbook is empty, say so and offer to add one.',
        '- "I ate/drank X": log it with `foodLogEntriesUpsert` (set `kind` food/drink, pick the meal type from the',
        '  time of day, use the current time unless Cem gives one). Batch several items from one meal into one call.',
        '- "Plan Tuesday dinner" / "plan my week": write `mealPlanEntriesUpsert`. Reference a cookbook recipe by',
        '  `recipeId` when it exists, otherwise use `customText`. Only fill the slots Cem asks for — the plan is',
        '  soft, empty cells stay empty.',
        '- "I made X today": stamp that recipe’s `lastMadeAt` via `recipesUpsert` so future suggestions rotate.',
        '- "Add supplement X" / "I take creatine": call `supplementResearch` first to find the exact per-serving',
        '  composition, then `supplementsUpsert` to create the record (set `researchedAt` to now when the',
        '  composition came from research), then `supplementNutrientsReplace` with the nutrient rows. If research',
        '  returns `found:false`, add the supplement with just its name/brand, leave the composition empty, and tell',
        '  Cem you could not find its exact composition — NEVER invent amounts.',
        '',
        'General rules:',
        '- Reply in the language the user wrote in (German or English).',
        '- Be concise: your final text becomes the orchestrator narration to Cem. One or two sentences summarizing',
        '  what you did. When you create or change a recipe / meal-plan slot / diary entry / supplement Cem may want',
        '  to open, name its id in your summary so the orchestrator can build a deep-link.',
        '- Never invent an id. Use ids from the snapshot below, from an upsert result’s `referenceIds` earlier in',
        '  this turn (in input order), or omit the id entirely to insert a new row.',
        '- Only ask for clarification when a required field is genuinely missing (nothing to log, no idea what to',
        '  plan). In that case return EXACTLY this JSON as your final text, nothing else:',
        '  {"status":"needsMoreInfo","missingFields":["..."],"summary":"..."}',
        "- If the request is outside nutrition (e.g. 'log a workout'), return the same JSON with status `noOp` and",
        '  an empty `missingFields` array.',
        '',
        'Current nutrition snapshot (refreshed at the start of this turn):',
        '',
        snapshot,
    ].join('\n');
}

export async function agentPersonalAssistantNutrition({ session, serverRuntime, onStepEnd }: NutritionAgentOptions) {
    const snapshot = await nutritionSnapshotForAgent(serverRuntime);
    const toolContext = { serverRuntime, session };
    const modelId = ADMIN_CHAT_MODEL_FALLBACK_ID;
    return new ToolLoopAgent({
        model: serverRuntime.ai.userConversationModel(modelId),
        onStepEnd,
        providerOptions: googleAgentProviderOptionsFor(modelId),
        stopWhen: [isStepCount(10)],
        instructions: buildSystemPrompt(snapshot),
        tools: {
            recipesList: toolRecipesList(toolContext),
            mealPlanList: toolMealPlanList(toolContext),
            foodLogList: toolFoodLogList(toolContext),
            recipesUpsert: toolRecipesUpsert(toolContext),
            recipesDelete: toolRecipesDelete(toolContext),
            mealPlanEntriesUpsert: toolMealPlanEntriesUpsert(toolContext),
            mealPlanEntriesDelete: toolMealPlanEntriesDelete(toolContext),
            foodLogEntriesUpsert: toolFoodLogEntriesUpsert(toolContext),
            foodLogEntriesDelete: toolFoodLogEntriesDelete(toolContext),
            supplementsList: toolSupplementsList(toolContext),
            supplementResearch: toolSupplementResearch(toolContext),
            supplementsUpsert: toolSupplementsUpsert(toolContext),
            supplementNutrientsReplace: toolSupplementNutrientsReplace(toolContext),
            supplementsDelete: toolSupplementsDelete(toolContext),
        },
    });
}
