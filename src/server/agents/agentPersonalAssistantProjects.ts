import type { GenerateTextOnStepEndCallback } from 'ai';
import { isStepCount, ToolLoopAgent } from 'ai';
import { toolProjectActivitiesUpsert } from '../commands/adminProjectActivitiesUpsert';
import { toolProjectLinksUpsert } from '../commands/adminProjectLinksUpsert';
import { toolProjectsDelete } from '../commands/adminProjectsDelete';
import { toolProjectsUpsert } from '../commands/adminProjectsUpsert';
import { toolTasksDelete } from '../commands/adminProjectTasksDelete';
import { toolTasksUpsert } from '../commands/adminProjectTasksUpsert';
import { toolProjectFileCreate } from '../commands/projectFileCreateFromMarkdown';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import { ADMIN_CHAT_MODEL_FALLBACK_ID } from './adminChatModels';
import { currentDateForAgent, googleAgentProviderOptionsFor, subAgentClosingRules } from './agentScaffolding';
import { projectsSnapshotForAgent } from './projectsSnapshotForAgent';
import { toolProjectFileContentGet } from './toolProjectFileContentGet';
import { toolProjectGet } from './toolProjectGet';
import { toolProjectsList } from './toolProjectsList';
import { toolStandaloneTasksList } from './toolStandaloneTasksList';

// First domain sub-agent under the orchestrator pattern documented in
// `docs/architecture/agent-delegation.md`. Runs in-process inside the
// `toolDelegateToProjects` tool's `execute`. As of the "Nested tool calls"
// change it now receives an `onStepEnd` from the delegate tool — every
// regular tool call this sub-agent makes is persisted as a
// `chatMessagesToolCall` row with `parentChatMessageId` set to the delegate
// row's id, so the transcript renders them indented under the parent card.
// It still never sees `chatId` directly (the delegate tool owns the closure);
// its final text (or `{ status: 'needsMoreInfo' | 'noOp' }` JSON sentinel) is
// returned through the delegate tool's `toolResult` and is the only artifact
// the orchestrator sees.
//
// Deliberately omits `promptUserForInput` — asking the user mid-delegation
// would require persisting `chatMessagesAssistantInputCollection` rows from
// a context that has no `generationId` plumbing back into the orchestrator's
// turn-runner. Instead the sub-agent returns the `needsMoreInfo` JSON
// sentinel and the orchestrator owns the back-and-forth via its own
// `promptUserForInput` tool.

export interface ProjectsAgentOptions {
    session: GqlSSession;
    serverRuntime: ServerRuntime;
    // Plumbed through from the delegate tool. Receives every step the
    // sub-agent takes and writes each tool call as a `chatMessagesToolCall`
    // row stamped with the delegate row's id as `parentChatMessageId`. The
    // delegate tool builds this from the shared `chatPersistStep` helper —
    // see `toolDelegateToProjects.ts`.
    onStepEnd?: GenerateTextOnStepEndCallback<any>;
}

function buildSystemPrompt(snapshot: string): string {
    return [
        "You are the projects sub-agent inside Cem's personal workspace. You handle project- and task-related work.",
        'Mutate the DB only when unambiguously asked. Tools own when-to-use details.',
        '',
        currentDateForAgent(),
        '',
        'Domain rules:',
        '- Batch same-shape writes — one `tasksUpsert` / `projectsUpsert` / `projectActivitiesUpsert` / `projectLinksUpsert`, not N calls.',
        '- Snapshot lists projects + task counts only. For activity timeline or files, call `projectGet` (not `projectsList` for one project).',
        '- Before summarizing/quoting/revising an attached document, call `projectFileContentGet`; if `readable: false`, tell Cem to open the `url`.',
        ...subAgentClosingRules({ domainLabel: 'projects/tasks', outOfDomainExample: 'log a workout' }),
        '',
        'Current board snapshot (refreshed at the start of this turn):',
        '',
        snapshot,
    ].join('\n');
}

export async function agentPersonalAssistantProjects({ session, serverRuntime, onStepEnd }: ProjectsAgentOptions) {
    const snapshot = await projectsSnapshotForAgent(serverRuntime);
    const toolContext = { serverRuntime, session };
    // Sub-agent always runs on the catalog fallback (Flash) — it does not see
    // the orchestrator's per-turn model pick. Resolved here so the same id
    // binds both the model and the Flash-specific provider options.
    const modelId = ADMIN_CHAT_MODEL_FALLBACK_ID;
    return new ToolLoopAgent({
        model: serverRuntime.ai.userConversationModel(modelId),
        onStepEnd,
        providerOptions: googleAgentProviderOptionsFor(modelId),
        // Tight ceiling — the sub-agent should rarely need more than a list +
        // a few mutations + a final text. If it runs out of steps, the
        // delegate tool surfaces the partial result to the orchestrator.
        stopWhen: [isStepCount(10)],
        instructions: buildSystemPrompt(snapshot),
        tools: {
            projectsList: toolProjectsList(toolContext),
            projectGet: toolProjectGet(toolContext),
            standaloneTasksList: toolStandaloneTasksList(toolContext),
            projectsUpsert: toolProjectsUpsert(toolContext),
            projectsDelete: toolProjectsDelete(toolContext),
            tasksUpsert: toolTasksUpsert(toolContext),
            tasksDelete: toolTasksDelete(toolContext),
            projectActivitiesUpsert: toolProjectActivitiesUpsert(toolContext),
            projectLinksUpsert: toolProjectLinksUpsert(toolContext),
            projectFileCreate: toolProjectFileCreate(toolContext),
            projectFileContentGet: toolProjectFileContentGet(toolContext),
        },
    });
}
