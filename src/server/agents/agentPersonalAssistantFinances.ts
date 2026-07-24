import type { GenerateTextOnStepEndCallback } from 'ai';
import { isStepCount, ToolLoopAgent } from 'ai';
import { toolFinanceAssetsDelete } from '../commands/adminFinancesAssetsDelete';
import { toolFinanceAssetsReprice } from '../commands/adminFinancesAssetsReprice';
import { toolFinanceAssetsUpsert } from '../commands/adminFinancesAssetsUpsert';
import { toolFinanceIncomeStreamsDelete } from '../commands/adminFinancesIncomeStreamsDelete';
import { toolFinanceIncomeStreamsUpsert } from '../commands/adminFinancesIncomeStreamsUpsert';
import { toolFinanceRecurringCostsDelete } from '../commands/adminFinancesRecurringCostsDelete';
import { toolFinanceRecurringCostsUpsert } from '../commands/adminFinancesRecurringCostsUpsert';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import { ADMIN_CHAT_MODEL_FALLBACK_ID } from './adminChatModels';
import { currentDateForAgent, googleAgentProviderOptionsFor, subAgentClosingRules } from './agentScaffolding';
import { financesSnapshotForAgent } from './financesSnapshotForAgent';
import { toolFinanceAssetsList } from './toolFinanceAssetsList';
import { toolFinanceIncomeStreamsList } from './toolFinanceIncomeStreamsList';
import { toolFinanceRecurringCostsList } from './toolFinanceRecurringCostsList';

// Finances domain sub-agent under the orchestrator pattern documented in
// `docs/architecture/agent-delegation.md`. Runs in-process inside
// `toolDelegateToFinances`'s `execute`, receives an `onStepEnd` from the
// delegate tool, and returns a final text (or `needsMoreInfo` / `noOp` JSON
// sentinel). When it creates or changes a row Cem may want to open, it names
// that row's id in its final summary so the orchestrator can deep-link it.
//
// The domain is cashflow (income streams + recurring costs) plus wealth
// (asset-first positions with a location label) — the data behind
// `/workspace/finances`. There is no dated-transaction model yet, so "I paid
// X today" maps to a recurring cost when it repeats and is a no-op otherwise.
// See `docs/features/workspace-finances.md`.

export interface FinanceAgentOptions {
    session: GqlSSession;
    serverRuntime: ServerRuntime;
    onStepEnd?: GenerateTextOnStepEndCallback<any>;
}

function buildSystemPrompt(snapshot: string): string {
    return [
        "You are the finances sub-agent inside Cem's personal workspace. You handle income streams, recurring costs, and wealth assets (Tagesgeld, ETFs, stocks, Bauspar).",
        'Mutate the DB only when unambiguously asked. Tools own when-to-use.',
        '',
        currentDateForAgent(),
        '',
        'Domain rules:',
        '- Money is stored in CENTS. Convert what Cem says: "25,95 im Monat" → `amountCents: 2595, cadence: "monthly"`; "89 € im Quartal" → `amountCents: 8900, cadence: "quarterly"`; "Tagesgeld 12.500 €" → `currentValueCents: 1250000`. Default recurring cadence to monthly when unstated.',
        '- "expenses / costs / subscriptions" → recurring cost; "income / salary / freelance" → income stream; "I have X at TradeRepublic / add VWCE / my Bauspar" → wealth asset. There is NO dated one-off-transaction model — do not pretend to log a single dated payment.',
        '- Recurring-cost `categoryKey` enum: entertainment, cloud, work, housing, connectivity, insurance, transport, sport, personalCare, donations, household, savingsGeneral, savingsVacation, other. Pick the closest; use `other` when unsure.',
        '- Wealth is asset-first: the row is WHAT Cem owns; `location` is only WHERE it sits (TradeRepublic, Scalable, LBS, Chase, …), not a parent institution. `kind`: `cash` (Tagesgeld/Giro), `security` (ETF/stock — needs `shares` + value), `bauspar`. Reprice ≠ upsert: change value via `financeAssetsReprice` (upsert seeds value on create only).',
        '- Pause a cost / income stream / asset via upsert of the existing row with `active: false` — do not delete unless Cem says to remove it for good.',
        ...subAgentClosingRules({ domainLabel: 'finances', outOfDomainExample: 'log a workout' }),
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
            financeAssetsList: toolFinanceAssetsList(toolContext),
            financeAssetsUpsert: toolFinanceAssetsUpsert(toolContext),
            financeAssetsDelete: toolFinanceAssetsDelete(toolContext),
            financeAssetsReprice: toolFinanceAssetsReprice(toolContext),
        },
    });
}
