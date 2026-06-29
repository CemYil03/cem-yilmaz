import { tool } from 'ai';
import { z } from 'zod';
import { emailToCemSend } from '../jobs/handlers/emailToCemSend';
import type { ServerRuntime } from '../domain/ServerRuntime';

// --- toolSendEmailToCem ------------------------------------------------------
//
// Fire-and-forget contact channel for the visitor chat. The LLM gathers
// subject + body + reply-to via `promptUserForInput` first (the system
// prompt requires it), then calls this tool with the assembled payload. The
// tool's `execute` enqueues a pg-boss job (`emailToCemSend`); pg-boss owns
// retries, so a transient Resend failure doesn't poison the chat turn.
//
// Unlike `promptUserForInput`, this tool DOES have an `execute` function —
// its return value lands in `chatMessagesToolCall.toolResult` via the
// existing branch in `chatAssistantTurnRun`, so the next agent step sees the
// outcome and can confirm the send to the visitor in natural language.
//
// No rate-limit gate of its own: visitor chat already caps user messages at
// 10/24h per IP-hash. A bad actor can therefore queue at most 10 emails
// before the chat itself stops accepting their input. See
// `docs/features/chat-visitor.md`.

const sendEmailToCemInputSchema = z.object({
    subject: z.string().min(1).max(200).describe('Short subject line summarising what the visitor wants to say.'),
    body: z.string().min(1).max(5000).describe('The message body. Plain text. Include everything the visitor wants Cem to see.'),
    replyEmail: z
        .string()
        .email()
        .describe("The visitor's own email address — Cem will hit reply to reach them. Required; ask before calling if missing."),
    visitorName: z.string().max(200).optional().describe('Optional sender name to show alongside the reply-to address.'),
});

interface SendEmailToCemContext {
    serverRuntime: ServerRuntime;
}

export function toolSendEmailToCem({ serverRuntime }: SendEmailToCemContext) {
    return tool({
        description: [
            'Send a plain email to Cem with whatever the visitor wrote.',
            'Use this when the visitor wants to contact Cem about something simple — a question, a hello, a heads-up, a quick',
            'message. Do NOT use this for project requests or business enquiries; call `submitProjectRequest` instead.',
            'Before calling this tool, collect `subject`, `body`, and `replyEmail` from the visitor with',
            "`promptUserForInput` — never invent a subject or guess at the visitor's reply address.",
            'After this tool returns, briefly confirm to the visitor that you have passed the message on; do not promise a',
            'specific response time.',
            'The tool result has the shape `{ status: "queued" }`.',
        ].join(' '),
        inputSchema: sendEmailToCemInputSchema,
        execute: async (input) => {
            await serverRuntime.jobs.enqueue(emailToCemSend, {
                subject: input.subject,
                body: input.body,
                replyEmail: input.replyEmail,
                visitorName: input.visitorName,
            });
            return { status: 'queued' as const };
        },
    });
}
