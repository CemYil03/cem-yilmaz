import { Resend } from 'resend';
import { environmentVariables } from '../env/environmentVariablesCreate';
import { personalInfo } from '../../web/content/personalInfo';

// Single boundary between the rest of the server and Resend. Every outbound
// email — the visitor's simple-email tool, the OTP for project requests, the
// notification email to Cem after verification — calls `sendEmail` on the
// service the runtime exposes on `serverRuntime.emailService`. See
// `docs/features/chat-email-tools.md`.
//
// Capability-validated: the constructor reads `RESEND_API_KEY` and
// `EMAIL_FROM_ADDRESS` lazily on first send, not at boot, so the env layer
// stays decoupled from the email feature (same pattern as the Gemini key in
// `serverRuntimeCreate`).
//
// All mail destined for Cem lands at `personalInfo.contact.emails[0]` — the
// single source of truth for his inbox. Visitor-supplied replyTo lets him
// hit reply without copying the address out of the body.

interface EmailRecipient {
    email: string;
    name?: string;
}

interface SendEmailParams {
    to: EmailRecipient | EmailRecipient[];
    replyTo?: string;
    subject: string;
    html: string;
    text: string;
}

export interface EmailService {
    /**
     * Send an email. Throws if the Resend API rejects the send or if the
     * required env vars are missing. Callers run inside a pg-boss job
     * handler so the retry policy on the job definition (3 attempts, 60s
     * backoff) absorbs transient failures.
     */
    sendEmail: (params: SendEmailParams) => Promise<{ messageId: string }>;
    /**
     * Convenience: Cem's primary inbox, used by every server-originated
     * notification (visitor email tool, project-request notification).
     */
    cemPrimaryAddress: string;
}

export function emailServiceCreate(): EmailService {
    let resendClient: Resend | null = null;

    function ensureClient(): { resend: Resend; from: string } {
        const apiKey = environmentVariables.resendApiKey;
        if (!apiKey) {
            throw new Error(
                'Missing required environment variable: RESEND_API_KEY (required by emailServiceCreate; the visitor chat email tools cannot run without it)',
            );
        }
        const from = environmentVariables.emailFromAddress;
        if (!from) {
            throw new Error(
                'Missing required environment variable: EMAIL_FROM_ADDRESS (required by emailServiceCreate; the Resend account must own the sending domain — see docs/features/chat-email-tools.md)',
            );
        }
        // Lazy client construction so test runtimes that never call
        // `sendEmail` never instantiate the SDK.
        if (!resendClient) {
            resendClient = new Resend(apiKey);
        }
        return { resend: resendClient, from };
    }

    return {
        cemPrimaryAddress: personalInfo.contact.emails[0]!,
        sendEmail: async ({ to, replyTo, subject, html, text }) => {
            const { resend, from } = ensureClient();
            const recipients = Array.isArray(to) ? to : [to];
            const result = await resend.emails.send({
                from,
                to: recipients.map((r) => (r.name ? `${r.name} <${r.email}>` : r.email)),
                replyTo,
                subject,
                html,
                text,
            });
            if (result.error) {
                throw new Error(`Resend rejected the send: ${result.error.name} — ${result.error.message}`);
            }
            // `Response<T>` is `({data: T, error: null} | {data: null, error: ErrorResponse})`,
            // so the `result.error` short-circuit above narrows `data` to
            // non-null. Read `id` directly — the optional chain that lived
            // here previously tripped `no-unnecessary-condition`.
            if (!result.data.id) {
                throw new Error('Resend returned a success response without a message id');
            }
            return { messageId: result.data.id };
        },
    };
}
