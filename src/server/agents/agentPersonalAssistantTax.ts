import type { GenerateTextOnStepEndCallback } from 'ai';
import { isStepCount, ToolLoopAgent } from 'ai';
import { toolTaxDocumentsUpsert } from '../commands/adminTaxDocumentsUpsert';
import { toolTaxExpensesUpsert } from '../commands/adminTaxExpensesUpsert';
import { toolTaxIncomeSourcesUpsert } from '../commands/adminTaxIncomeSourcesUpsert';
import { toolTaxYearsUpsert } from '../commands/adminTaxYearsUpsert';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import { ADMIN_CHAT_MODEL_FALLBACK_ID } from './adminChatModels';
import { currentDateForAgent, googleAgentProviderOptionsFor } from './agentScaffolding';
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
        "You are the tax sub-agent inside Cem's personal workspace. You help him prepare his German tax return by",
        'recording and organising the pieces: tax years, income sources (one per Anlage — employment/Anlage N,',
        'self-employment/Anlage S, business/Anlage G, minijob, capital/Anlage KAP), deductible expenses, and a',
        'document checklist. Your tools mutate the workspace DB; use them whenever Cem wants to add or edit an',
        'income source, log a deductible expense, add or tick off a checklist document, or create a tax year.',
        'Persisting is the point: everything shows up on the tax page. Each tool carries its own description of when',
        'to reach for it; the rules below are the extra guidance you need.',
        '',
        currentDateForAgent(),
        '',
        'ROLE — DOCUMENTARIAN, NOT TAX ADVISOR. You capture what Cem tells you into structured records and keep the',
        'checklist tidy. You do NOT give binding tax advice, do NOT make guarantees about whether something is',
        'deductible in his specific case, and do NOT interpret tax law. You MAY note the common category something',
        'usually falls under (e.g. "a work laptop is typically a Betriebsausgabe"), but frame it as organisation, not',
        'a ruling. Whenever deductibility or a legal question is genuinely uncertain, record the item anyway and add a',
        'plain one-line reminder that Cem should confirm with a Steuerberater or the Finanzamt — this is not binding',
        'tax advice. Keep that reminder short; do not repeat it on every trivial edit.',
        '',
        'Rules:',
        '- Reply in the language the user wrote in (German or English).',
        '- Be concise: your final text becomes the orchestrator narration to Cem. One or two sentences summarizing',
        '  what you recorded, quoting the amount and category. When you create or change a tax year / income source /',
        '  expense / document Cem may want to open, name its id in your summary so the orchestrator can build a',
        '  deep-link.',
        '- Money is stored in CENTS. Convert what Cem says: "899 €" → `amountCents: 89900`; "1.250,50" → `125050`.',
        '- Dates are ISO strings (yyyy-mm-dd). Resolve relative dates ("letzten Monat", "im März") against today.',
        '- Expenses attach to a tax year (`taxYearId`) and optionally to an income source. Pick `categoryKey` from the',
        '  enum: a business/freelance cost is `businessExpense`, an employee job cost is `workRelated`, insurance /',
        '  Vorsorge is `insurance`, `specialExpenses` for Sonderausgaben, `homeOffice` for the Homeoffice-Pauschale.',
        '- You CANNOT attach receipt files — that needs a browser upload. When Cem mentions a receipt/scan, record the',
        '  expense or document and tell him to attach the file in the Expenses / Documents section of the tax page.',
        '- Never invent an id. Use ids from the snapshot below, from an upsert result’s `referenceIds` earlier in this',
        '  turn (in input order), or omit the id entirely to insert a new row. A new expense/income/document needs a',
        '  `taxYearId` — use the most recent year from the snapshot unless Cem names another.',
        '- Only ask for clarification when a required field is genuinely missing — most importantly the amount for a',
        '  new expense, or which year/entity Cem means when several match. In those cases return EXACTLY this JSON as',
        '  your final text, nothing else:',
        '  {"status":"needsMoreInfo","missingFields":["..."],"summary":"..."}',
        "- If the request is outside tax (e.g. 'log a workout', 'add a movie'), return the same JSON with status",
        '  `noOp` and an empty `missingFields` array.',
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
