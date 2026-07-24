import { hasToolCall, isStepCount, ToolLoopAgent } from 'ai';
import { SITEMAP_PATHS } from '../../web/seo/sitemapRoutes';
import { ADMIN_CHAT_MODEL_FALLBACK_ID } from './adminChatModels';
import type { AgentChatOptions } from './agentChatOptions';
import { currentDateForAgent, googleAgentProviderOptionsFor } from './agentScaffolding';
import { cvSummaryForAgent } from './cvSummaryForAgent';
import { toolPromptUserForInput } from './toolPromptUserForInput';
import { toolSendEmailToCem } from './toolSendEmailToCem';
import { toolSubmitProjectRequest } from './toolSubmitProjectRequest';
import { toolVerifyProjectRequestOtp } from './toolVerifyProjectRequestOtp';

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
        '- On timezone objections: Cem works flexibly with teams across continents — early DE mornings and late evenings are normal.',
        '',
        'Tools own when-to-use details. Cross-tool rules:',
        '- Never trust an email typed inline in chat — confirm it via `promptUserForInput` before any tool that needs it.',
        '- After `submitProjectRequest` succeeds, immediately collect OTP then `verifyProjectRequestOtp`.',
        '- Simple contact → `sendEmailToCem`; project/freelance briefs → `submitProjectRequest`.',
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
