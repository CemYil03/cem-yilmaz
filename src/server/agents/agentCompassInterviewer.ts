import { generateText, tool } from 'ai';
import type { ModelMessage } from 'ai';
import { z } from 'zod';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { compassInterviewContextGet } from '../queries/compassInterviewContextGet';
import { COMPASS_INTERVIEW_MAX_QUESTIONS, COMPASS_INTERVIEW_MIN_QUESTIONS } from './compassInterviewConfig';
import { currentDateForAgent, googleAgentProviderOptionsFor } from './agentScaffolding';

// Psychological-interview agent — see `docs/features/compass.md`
// ("Psychological-interview agent").
//
// Runs out-of-band from the chat runner. Each interview turn is one call to
// this function: the command (`compassInterviewMessageSend` /
// `compassInterviewStart`) loads the running transcript, hands it here, and
// persists whatever this returns as a new assistant row in
// `CompassInterviewMessages`. There is no streaming, no approval lifecycle,
// no tool-call persistence — the only "tool" is `concludeInterview`, which
// is the agent's way of saying "I have enough; close the interview." Its
// payload is captured into `endNote` for the audit trail.
//
// FIREWALL EXCEPTION — the personal assistant sees only `Compass.summary`.
// The interviewer sees `summary` + `psychology` + recent observations,
// because its whole job is to probe gaps without repeating itself. The
// widening is anchored in exactly one query (`compassInterviewContextGet`)
// and exactly one consumer (this file). If you find yourself wanting to call
// that query from anywhere else, don't — add a new narrower query instead.

export interface CompassInterviewAgentResult {
    // 'question' — the agent wrote another question (or a brief acknowledging
    // sentence before the next question). Persist as an assistant message and
    // await Cem's reply.
    // 'concluded' — the agent called `concludeInterview`. Persist the closing
    // text (if any) as a final assistant message, then transition the
    // interview row to `completed` with `endReason='agent_satisfied'`.
    kind: 'question' | 'concluded';
    // The assistant's user-visible text for this turn. May be empty when the
    // agent calls `concludeInterview` without an accompanying question — the
    // command treats an empty string as "no closing line to persist."
    content: string;
    // Set only when `kind === 'concluded'`. The agent's short paragraph
    // summarizing what it heard. Not shown back to Cem; logged for audit.
    endNote?: string;
    // The Gemini model id the runtime resolved for this turn. Persisted on
    // the assistant message row for triage when question quality drifts.
    modelId: string;
}

export interface CompassInterviewAgentOptions {
    serverRuntime: ServerRuntime;
    // Ordered transcript so far, oldest first. The interviewer's own prior
    // questions and Cem's replies. Empty when this is the very first turn
    // (the agent then opens with its first question).
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    // Locale hint — Cem's preferred reply language for this interview, if
    // known. The agent is also told to match whatever language the most
    // recent user turn was written in, so this is only used to seed the
    // opening question when there is no user turn yet.
    locale: 'de' | 'en';
}

const SYSTEM_PROMPT_BASE = [
    "You are a careful interviewer helping refresh Cem Yilmaz's psychological compass.",
    '',
    'Cem is the owner of cem-yilmaz.de. The compass is a private, evolving picture of where he is right now —',
    'mood, recent stressors, energy, what is on his mind, goals that have shifted, things weighing on him. Your',
    'job is to surface signal that the passive analyzer (which only watches his normal assistant chats) cannot',
    'see, because Cem does not naturally bring those topics up in passing.',
    '',
    'How to interview:',
    `- Ask ONE question per turn. Aim for ${COMPASS_INTERVIEW_MIN_QUESTIONS}–${COMPASS_INTERVIEW_MAX_QUESTIONS} questions across the whole interview.`,
    '- Open warmly but get to substance quickly — this is not small talk.',
    '- Probe gaps in the context below; do NOT ask things you can already see answered.',
    '- Push gently when answers are surface-level (one short follow-up is plenty). Do not press if he disengages.',
    '- Vary the angle: mood, energy, sleep, work focus, relationships, things avoided, what is exciting, what drains.',
    '- One question per turn. Keep each turn short — 1–3 sentences is the right length.',
    '',
    'Style:',
    '- Reply in the language Cem wrote in (German or English). If unclear, match the locale hint below.',
    '- Curious, non-leading, non-judgmental. Never advise unless he asks — you are NOT the personal assistant.',
    '- Do not summarize his answers back to him line by line; the analyzer does that.',
    '',
    'When to conclude:',
    '- Call the `concludeInterview` tool once you have covered enough new ground OR Cem signals he is done.',
    '- The tool takes a short paragraph (`note`) summarizing what you heard. That note is NOT shown back to Cem;',
    '  it goes into the audit trail. The analyzer will extract observations from the full transcript on its own.',
    '- After calling `concludeInterview`, you may also write a single brief closing sentence to Cem (e.g. "Thanks',
    '  — that\'s enough for this week.") or leave the assistant text empty.',
    '- Do NOT call `concludeInterview` before you have asked at least one substantive question and heard at least',
    `  one reply. The minimum is ${COMPASS_INTERVIEW_MIN_QUESTIONS} questions unless Cem actively asks to stop.`,
].join('\n');

