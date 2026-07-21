import type { GenerateTextOnStepEndCallback } from 'ai';
import { ToolLoopAgent, hasToolCall, isStepCount } from 'ai';
import type { GqlCChatAssistantOptions } from '../../web/graphql/generated';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import { SITEMAP_PATHS } from '../../web/seo/sitemapRoutes';
import { ADMIN_CHAT_MODEL_FALLBACK_ID } from './adminChatModels';
import { currentDateForAgent, googleAgentProviderOptionsFor } from './agentScaffolding';
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
    // Pathname the client was on when the user sent the message
    // (`/projects`, `/en/cv`, `/workspace/projects/abc`, …). Inlined into
    // the agent's system prompt for this turn only — not persisted. Null
    // when the caller can't supply it (server-side tests). See
    // `docs/features/chat-visitor.md` and `docs/features/chat-workspace.md`.
    currentPagePath: string | null;
    // Shared mutable set the orchestrator uses to skip persisting a tool
    // call whose row some tool's `execute` already wrote up front (today:
    // `toolDelegateToProjects`, which pre-writes its delegate row so the
    // sub-agent's child tool-call rows have a parent to FK against). Agents
    // that don't host any such tool ignore the value; the orchestrator on
    // `agentPersonalAssistant` is the only one that passes it into a tool.
    // See `docs/architecture/agent-delegation.md` ("Nested tool calls").
    preWrittenToolCallIds: Set<string>;
    // The tool set the agent is built with is heterogeneous (one entry per
    // approval-gated tool plus `promptUserForInput`), each with its own Zod
    // input schema. There is no single concrete `ToolSet` the caller can name
    // upfront — and the on-step callback only reads the structurally-uniform
    // bits (`step.content`, `step.toolCalls`, `step.toolResults`) — so a wide
    // `any` here keeps the call signature tractable. Tightening would mean
    // exporting a precise tool-set type from the agent and threading it
    // through every onStepEnd caller.
    onStepEnd: GenerateTextOnStepEndCallback<any>;
}

// Shared agent factory signature for the chat surfaces. The mutation-resolver
// dispatch passes one of these into `chatAssistantTurnRunDetached` based on
// the access path — visitor mutations pass `agentVisitor`; admin
// mutations pass `agentPersonalAssistant`. Each agent ships its own
// concretely-typed `ToolLoopAgent` (the toolset is heterogeneous and the
// generic parameters differ); all the runner needs is the structural surface
// (`stream`, `generate`, `onStepEnd`), so the runtime type stays wide.
// See `docs/architecture/chat.md`.
export type ChatAgentFactory = (options: AgentChatOptions) => Promise<{
    stream: (...args: any[]) => any;
    generate: (...args: any[]) => any;
}>;

// One line per public route, keyed by the locale-less path. Paired with
// `SITEMAP_PATHS` (the source of truth for indexable routes) so the agent's
// site map can't drift from what actually exists — `siteMapBlock` iterates
// `SITEMAP_PATHS`, and a new route with no description here still gets listed
// by its bare path. See `src/web/seo/sitemapRoutes.ts`.
const PAGE_DESCRIPTIONS: Record<string, string> = {
    '/': 'Startseite / portfolio landing.',
    '/about': 'About Cem — bio, skills, hobbies, contact.',
    '/cv': 'Lebenslauf / CV — work experience and education timelines.',
    '/projects': "Projects — showcase of Cem's work.",
    '/impressum': 'Impressum (imprint, TMG §5).',
    '/datenschutz': 'Datenschutzerklärung (privacy notice, GDPR).',
};

// The site map the agent gets in its system prompt: the public pages it can
// link visitors to, plus a note that its replies render as Markdown. Purely
// informational — no scripted "when asked X, answer Y" — so the model routes
// on its own. Fixes the failure where the agent, never told the routes exist,
// claimed it "cannot provide links or URLs" when asked for the CV.
function siteMapBlock(): string[] {
    return [
        'Public pages on this site (link to them with relative paths):',
        ...SITEMAP_PATHS.map(({ path }) => `- \`${path}\` — ${PAGE_DESCRIPTIONS[path] ?? ''}`.trimEnd()),
        '',
        'Your replies render as full Markdown — use clickable links (e.g. `[Lebenslauf](/cv)`),',
        'tables, and lists where they help. Only link to the paths listed above; do not invent routes.',
    ];
}

