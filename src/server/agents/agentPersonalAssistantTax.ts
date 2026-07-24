import type { GenerateTextOnStepEndCallback } from 'ai';
import { isStepCount, ToolLoopAgent } from 'ai';
import { toolTaxDocumentsUpsert } from '../commands/adminTaxDocumentsUpsert';
import { toolTaxExpensesUpsert } from '../commands/adminTaxExpensesUpsert';
import { toolTaxIncomeSourcesUpsert } from '../commands/adminTaxIncomeSourcesUpsert';
import { toolTaxYearsUpsert } from '../commands/adminTaxYearsUpsert';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import { ADMIN_CHAT_MODEL_FALLBACK_ID } from './adminChatModels';
import { currentDateForAgent, googleAgentProviderOptionsFor, subAgentClosingRules } from './agentScaffolding';
import { taxSnapshotForAgent } from './taxSnapshotForAgent';
import { toolTaxYearsList } from './toolTaxYearsList';

// Tax domain sub-agent under the orchestrator pattern documented in
// `docs/architecture/agent-delegation.md`. Runs in-process inside
// `toolDelegateToTax`'s `execute`, receives an `onStepEnd` from the delegate
// tool, and returns a final text (or `needsMoreInfo` / `noOp` JSON sentinel).
// When it creates or changes a row Cem may want to open, it names that row's
// id in its final summary so the orchestrator can deep-link it.
//
// The domain is a German tax return: tax years, income sources (one per
// Anlage), deductible expenses, and a document checklist — the data behind
// `/workspace/tax`. It is a DOCUMENTARIAN, not a tax advisor: it records and
// organises, and never gives binding Steuerberatung. See
// `docs/features/workspace-tax.md`.

export interface TaxAgentOptions {
    session: GqlSSession;
    serverRuntime: ServerRuntime;
    onStepEnd?: GenerateTextOnStepEndCallback<any>;
}

function buildSystemPrompt(snapshot: string): string {
    return [
        "You are the tax sub-agent inside Cem's personal workspace. You prepare his German tax return by recording and organising the pieces: tax years, income sources (one per Anlage), deductible expenses, and a document checklist.",
        'Mutate the DB only when unambiguously asked. Tools own when-to-use.',
        '',
        currentDateForAgent(),
        '',
        'ROLE: documentarian, not tax advisor. Capture what Cem tells you into structured records and keep the checklist tidy — never give binding tax advice or interpret tax law. When deductibility is genuinely uncertain, record the item anyway and add a short one-line reminder to confirm with a Steuerberater or the Finanzamt; skip that reminder on trivial edits.',
        '',
        'Domain rules:',
        '- Money is stored in CENTS. Convert what Cem says: "899 €" → `amountCents: 89900`; "1.250,50" → `125050`.',
        '- Dates are ISO strings (yyyy-mm-dd). Resolve relative dates ("letzten Monat", "im März") against today.',
        '- Expenses attach to a tax year (`taxYearId`) and optionally an income source. Pick `categoryKey` from the enum: `businessExpense` (business/freelance cost), `workRelated` (employee job cost), `insurance` (Vorsorge), `specialExpenses` (Sonderausgaben), `homeOffice` (Homeoffice-Pauschale).',
        '- You CANNOT attach receipt files (needs a browser upload). When Cem mentions a receipt/scan, record the expense or document and tell him to attach it in the Expenses / Documents section of the tax page.',
        '- A new expense/income/document needs a `taxYearId` — default to the most recent year from the snapshot unless Cem names another.',
        ...subAgentClosingRules({ domainLabel: 'tax', outOfDomainExample: 'add a movie' }),
        '',
        'Current tax snapshot (refreshed at the start of this turn):',
        '',
        snapshot,
    ].join('\n');
}

export async function agentPersonalAssistantTax({ session, serverRuntime, onStepEnd }: TaxAgentOptions) {
    const snapshot = await taxSnapshotForAgent(session, serverRuntime);
    const toolContext = { serverRuntime, session };
    const modelId = ADMIN_CHAT_MODEL_FALLBACK_ID;
    return new ToolLoopAgent({
        model: serverRuntime.ai.userConversationModel(modelId),
        onStepEnd,
        providerOptions: googleAgentProviderOptionsFor(modelId),
        // Ten-step ceiling matches the other domain sub-agents. Tax work is
        // shallow — usually one or two batch upserts.
        stopWhen: [isStepCount(10)],
        instructions: buildSystemPrompt(snapshot),
        tools: {
            taxYearsList: toolTaxYearsList(toolContext),
            taxYearsUpsert: toolTaxYearsUpsert(toolContext),
            taxIncomeSourcesUpsert: toolTaxIncomeSourcesUpsert(toolContext),
            taxExpensesUpsert: toolTaxExpensesUpsert(toolContext),
            taxDocumentsUpsert: toolTaxDocumentsUpsert(toolContext),
        },
    });
}
