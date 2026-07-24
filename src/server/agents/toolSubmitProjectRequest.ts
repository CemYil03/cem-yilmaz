import { createHash, randomBytes, randomInt } from 'node:crypto';
import { tool } from 'ai';
import { z } from 'zod';
import { projectRequests, projectRequestTypes } from '../db/schema';
import type { AdminProjectRequestCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { projectRequestOtpSend } from '../jobs/handlers/projectRequestOtpSend';

// --- toolSubmitProjectRequest -----------------------------------------------
//
// Persists a project brief in state `pendingOtp` and emails the visitor a
// 6-digit verification code. The brief stays gated until the visitor enters
// the matching code via `toolVerifyProjectRequestOtp`; only then does Cem
// receive the notification email. This is the spam/impersonation firewall
// for the contact pipeline — see `docs/features/project-requests.md`.
//
// The OTP is generated here, hashed with a per-row salt, and dropped into
// the job payload. The plaintext lives only:
//   - in this function's local scope,
//   - in the pg-boss job row (transiently — pg-boss deletes completed jobs),
//   - and in the email body once Resend has delivered it.
// The DB only ever holds `sha256(otp + salt)`.
//
// 10-minute expiry. Five-attempt cap (enforced in the verify tool). No
// "resend OTP" surface in v1 — the LLM should ask the visitor to start over
// (a fresh row will be created with a fresh OTP).
//
// Returns `{ projectRequestId, status: 'otpSent', emailMasked }` so the
// next assistant step has something to echo back to the visitor without
// quoting the full address.

const OTP_EXPIRY_MINUTES = 10;

const submitProjectRequestInputSchema = z.object({
    name: z.string().min(1).max(200).describe("Visitor's full name. Ask for it if not yet provided."),
    email: z.string().email().describe('Reply-to email address. Will be verified via a 6-digit OTP before Cem sees the brief.'),
    company: z.string().max(200).optional().describe('Optional company or organization name.'),
    projectType: z
        .enum(projectRequestTypes)
        .describe(
            [
                'High-level project category. Must be one of:',
                '`webApp` (a website or web app),',
                '`mobile` (a mobile app),',
                '`consulting` (advisory work or pair-programming),',
                '`aiIntegration` (LLM/AI features inside an existing product),',
                "`other` (anything that doesn't fit the four above).",
            ].join(' '),
        ),
    description: z
        .string()
        .min(20)
        .max(5000)
        .describe(
            'Free-text description of the project — what problem, what scope, what is already in place. The more concrete, the better.',
        ),
    budget: z.string().max(200).optional().describe('Rough budget band (e.g. "5–10k €", "open"). Optional; ask but accept "unsure".'),
    timeline: z.string().max(200).optional().describe('Target timeline (e.g. "Q3 2026", "no rush"). Optional.'),
});

interface SubmitProjectRequestContext {
    serverRuntime: ServerRuntime;
    chatId: string;
}

export function toolSubmitProjectRequest({ serverRuntime, chatId }: SubmitProjectRequestContext) {
    return tool({
        description: [
            'Submit a structured project/freelance brief for Cem to review.',
            'Collect every field via `promptUserForInput` first (`projectType` as SingleSelect with the five allowed values).',
            'On success, immediately collect an `Otp` slot, then call `verifyProjectRequestOtp` with the returned `projectRequestId`.',
        ].join(' '),
        inputSchema: submitProjectRequestInputSchema,
        execute: async (input) => {
            const otp = randomInt(0, 1_000_000).toString().padStart(6, '0');
            const otpSalt = randomBytes(16).toString('hex');
            const otpHash = createHash('sha256')
                .update(otp + otpSalt)
                .digest('hex');
            const projectRequestId = crypto.randomUUID();
            const now = new Date();
            const row: AdminProjectRequestCreate = {
                projectRequestId,
                chatId,
                name: input.name,
                email: input.email,
                company: input.company,
                projectType: input.projectType,
                description: input.description,
                budget: input.budget,
                timeline: input.timeline,
                status: 'pendingOtp',
                otpHash,
                otpSalt,
                otpExpiresAt: new Date(now.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000),
                otpAttempts: 0,
                createdAt: now,
                updatedAt: now,
            };
            await serverRuntime.db.insert(projectRequests).values(row);
            await serverRuntime.jobs.enqueue(projectRequestOtpSend, {
                projectRequestId,
                visitorEmail: input.email,
                otp,
                expiresInMinutes: OTP_EXPIRY_MINUTES,
            });
            return {
                status: 'otpSent' as const,
                projectRequestId,
                emailMasked: maskEmail(input.email),
                expiresInMinutes: OTP_EXPIRY_MINUTES,
            };
        },
    });
}

// `j***@gmail.com` rather than the full address — gives the LLM enough to
// confirm "code sent to your gmail" without copy-pasting the literal address
// back into chat (which already shows in the form summary above).
function maskEmail(email: string): string {
    const [local = '', domain = ''] = email.split('@');
    const head = local.slice(0, 1) || '';
    return `${head}${'*'.repeat(Math.max(1, local.length - 1))}@${domain}`;
}
