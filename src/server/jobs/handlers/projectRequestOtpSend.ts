import { eq } from 'drizzle-orm';
import { projectRequests } from '../../db/schema';
import type { QueuedJobDefinition } from '../types';

// Send the verification OTP to the address the visitor gave on a project
// request. The plaintext OTP lives only in this job payload (which pg-boss
// stores transiently while the job is queued) and the email body — the DB
// only ever holds `sha256(otp + salt)`.
//
// The job is the first half of a two-step trust check: nothing reaches Cem's
// inbox until `toolVerifyProjectRequestOtp` accepts the code and enqueues
// `projectRequestNotifySend`. If this job fails terminally (Resend down,
// invalid address), the visitor sees no OTP arrive, retries the chat flow,
// and a fresh row supersedes the dead one — the verify tool surfaces an
// `expired` status after 10 minutes anyway.
//
// See `docs/features/project-requests.md` and
// `docs/features/chat-email-tools.md`.

export interface ProjectRequestOtpSendData {
    projectRequestId: string;
    visitorEmail: string;
    otp: string;
    expiresInMinutes: number;
}

export const projectRequestOtpSend: QueuedJobDefinition<ProjectRequestOtpSendData> = {
    kind: 'queued',
    name: 'project-request-otp-send',
    handler: async ({ data, serverRuntime }) => {
        const { projectRequestId, visitorEmail, otp, expiresInMinutes } = data;

        // Bail if the request was archived/verified between enqueue and run
        // (eg. the visitor re-submitted, superseding this row). pg-boss is
        // at-least-once, so this also covers a redelivery after success.
        const [row] = await serverRuntime.db
            .select({ status: projectRequests.status })
            .from(projectRequests)
            .where(eq(projectRequests.projectRequestId, projectRequestId))
            .limit(1);
        if (!row || row.status !== 'pendingOtp') {
            serverRuntime.log.info(`projectRequestOtpSend: skipping ${projectRequestId} (status=${row?.status ?? 'missing'})`);
            return;
        }

        const text = [
            `Your verification code for the project request to Cem Yilmaz is:`,
            ``,
            `    ${otp}`,
            ``,
            `Enter it in the chat to confirm your email address.`,
            `The code expires in ${expiresInMinutes} minutes.`,
            ``,
            `If you didn't request this, you can safely ignore this email.`,
            ``,
            `— cem-yilmaz.de`,
        ].join('\n');
        const html = [
            `<p>Your verification code for the project request to <strong>Cem Yilmaz</strong> is:</p>`,
            `<p style="font-size:28px;font-family:'SFMono-Regular',Menlo,monospace;letter-spacing:6px;background:#f4f4f5;padding:16px 24px;border-radius:8px;display:inline-block">${otp}</p>`,
            `<p>Enter it in the chat to confirm your email address.</p>`,
            `<p>The code expires in <strong>${expiresInMinutes} minutes</strong>.</p>`,
            `<p style="color:#888;font-size:12px">If you didn't request this, you can safely ignore this email.</p>`,
            `<p style="color:#888;font-size:12px">— cem-yilmaz.de</p>`,
        ].join('');

        await serverRuntime.emailService.sendEmail({
            to: { email: visitorEmail },
            subject: `Your verification code: ${otp}`,
            text,
            html,
        });
        serverRuntime.log.info(`projectRequestOtpSend: delivered to ${visitorEmail} (projectRequestId=${projectRequestId})`);
    },
    options: {
        retryLimit: 3,
        retryDelay: 60,
        expireInSeconds: 600,
    },
};
