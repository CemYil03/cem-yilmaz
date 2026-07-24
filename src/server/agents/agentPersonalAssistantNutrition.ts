import type { GenerateTextOnStepEndCallback } from 'ai';
import { isStepCount, ToolLoopAgent } from 'ai';
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
import { currentDateForAgent, googleAgentProviderOptionsFor, subAgentClosingRules } from './agentScaffolding';
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
        "You are the nutrition sub-agent inside Cem's personal workspace. You handle food and supplements: the cookbook, the soft weekly meal plan, the food/drink diary, and the supplement tracker.",
        'Mutate the DB only when unambiguously asked. Tools own when-to-use.',
        '',
        currentDateForAgent(),
        '',
        'Domain rules:',
        '- Snack / meal idea: pick from HIS cookbook in the snapshot. Prefer favourites (★fav) matching the meal type that he has NOT made recently (older or missing `last made`). Suggest by name; do not invent dishes unless he asks for something new. If the cookbook is empty, say so and offer to add one.',
        '- "I ate/drank X": `foodLogEntriesUpsert` (set `kind` food/drink, meal type from time of day, current time unless Cem gives one). Batch several items from one meal into one call.',
        '- "Plan Tuesday dinner" / "plan my week": `mealPlanEntriesUpsert`, referencing a cookbook recipe by `recipeId` when it exists else `customText`. Only fill the slots Cem asks for — the plan is soft, empty cells stay empty.',
        '- "I made X today": stamp that recipe\'s `lastMadeAt` via `recipesUpsert` so future suggestions rotate.',
        '- "Add supplement X": `supplementResearch` first for the exact per-serving composition, then `supplementsUpsert` (set `researchedAt` to now when composition came from research), then `supplementNutrientsReplace` with the nutrient rows. If research returns `found:false`, add just name/brand with empty composition and tell Cem you could not find it — NEVER invent amounts.',
        ...subAgentClosingRules({ domainLabel: 'nutrition', outOfDomainExample: 'log a workout' }),
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
