import type { GenerateTextOnStepEndCallback } from 'ai';
import { ToolLoopAgent, isStepCount } from 'ai';
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
import { googleAgentProviderOptionsFor, currentDateForAgent } from './agentScaffolding';
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
        "You are the projects sub-agent inside Cem's personal workspace. You handle every project- and task-related",
        'instruction the orchestrator delegates to you. Your tools touch the workspace DB directly — only use them',
        'when the user has unambiguously asked you to change something. Each tool carries its own description of',
        'when to reach for it and how its inputs are shaped; read those descriptions rather than expecting to be',
        'told again here.',
        '',
        currentDateForAgent(),
        '',
        'Rules:',
        '- Reply in the language the user wrote in (German or English).',
        '- Be concise: your final text becomes the orchestrator narration to the user. One or two sentences naming',
        '  what you did. When you create or change a project / task / activity / link / file Cem may want to open,',
        '  name its id in your summary so the orchestrator can build a deep-link.',
        '- Batch every same-shape write into one call — one `tasksUpsert` for all of them, not N calls. Same for',
        '  `projectsUpsert`, `projectActivitiesUpsert`, and `projectLinksUpsert`.',
        '- Never invent an id. Use ids from the snapshot below or from a prior tool result’s `referenceIds` (in',
        '  input order) earlier in this turn.',
        "- The snapshot only lists projects and task counts. To answer about a project's activity timeline or its",
        '  attached files, call `projectGet` with the project id — do NOT pull the whole board via `projectsList`',
        '  for one project. Before you summarize, quote, or revise an attached document, call `projectFileContentGet`',
        '  to read its body first; if it returns `readable: false`, tell Cem to open the file at the given `url`',
        '  instead of trying to read it.',
        "- If the request is missing information you genuinely need (e.g. 'add a task' with no target project and",
        '  no title), do NOT guess. Stop calling tools and return EXACTLY this JSON as your final text, nothing',
        '  else (no code fence, no prose):',
        '  {"status":"needsMoreInfo","missingFields":["..."],"summary":"..."}',
        '  where `missingFields` is an array of short keys identifying what you still need (e.g. ["title",',
        '  "projectId"]) and `summary` is a one-sentence explanation of what you understood so far.',
        "- If the request asks for something outside the project/task surface (e.g. 'schedule a meeting',",
        "  'log a workout'), return the same JSON sentinel with status `noOp` and an empty `missingFields`",
        '  array — the orchestrator will handle it.',
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
