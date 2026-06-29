import type { ToolLoopAgentOnStepFinishCallback } from 'ai';
import { ToolLoopAgent, hasToolCall, stepCountIs } from 'ai';
import type { GqlCChatAssistantOptions } from '../../web/graphql/generated';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import { googleAgentProviderOptions } from './agentScaffolding';
import { cvSummaryForAgent } from './cvSummaryForAgent';
import { toolPromptUserForInput } from './toolPromptUserForInput';
import { toolSendEmailToCem } from './toolSendEmailToCem';
import { toolSubmitProjectRequest } from './toolSubmitProjectRequest';
import { toolVerifyProjectRequestOtp } from './toolVerifyProjectRequestOtp';

export interface AgentChatOptions {
    assistantOptions: GqlCChatAssistantOptions;
    session: GqlSSession;
    serverRuntime: ServerRuntime;
    // Id of the chat the agent is answering in. Threaded through so tools
    // that persist side-effect rows (`submitProjectRequest`) can record the
    // originating conversation; tools that don't need it ignore the value.
    chatId: string;
    // The tool set the agent is built with is heterogeneous (one entry per
    // approval-gated tool plus `promptUserForInput`), each with its own Zod
    // input schema. There is no single concrete `ToolSet` the caller can name
    // upfront — and the on-step callback only reads the structurally-uniform
    // bits (`step.content`, `step.toolCalls`, `step.toolResults`) — so a wide
    // `any` here keeps the call signature tractable. Tightening would mean
    // exporting a precise tool-set type from the agent and threading it
    // through every onStepFinish caller.
    onStepFinish: ToolLoopAgentOnStepFinishCallback<any>;
}

// Shared agent factory signature for the chat surfaces. The mutation-resolver
// dispatch passes one of these into `chatAssistantTurnRunDetached` based on
// the access path — visitor mutations pass `agentVisitorAboutCem`; admin
// mutations pass `agentPersonalAssistant`. Each agent ships its own
// concretely-typed `ToolLoopAgent` (the toolset is heterogeneous and the
// generic parameters differ); all the runner needs is the structural surface
// (`stream`, `generate`, `onStepFinish`), so the runtime type stays wide.
// See `docs/architecture/multi-agent-chat.md`.
export type ChatAgentFactory = (options: AgentChatOptions) => Promise<{
    stream: (...args: any[]) => any;
    generate: (...args: any[]) => any;
}>;

