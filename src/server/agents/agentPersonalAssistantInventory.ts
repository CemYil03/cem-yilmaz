import type { GenerateTextOnStepEndCallback } from 'ai';
import { isStepCount, ToolLoopAgent } from 'ai';
import { toolInventoryFilesDelete } from '../commands/adminInventoryItemFilesDelete';
import { toolInventoryFilesUpsert } from '../commands/adminInventoryItemFilesUpsert';
import { toolInventoryItemsDelete } from '../commands/adminInventoryItemsDelete';
import { toolInventoryServiceEntriesDelete } from '../commands/adminInventoryItemServiceEntriesDelete';
import { toolInventoryServiceEntriesUpsert } from '../commands/adminInventoryItemServiceEntriesUpsert';
import { toolInventoryItemsReprice } from '../commands/adminInventoryItemsReprice';
import { toolInventoryItemsUpsert } from '../commands/adminInventoryItemsUpsert';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import { ADMIN_CHAT_MODEL_FALLBACK_ID } from './adminChatModels';
import { currentDateForAgent, googleAgentProviderOptionsFor } from './agentScaffolding';
import { inventorySnapshotForAgent } from './inventorySnapshotForAgent';
import { toolInventoryItemsList } from './toolInventoryItemsList';

// Inventory domain sub-agent under the orchestrator pattern documented in
// `docs/architecture/agent-delegation.md`. Runs in-process inside
// `toolDelegateToInventory`'s `execute`, receives an `onStepEnd` from the
// delegate tool, and returns a final text (or `needsMoreInfo` / `noOp` JSON
// sentinel). When it creates or changes a row Cem may want to open, it names
// that row's id in its final summary so the orchestrator can deep-link it.
//
// The domain is material belongings — what Cem owns, what each is worth today,
// how it's been serviced, and its disposal state — the data behind
// `/workspace/inventory`. See `docs/features/workspace-inventory.md`.

export interface InventoryAgentOptions {
    session: GqlSSession;
    serverRuntime: ServerRuntime;
    onStepEnd?: GenerateTextOnStepEndCallback<any>;
}

function buildSystemPrompt(snapshot: string): string {
    return [
        "You are the inventory sub-agent inside Cem's personal workspace. You track his material belongings —",
        'electronics, appliances, kitchen gear, furniture, vehicles, clothing, tools, sports equipment, and anything',
        'else he owns. You handle adding and editing items, recording what they are worth today, logging repairs and',
        'services, disposing of things he no longer owns, and tidying attached files. Your tools mutate the workspace',
        'DB; use them whenever Cem asks to record or change any of that. Persisting is the point: the changes show up',
        'on the inventory page and in his material net worth. Each tool carries its own description of when to reach',
        'for it and how its inputs are shaped; the cross-tool rules below are all the extra guidance you need.',
        '',
        currentDateForAgent(),
        '',
        'Rules:',
        '- Reply in the language the user wrote in (German or English).',
        '- Be concise: your final text becomes the orchestrator narration to Cem. One or two sentences summarizing',
        '  what you did, quoting the item and any amount you recorded.',
        '- Money is stored in CENTS. Convert what Cem says: "2.500 €" → `250000`; "1.800" → `180000`. Prices and',
        '  values are always cents on the wire.',
        '- Adding an item seeds its current value from the purchase price. To change what an item is worth TODAY',
        '  ("my bike is only worth 800 now"), use `inventoryItemsReprice` — never try to set the current value through',
        '  `inventoryItemsUpsert`, which cannot touch it.',
        '- When Cem sells / gives away / loses an item, do NOT delete it — set `disposalState` via',
        '  `inventoryItemsUpsert` so the history and net-worth math stay reconcilable. Delete only when he explicitly',
        '  says to remove it for good.',
        '- You cannot upload new files: attaching a receipt / manual / photo needs a byte upload that only happens on',
        "  the item detail page. If Cem asks to add a file, tell him to open the item's Files section. You CAN rename,",
        '  pin, or detach files that already exist.',
        '- Never invent an id. Use ids from the snapshot below, from an upsert result’s `referenceIds` earlier in this',
        '  turn (in input order), or omit the id entirely to insert a new row.',
        '- Only ask for clarification when a required field is genuinely missing — most importantly which item Cem',
        '  means when several match, or the category / name for a brand-new item. In those cases return EXACTLY this',
        '  JSON as your final text, nothing else:',
        '  {"status":"needsMoreInfo","missingFields":["..."],"summary":"..."}',
        "- If the request is outside inventory (e.g. 'log a workout', 'add a recurring cost'), return the same JSON",
        '  with status `noOp` and an empty `missingFields` array.',
        '',
        'Current inventory snapshot (refreshed at the start of this turn):',
        '',
        snapshot,
    ].join('\n');
}

export async function agentPersonalAssistantInventory({ session, serverRuntime, onStepEnd }: InventoryAgentOptions) {
    const snapshot = await inventorySnapshotForAgent(session, serverRuntime);
    const toolContext = { serverRuntime, session };
    const modelId = ADMIN_CHAT_MODEL_FALLBACK_ID;
    return new ToolLoopAgent({
        model: serverRuntime.ai.userConversationModel(modelId),
        onStepEnd,
        providerOptions: googleAgentProviderOptionsFor(modelId),
        // Ten-step ceiling matches the other domain sub-agents. Inventory work
        // is shallow — usually one upsert or reprice — so this is ample.
        stopWhen: [isStepCount(10)],
        instructions: buildSystemPrompt(snapshot),
        tools: {
            inventoryItemsList: toolInventoryItemsList(toolContext),
            inventoryItemsUpsert: toolInventoryItemsUpsert(toolContext),
            inventoryItemsDelete: toolInventoryItemsDelete(toolContext),
            inventoryItemsReprice: toolInventoryItemsReprice(toolContext),
            inventoryServiceEntriesUpsert: toolInventoryServiceEntriesUpsert(toolContext),
            inventoryServiceEntriesDelete: toolInventoryServiceEntriesDelete(toolContext),
            inventoryFilesUpsert: toolInventoryFilesUpsert(toolContext),
            inventoryFilesDelete: toolInventoryFilesDelete(toolContext),
        },
    });
}
