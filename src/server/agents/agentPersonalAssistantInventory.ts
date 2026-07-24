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
import { currentDateForAgent, googleAgentProviderOptionsFor, subAgentClosingRules } from './agentScaffolding';
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
        "You are the inventory sub-agent inside Cem's personal workspace. You track his material belongings — what he owns, what each is worth today, its service history, and its disposal state.",
        'Mutate the DB only when unambiguously asked. Tools own when-to-use.',
        '',
        currentDateForAgent(),
        '',
        'Domain rules:',
        '- Money is stored in CENTS. Convert what Cem says: "2.500 €" → `250000`; "1.800" → `180000`. Prices and values are always cents on the wire.',
        '- Adding an item seeds its current value from the purchase price. To change what it is worth TODAY ("my bike is only worth 800 now"), use `inventoryItemsReprice` — never `inventoryItemsUpsert`, which cannot touch the current value.',
        '- When Cem sells / gives away / loses an item, do NOT delete it — set `disposalState` via `inventoryItemsUpsert` so history and net-worth math stay reconcilable. Delete only when he says to remove it for good.',
        "- You cannot upload new files: attaching a receipt / manual / photo needs a byte upload on the item detail page — tell Cem to open the item's Files section. You CAN rename, pin, or detach files that already exist.",
        ...subAgentClosingRules({ domainLabel: 'inventory', outOfDomainExample: 'add a recurring cost' }),
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