function buildSystemPrompt(args: { summary: string; psychology: string; recentObservations: string[]; locale: 'de' | 'en' }): string {
    const sections = [currentDateForAgent(), '', SYSTEM_PROMPT_BASE, ''];

    sections.push(
        'Locale hint:',
        `- Cem's preferred UI language right now is ${args.locale === 'de' ? 'German' : 'English'}. Use this only when there is no user turn yet to match against.`,
        '',
    );

    sections.push('Context about Cem — use this to ASK NEW QUESTIONS, not to recap:');
    sections.push('');
    sections.push('--- summary ---');
    sections.push(args.summary.trim() || '(no summary yet)');
    sections.push('');
    sections.push('--- psychology ---');
    sections.push(args.psychology.trim() || '(no psychology synthesis yet)');
    sections.push('');
    sections.push('--- recent observations ---');
    if (args.recentObservations.length === 0) {
        sections.push('(no observations recorded yet)');
    } else {
        for (const line of args.recentObservations) {
            sections.push(`- ${line}`);
        }
    }

    return sections.join('\n');
}

// `concludeInterview` is a sentinel tool — its only purpose is for the agent
// to signal "I am done." There is no `execute`: the command branches on the
// presence of this tool call in `result.toolCalls`. Defined inline (not in a
// `tool*.ts` file) because nothing else in the codebase uses it and the
// schema is one field.
const concludeInterviewTool = tool({
    description:
        'Call this once you have enough new signal (or Cem signals he is done) to close the interview. Provide a short paragraph summarizing what you heard.',
    inputSchema: z.object({
        note: z.string().min(1).describe('Short paragraph (2–4 sentences) summarizing what came up. Not shown to Cem; logged for audit.'),
    }),
});

export async function agentCompassInterviewer({
    serverRuntime,
    messages,
    locale,
}: CompassInterviewAgentOptions): Promise<CompassInterviewAgentResult> {
    const context = await compassInterviewContextGet(serverRuntime);
    const system = buildSystemPrompt({
        summary: context.summary,
        psychology: context.psychology,
        recentObservations: context.recentObservations,
        locale,
    });

    // When the transcript is empty this is the opening turn — feed the model
    // a single user-role "begin the interview" nudge so it produces the first
    // question instead of refusing for lack of a user message.
    const modelMessages: ModelMessage[] =
        messages.length === 0
            ? [
                  {
                      role: 'user',
                      content:
                          locale === 'de'
                              ? 'Beginne das Interview mit deiner ersten Frage.'
                              : 'Begin the interview with your first question.',
                  },
              ]
            : messages.map((m) => ({ role: m.role, content: m.content }));

    const model = serverRuntime.ai.compassInterviewerModel();
    // The runtime binds this factory to `gemini-2.5-pro`. Resolve the same
    // id locally so `googleAgentProviderOptionsFor` picks the Pro branch
    // (structured outputs on, no `thinkingBudget: 0` — Pro rejects it). If
    // the runtime swaps tier later, this line is the single place to update.
    const modelIdForProviderOptions = 'gemini-2.5-pro';
    const result = await generateText({
        model,
        system,
        messages: modelMessages,
        providerOptions: googleAgentProviderOptionsFor(modelIdForProviderOptions),
        tools: { concludeInterview: concludeInterviewTool },
        // Single-step turn. The model writes its question (or its conclude
        // tool call) and stops; we do NOT loop here because the next "step"
        // is Cem typing his reply, which arrives on a separate command call.
    });

    const modelId = result.response.modelId;
    const concludeCall = result.toolCalls.find((c) => c.toolName === 'concludeInterview');
    const text = result.text.trim();

    if (concludeCall) {
        const note = (concludeCall.input as { note?: string }).note ?? '';
        return { kind: 'concluded', content: text, endNote: note, modelId };
    }

    return { kind: 'question', content: text, modelId };
}
