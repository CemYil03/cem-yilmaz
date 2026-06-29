import type { QueuedJobDefinition } from '../types';

// Send a plain contact email from a visitor to Cem. Payload carries the
// subject + body the LLM-collected `sendEmailToCem` tool produced plus the
// visitor's reply-to address. The email itself lands at
// `emailService.cemPrimaryAddress`; `replyTo` is set to the visitor so a
// reply in Cem's mail client goes back to them directly.
//
// pg-boss owns the retry policy — three attempts with 60s backoff covers
// transient Resend hiccups without rolling back the chat row that already
// contains the tool call. A terminal failure stays in the DB as a
// `chatMessagesToolCall.toolResult = { status: 'queued' }` row; we accept
// that the visitor may believe their message was sent when in fact pg-boss
// gave up — sending a failure status back into the chat after the fact is
// future work.
//
// See `docs/features/chat-email-tools.md`.

export interface EmailToCemSendData {
    subject: string;
    body: string;
    replyEmail: string;
    visitorName?: string;
}

export const emailToCemSend: QueuedJobDefinition<EmailToCemSendData> = {
    kind: 'queued',
    name: 'email-to-cem-send',
    handler: async ({ data, serverRuntime }) => {
        const { subject, body, replyEmail, visitorName } = data;
        const fromLabel = visitorName ? `${visitorName} <${replyEmail}>` : replyEmail;
        const text = [`From: ${fromLabel}`, `Reply-To: ${replyEmail}`, '', body, '', '— sent via the visitor chat on cem-yilmaz.de'].join(
            '\n',
        );
        const html = [
            `<p><strong>From:</strong> ${escapeHtml(fromLabel)}</p>`,
            `<p><strong>Reply-To:</strong> ${escapeHtml(replyEmail)}</p>`,
            `<hr />`,
            `<p>${escapeHtml(body).replace(/\n/g, '<br />')}</p>`,
            `<hr />`,
            `<p style="color:#888;font-size:12px">Sent via the visitor chat on cem-yilmaz.de.</p>`,
        ].join('');
        await serverRuntime.emailService.sendEmail({
            to: { email: serverRuntime.emailService.cemPrimaryAddress, name: 'Cem Yilmaz' },
            replyTo: replyEmail,
            subject: `[cem-yilmaz.de] ${subject}`,
            text,
            html,
        });
        serverRuntime.log.info(`emailToCemSend: delivered to ${serverRuntime.emailService.cemPrimaryAddress} (replyTo=${replyEmail})`);
    },
    options: {
        retryLimit: 3,
        retryDelay: 60,
        expireInSeconds: 600,
    },
};

// Minimal HTML escape — the body is single-line user-supplied text, never a
// template fragment. Keeps `&` / `<` / `>` / `"` / `'` from ever reaching a
// Resend HTML payload as literal markup.
function escapeHtml(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