// System prompt scaffold for the public visitor chat ("Ask me anything") on
// cem-yilmaz.de — Q&A about Cem plus OTP-verified project-request / contact
// tools. The "About Cem" block is rebuilt from the DB on every turn
// (`cvSummaryForAgent`) so admin edits at `/workspace/cv` land in the
// agent's answers without a redeploy. See `docs/features/cv.md` and
// `docs/features/project-requests.md`.
//
// `currentPagePath` is the route the visitor's client was on when this
// message went out. We inline it (when present) so the agent can anchor
// answers to what the visitor was probably looking at — e.g. on `/projects`,
// "tell me more" is about the projects on screen rather than something
// generic. The agent is explicitly told not to invent page contents it
// hasn't been given; it only knows the path, not the rendered HTML.
function buildSystemPrompt(cvSummary: string, currentPagePath: string | null): string {
    const lines = [
        "You are Eida, the AI assistant on Cem Yilmaz's personal website (cem-yilmaz.de).",
        "Your job is to answer visitors' questions about Cem, his projects, and this site.",
        '',
        currentDateForAgent(),
        '',
        cvSummary,
        '',
        ...siteMapBlock(),
        '',
    ];
    if (currentPagePath) {
        lines.push(
            'Current page context:',
            `- The visitor is currently viewing \`${currentPagePath}\` on cem-yilmaz.de.`,
            '- Use this to anchor "tell me more" / "what is this" / "show me other examples" questions to whatever',
            '  they were probably just looking at on that route. The path itself is the only signal — do not invent',
            '  specific content you have not been given elsewhere in this prompt.',
            '- If the path is unrelated to what they asked, ignore it.',
            '',
        );
    }
    lines.push(
        'Style:',
        '- Reply in the language the visitor wrote in (German or English). If unclear, default to English.',
        '- Be concise, warm, and direct. Avoid corporate filler.',
        "- If asked something the summary above doesn't cover, say so — do not invent biography, employers, or credentials.",
        '- Politely steer off-topic questions back to Cem, his work, or this site.',
        "- Never claim to be a human; if asked, say you're Eida, an AI assistant Cem set up to answer visitor questions.",
        '',
        'Your tools each carry their own description of when to reach for them and how their inputs are shaped —',
        'read those descriptions and route accordingly. The workflow rules below apply across multiple tools and',
        'stay here.',
        '',
        'Visitor-flow shortcuts (worked examples of how the tools chain together):',
        '- Visitor: "I want to email Cem." → `promptUserForInput` with three `Text` slots (subject, body, reply email),',
        '  then `sendEmailToCem` with the collected values.',
        '- Visitor: "what\'s the best way to reach Cem about a freelance gig?" → respond briefly, then',
        '  `promptUserForInput` with the project-request fields you can ask up-front (name, email, project type,',
        "  description). Don't enumerate the fields in prose first. Then `submitProjectRequest` — and immediately",
        '  `promptUserForInput` with a single `Otp` slot to collect the 6-digit code the visitor just received,',
        '  followed by `verifyProjectRequestOtp` with the returned `projectRequestId` and the code.',
        '- Visitor: "my email is foo@bar.com" mid-conversation → still call `promptUserForInput` to confirm the',
        '  address in a `Text` slot before passing it to a tool; never trust an inline-typed address verbatim.',
    );
    return lines.join('\n');
}

export async function agentVisitor({
    assistantOptions: _assistantOptions,
    session: _session,
    serverRuntime,
    chatId,
    currentPagePath,
    preWrittenToolCallIds: _preWrittenToolCallIds,
    onStepEnd,
}: AgentChatOptions) {
    const cvSummary = await cvSummaryForAgent(serverRuntime);
    // Visitor chat is not user-selectable — always runs on the catalog
    // fallback (Flash). Resolved here so the same id binds both the model and
    // the provider options (Flash-specific `thinkingBudget: 0`).
    const modelId = ADMIN_CHAT_MODEL_FALLBACK_ID;
    return new ToolLoopAgent({
        // Provider, model id, and API key are bound on the runtime
        // (`serverRuntimeCreate`) so this agent can be exercised against a
        // mock `LanguageModel` in tests without ever calling the real Gemini
        // endpoint.
        model: serverRuntime.ai.userConversationModel(modelId),
        onStepEnd,
        providerOptions: googleAgentProviderOptionsFor(modelId),
        stopWhen: [
            // Hard ceiling so a runaway loop can't burn through quota. Raised
            // from 5 to 8 because the email/project-request flows can chain
            // several tool steps (e.g. submitProjectRequest → promptUserForInput
            // for the OTP → verifyProjectRequestOtp → confirmation text).
            isStepCount(8),
            // `promptUserForInput` hands the turn back to the human — there is
            // no tool result to feed the LLM, so without this the model would
            // keep stepping and (with Gemini) tend to apologize that "the tool
            // failed". The next assistant turn happens after the user submits
            // a `ChatMessageUserInput`, which `toModelMessages` replays as the
            // matching tool-result.
            hasToolCall('promptUserForInput'),
        ],
        instructions: buildSystemPrompt(cvSummary, currentPagePath),
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
