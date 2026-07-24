import type { GenerateTextOnStepEndCallback } from 'ai';
import { ToolLoopAgent, isStepCount } from 'ai';
import { toolFinanceIncomeStreamsDelete } from '../commands/adminFinancesIncomeStreamsDelete';
import { toolFinanceIncomeStreamsUpsert } from '../commands/adminFinancesIncomeStreamsUpsert';
import { toolFinanceRecurringCostsDelete } from '../commands/adminFinancesRecurringCostsDelete';
import { toolFinanceRecurringCostsUpsert } from '../commands/adminFinancesRecurringCostsUpsert';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import { ADMIN_CHAT_MODEL_FALLBACK_ID } from './adminChatModels';
import { currentDateForAgent, googleAgentProviderOptionsFor } from './agentScaffolding';
import { financesSnapshotForAgent } from './financesSnapshotForAgent';
import { toolFinanceIncomeStreamsList } from './toolFinanceIncomeStreamsList';
import { toolFinanceRecurringCostsList } from './toolFinanceRecurringCostsList';

// Finances domain sub-agent under the orchestrator pattern documented in
// `docs/architecture/agent-delegation.md`. Runs in-process inside
// `toolDelegateToFinances`'s `execute`, receives an `onStepEnd` from the
// delegate tool, and returns a final text (or `needsMoreInfo` / `noOp` JSON
// sentinel). When it creates or changes a row Cem may want to open, it names
// that row's id in its final summary so the orchestrator can deep-link it.
//
// The domain today is income streams plus recurring costs (rent, insurance,
// subscriptions, …) — the data behind `/workspace/finances`. There is no
// dated-transaction model yet, so "I paid X today" maps to a recurring cost
// when it repeats and is a no-op otherwise. See
// `docs/features/workspace-finances.md`.

export interface FinanceAgentOptions {
    session: GqlSSession;
    serverRuntime: ServerRuntime;
    onStepEnd?: GenerateTextOnStepEndCallback<any>;
}

function buildSystemPrompt(snapshot: string): string {
    return [
        "You are the finances sub-agent inside Cem's personal workspace. You handle every ask about income streams",
        '(salary, freelance, …) and recurring costs — rent, insurance, subscriptions, transport, utilities, and the',
        'like. Your tools mutate the workspace DB; use them whenever Cem asks to add, edit, pause, or delete an',
        'income stream or recurring cost. Persisting is the point: the numbers show up on the finances page and',
        'totals. Each tool carries its own description of when to reach for it and how its inputs are shaped; the',
        'cross-tool rules below are all the extra guidance you need.',
        '',
        currentDateForAgent(),
        '',
        'Rules:',
        '- Reply in the language the user wrote in (German or English).',
        '- Be concise: your final text becomes the orchestrator narration to Cem. One or two sentences summarizing',
        '  what you did, quoting the amount and cadence you recorded. When you create or change a row Cem may want',
        '  to open, name its id in your summary so the orchestrator can build a deep-link.',
        '- Money is stored in CENTS. Convert what Cem says: "25,95 im Monat" → `amountCents: 2595, cadence: "monthly"`;',
        '  "89 € im Quartal" → `amountCents: 8900, cadence: "quarterly"`; "120 € pro Jahr" → `amountCents: 12000, cadence: "yearly"`.',
        '  Default to monthly when the period is unstated.',
        '- "Add this to my expenses / costs / subscriptions" means create a recurring cost. "Add this to my income"',
        '  / salary / freelance means create an income stream. There is NO dated one-off-transaction model — do not',
        '  pretend to log a single dated payment.',
        '- Never invent an id. Use ids from the snapshot below, from an upsert result’s `referenceIds` earlier in',
        '  this turn (in input order), or omit the id entirely to insert a new row.',
        '- To pause a cost or income stream Cem stopped, upsert the existing row with `active: false` — do not delete',
        '  unless he explicitly says to remove it for good.',
        '- Only ask for clarification when a required field is genuinely missing — most importantly the amount for a',
        '  new row (name alone is not enough), or which row Cem means when several match. In those cases return',
        '  EXACTLY this JSON as your final text, nothing else:',
        '  {"status":"needsMoreInfo","missingFields":["..."],"summary":"..."}',
        "- If the request is outside finances (e.g. 'log a workout', 'add a movie'), return the same JSON with",
        '  status `noOp` and an empty `missingFields` array.',
        '',
        'Current finances snapshot (refreshed at the start of this turn):',
        '',
        snapshot,
    ].join('\n');
}

export async function agentPersonalAssistantFinances({ session, serverRuntime, onStepEnd }: FinanceAgentOptions) {
    const snapshot = await financesSnapshotForAgent(session, serverRuntime);
    const toolContext = { serverRuntime, session };
    const modelId = ADMIN_CHAT_MODEL_FALLBACK_ID;
    return new ToolLoopAgent({
        model: serverRuntime.ai.userConversationModel(modelId),
        onStepEnd,
        providerOptions: googleAgentProviderOptionsFor(modelId),
        // Ten-step ceiling matches the other domain sub-agents. Finance work is
        // shallow — usually one batch upsert — so this is ample headroom.
        stopWhen: [isStepCount(10)],
        instructions: buildSystemPrompt(snapshot),
        tools: {
            financeRecurringCostsList: toolFinanceRecurringCostsList(toolContext),
            financeRecurringCostsUpsert: toolFinanceRecurringCostsUpsert(toolContext),
            financeRecurringCostsDelete: toolFinanceRecurringCostsDelete(toolContext),
            financeIncomeStreamsList: toolFinanceIncomeStreamsList(toolContext),
            financeIncomeStreamsUpsert: toolFinanceIncomeStreamsUpsert(toolContext),
            financeIncomeStreamsDelete: toolFinanceIncomeStreamsDelete(toolContext),
        },
    });
}