// System prompt scaffold for the public visitor chat ("Ask me anything") on
// cem-yilmaz.de. The "About Cem" block is rebuilt from the DB on every turn
// (`cvSummaryForAgent`) so admin edits at `/workspace/cv` land in the
// agent's answers without a redeploy. See `docs/features/cv.md`.
function buildSystemPrompt(cvSummary: string): string {
    return [
        "You are the AI assistant on Cem Yilmaz's personal website (cem-yilmaz.de).",
        "Your job is to answer visitors' questions about Cem, his projects, and this site.",
        '',
        cvSummary,
        '',
        'Style:',
        '- Reply in the language the visitor wrote in (German or English). If unclear, default to English.',
        '- Be concise, warm, and direct. Avoid corporate filler.',
        "- If asked something the summary above doesn't cover, say so — do not invent biography, employers, or credentials.",
        '- Politely steer off-topic questions back to Cem, his work, or this site.',
        "- Never claim to be a human; if asked, say you're an AI assistant Cem set up to answer visitor questions.",
        '',
        'When to act (you have three tools beyond `promptUserForInput`):',
        '- `sendEmailToCem` — use when the visitor wants to contact Cem about something simple (a question, a hello,',
        '  a heads-up, a quick message). Collect `subject`, `body`, and `replyEmail` via `promptUserForInput` first.',
        '- `submitProjectRequest` — use when the visitor describes a project, gig, freelance work, or business enquiry.',
        '  Collect every field (name, email, optional company, projectType, description, optional budget, optional',
        '  timeline) via `promptUserForInput` first. `projectType` is a SingleSelect with the five allowed values.',
        '- After `submitProjectRequest` succeeds, you MUST immediately call `promptUserForInput` with a single slot',
        '  of kind `Otp` to collect the 6-digit code the visitor just received by email. Then call',
        '  `verifyProjectRequestOtp` with the returned `projectRequestId` and the code. Never invent a',
        '  `projectRequestId`; only use the one that came back from `submitProjectRequest`.',
        '- Never ask for the OTP in prose — always use a `kind: "Otp"` slot.',
        '- If verification returns `incorrect`, ask the visitor to try again unless `attemptsRemaining` is 0; on',
        '  `expired` or `tooManyAttempts`, ask them to restart the request from scratch.',
        '',
        'How to ask for input — IRON RULE:',
        '- ANY time you need a value with a known shape from the visitor (an email address, a name, a subject line, a',
        '  project description, a yes/no, a date, a pick from a list, a 6-digit code), call `promptUserForInput`.',
        '  Do NOT ask for these in prose, even for a single value. A single email address is `promptUserForInput` with',
        '  one `Text` slot, not a chat message saying "what is your email?".',
        '- Partial information is fine: if the visitor said "I have a project idea" and gave nothing else, your very',
        '  next action is `promptUserForInput` with whatever slots make sense right now — start with name + email +',
        '  a one-line description and ask for the rest in a follow-up call once you have something to anchor on. The',
        '  "do not call this tool multiple times in a row" guidance in the tool description means "do not split tightly',
        '  related questions across calls"; it does NOT mean "fit everything into one giant form". Two or three small',
        '  forms across the conversation is correct.',
        '- A free-text prose question is only correct for open-ended discussion ("what kind of work do you have in',
        '  mind?", "tell me more about the team"). The moment the visitor\'s answer would be a specific typed value,',
        '  switch to `promptUserForInput`.',
        '- Concrete examples of what good looks like:',
        '  • Visitor: "I want to email Cem." → `promptUserForInput` with three `Text` slots (subject, body, reply email).',
        '  • Visitor: "what\'s the best way to reach Cem about a freelance gig?" → respond briefly, then',
        '    `promptUserForInput` with the project-request fields you can ask up-front (name, email, project type,',
        "    description). Don't enumerate the fields in prose first.",
        '  • Visitor: "my email is foo@bar.com" mid-conversation → still call `promptUserForInput` to confirm the',
        '    address in a `Text` slot before passing it to a tool; never trust an inline-typed address verbatim.',
    ].join('\n');
}

export async function agentVisitorAboutCem({
    assistantOptions: _assistantOptions,
    session: _session,
    serverRuntime,
    chatId,
    onStepFinish,
}: AgentChatOptions) {
    const cvSummary = await cvSummaryForAgent(serverRuntime);
    return new ToolLoopAgent({
        // Provider, model id, and API key are bound on the runtime
        // (`serverRuntimeCreate`) so this agent can be exercised against a
        // mock `LanguageModel` in tests without ever calling the real Gemini
        // endpoint.
        model: serverRuntime.ai.userConversationModel(),
        onStepFinish,
        providerOptions: googleAgentProviderOptions,
        stopWhen: [
            // Hard ceiling so a runaway loop can't burn through quota. Raised
            // from 5 to 8 because the email/project-request flows can chain
            // several tool steps (e.g. submitProjectRequest → promptUserForInput
            // for the OTP → verifyProjectRequestOtp → confirmation text).
            stepCountIs(8),
            // `promptUserForInput` hands the turn back to the human — there is
            // no tool result to feed the LLM, so without this the model would
            // keep stepping and (with Gemini) tend to apologize that "the tool
            // failed". The next assistant turn happens after the user submits
            // a `ChatMessageUserInput`, which `toModelMessages` replays as the
            // matching tool-result.
            hasToolCall('promptUserForInput'),
        ],
        instructions: buildSystemPrompt(cvSummary),
        // Three transactional tools beyond the input-collection helper. Each
        // ships with an `execute` function whose return value is captured
        // into `chatMessagesToolCall.toolResult` by the existing branch in
        // `chatAssistantTurnRun` — so the next agent step (and the persisted
        // history) sees the outcome without any runner change. See
        // `docs/features/chat-email-tools.md`.
        tools: {
            promptUserForInput: toolPromptUserForInput(),
            sendEmailToCem: toolSendEmailToCem({ serverRuntime }),
            submitProjectRequest: toolSubmitProjectRequest({ serverRuntime, chatId }),
            verifyProjectRequestOtp: toolVerifyProjectRequestOtp({ serverRuntime }),
        },
    });
}
