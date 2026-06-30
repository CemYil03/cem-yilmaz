import type { GenerateTextOnStepEndCallback } from 'ai';
import { ToolLoopAgent, isStepCount } from 'ai';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import { ADMIN_CHAT_MODEL_FALLBACK_ID } from './adminChatModels';
import { googleAgentProviderOptionsFor, currentDateForAgent } from './agentScaffolding';
import { projectsSnapshotForAgent } from './projectsSnapshotForAgent';
import { toolProjectActivityUpsert } from './toolProjectActivityUpsert';
import { toolProjectDelete } from './toolProjectDelete';
import { toolProjectLinkUpsert } from './toolProjectLinkUpsert';
import { toolProjectsList } from './toolProjectsList';
import { toolProjectUpsert } from './toolProjectUpsert';
import { toolStandaloneTasksList } from './toolStandaloneTasksList';
import { toolTaskDelete } from './toolTaskDelete';
import { toolTaskUpsert } from './toolTaskUpsert';

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

type ProjectsAgentMutationKind =
    | 'projectCreate'
    | 'projectUpdate'
    | 'projectDelete'
    | 'taskCreate'
    | 'taskUpdate'
    | 'taskDelete'
    | 'activityCreate'
    | 'activityUpdate'
    | 'linkCreate'
    | 'linkUpdate';

export interface ProjectsAgentMutation {
    kind: ProjectsAgentMutationKind;
    // Project id or task id depending on `kind`.
    id: string;
    // Best-effort label for the orchestrator's user-facing narration. Mutation
    // tools fill this from the GraphQL result (create/update) or the input
    // (delete, where the row is already gone by the time we look).
    title?: string;
}

// Mutable list shared between the delegate tool and each mutation tool's
// `execute`. Allocated fresh in `toolDelegateToProjects` per delegation —
// never module-scoped (would leak across turns).
export type ProjectsAgentMutationLog = ProjectsAgentMutation[];

export interface ProjectsAgentOptions {
    session: GqlSSession;
    serverRuntime: ServerRuntime;
    mutations: ProjectsAgentMutationLog;
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
        'when the user has unambiguously asked you to change something.',
        '',
        currentDateForAgent(),
        '',
        'You have eight tools:',
        '- `projectsList`, `standaloneTasksList` — read the current board when you need ids or full task details',
        '  the snapshot below does not include.',
        '- `projectUpsert`, `projectDelete` — create / edit / archive / delete projects.',
        '- `taskUpsert`, `taskDelete` — create / edit / delete tasks (project-bound or standalone).',
        '- `projectActivityUpsert` — log an event-style entry (call, meeting, offer, milestone, note) on a',
        '  project timeline. Work timer rows are NOT created through this tool.',
        '- `projectLinkUpsert` — attach an external URL (repo, mission, Figma file, drive folder, invoice) to',
        '  a project; pinned links surface in the detail header.',
        '',
        'Rules:',
        '- Reply in the language the user wrote in (German or English).',
        '- Be concise: your final text becomes the orchestrator narration to the user. One or two sentences naming',
        '  what you did. No prose preamble.',
        '- Never invent an id. Use ids from the snapshot below or from a tool result earlier in this turn.',
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

export async function agentPersonalAssistantProjects({ session, serverRuntime, mutations, onStepEnd }: ProjectsAgentOptions) {
    const snapshot = await projectsSnapshotForAgent(serverRuntime);
    const readContext = { serverRuntime, session };
    const mutationContext = { serverRuntime, session, mutations };
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
        // delegate tool surfaces the partial mutation log to the orchestrator.
        stopWhen: [isStepCount(10)],
        instructions: buildSystemPrompt(snapshot),
        tools: {
            projectsList: toolProjectsList(readContext),
            standaloneTasksList: toolStandaloneTasksList(readContext),
            projectUpsert: toolProjectUpsert(mutationContext),
            projectDelete: toolProjectDelete(mutationContext),
            taskUpsert: toolTaskUpsert(mutationContext),
            taskDelete: toolTaskDelete(mutationContext),
            projectActivityUpsert: toolProjectActivityUpsert(mutationContext),
            projectLinkUpsert: toolProjectLinkUpsert(mutationContext),
        },
    });
}
