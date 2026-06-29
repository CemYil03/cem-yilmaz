import { createHash, timingSafeEqual } from 'node:crypto';
import { tool } from 'ai';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { projectRequests } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { projectRequestNotifySend } from '../jobs/handlers/projectRequestNotifySend';

// --- toolVerifyProjectRequestOtp ---------------------------------------------
//
// Second half of the project-request trust check. Takes the
// `projectRequestId` returned by `submitProjectRequest` and the 6-digit code
// the visitor entered, and either:
//   - flips the row to `emailVerified`, enqueues the notification email to
//     Cem, and returns `{ status: 'verified' }`; or
//   - returns one of `{ incorrect, expired, alreadyVerified, archived,
//     tooManyAttempts }` without sending anything to Cem.
//
// Attempt cap: increments `otpAttempts` on each wrong code; archives the
// row (and returns `tooManyAttempts`) once the count would exceed 5. The
// row is left in `archived` rather than deleted so we keep an audit trail
// of attempted submissions.
//
// Constant-time hash compare via `crypto.timingSafeEqual` — sha256 is fast
// enough on either side of the gate that a naive `===` would leak timing,
// and the practical attack surface is small but free to close.
//
// See `docs/features/project-requests.md` for the full state diagram.

const MAX_OTP_ATTEMPTS = 5;

const verifyProjectRequestOtpInputSchema = z.object({
    projectRequestId: z
        .string()
        .uuid()
        .describe(
            'The `projectRequestId` returned by the prior `submitProjectRequest` tool call. Do not invent this — only use what came back.',
        ),
    otp: z
        .string()
        .regex(/^\d{6}$/)
        .describe('The 6-digit verification code the visitor entered.'),
});

type VerifyProjectRequestOtpResult =
    | { status: 'verified' }
    | { status: 'incorrect'; attemptsRemaining: number }
    | { status: 'expired' }
    | { status: 'alreadyVerified' }
    | { status: 'archived' }
    | { status: 'tooManyAttempts' }
    | { status: 'notFound' };

interface VerifyProjectRequestOtpContext {
    serverRuntime: ServerRuntime;
}

export function toolVerifyProjectRequestOtp({ serverRuntime }: VerifyProjectRequestOtpContext) {
    return tool({
        description: [
            'Verify the 6-digit one-time code a visitor entered after a `submitProjectRequest` call.',
            'You MUST pass the exact `projectRequestId` returned by `submitProjectRequest` — never invent one, never reuse',
            'an id from a different conversation. Pass the 6-digit code the visitor entered as `otp`.',
            'The tool result has one of: `verified` (Cem has been notified — thank the visitor and let them know Cem will be',
            'in touch), `incorrect` (with `attemptsRemaining`; politely ask them to try again unless 0 — then ask them to',
            'restart the request), `expired` (the 10-minute window passed — ask them to restart), `tooManyAttempts` (cap',
            'reached — ask them to restart), `alreadyVerified` / `archived` (the request is closed). Never reveal the',
            'underlying hash or salt; just describe the outcome in natural language.',
        ].join(' '),
        inputSchema: verifyProjectRequestOtpInputSchema,
        execute: async (input): Promise<VerifyProjectRequestOtpResult> => {
            const { projectRequestId, otp } = input;
            const [row] = await serverRuntime.db
                .select()
                .from(projectRequests)
                .where(eq(projectRequests.projectRequestId, projectRequestId))
                .limit(1);
            if (!row) return { status: 'notFound' };
            if (row.status === 'emailVerified') return { status: 'alreadyVerified' };
            if (row.status === 'archived') return { status: 'archived' };
            // From here: row.status === 'pendingOtp'.
            if (row.otpExpiresAt.getTime() < Date.now()) {
                // Expiry is independent of attempt count — don't bump the
                // attempt counter on an expired window; the row is done.
                return { status: 'expired' };
            }

            // Constant-time compare on the sha256 hashes. Both sides are
            // fixed-length hex so the buffer-length check `timingSafeEqual`
            // does is always trivially satisfied; the timing-safety bit is
            // what we're paying for.
            const candidateHash = createHash('sha256')
                .update(otp + row.otpSalt)
                .digest();
            const storedHash = Buffer.from(row.otpHash, 'hex');
            const matches = candidateHash.length === storedHash.length && timingSafeEqual(candidateHash, storedHash);

            if (matches) {
                await serverRuntime.db
                    .update(projectRequests)
                    .set({ status: 'emailVerified', verifiedAt: new Date(), updatedAt: new Date() })
                    .where(eq(projectRequests.projectRequestId, projectRequestId));
                await serverRuntime.jobs.enqueue(projectRequestNotifySend, { projectRequestId });
                return { status: 'verified' };
            }

            const nextAttempts = row.otpAttempts + 1;
            if (nextAttempts >= MAX_OTP_ATTEMPTS) {
                await serverRuntime.db
                    .update(projectRequests)
                    .set({ status: 'archived', otpAttempts: nextAttempts, updatedAt: new Date() })
                    .where(eq(projectRequests.projectRequestId, projectRequestId));
                return { status: 'tooManyAttempts' };
            }
            await serverRuntime.db
                .update(projectRequests)
                .set({ otpAttempts: nextAttempts, updatedAt: new Date() })
                .where(eq(projectRequests.projectRequestId, projectRequestId));
            return { status: 'incorrect', attemptsRemaining: MAX_OTP_ATTEMPTS - nextAttempts };
        },
    });
}
