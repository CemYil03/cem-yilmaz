import { createHmac, timingSafeEqual } from 'node:crypto';
import { environmentVariables } from '../env/environmentVariablesCreate';

// Server-side renders (Playwright capturing a `/server/*` route — see
// `docs/architecture/server-side-rendering.md`) need to authenticate without
// a session cookie because the headless browser has no way to inherit the
// user's cookie jar. We mint a short-lived HMAC token bound to a subject
// string (typically the resource id being rendered) and pass it as a
// `?token=...` search param. The route handler verifies the token before
// rendering anything sensitive.
//
// The token is opaque to the client — only server code creates and consumes
// it. TTL is short (default 60 s) so a leaked token has minimal blast radius.

const DEFAULT_TTL_SECONDS = 60;

function getSecret(): string {
    const secret = environmentVariables.serverTokenSecret;
    if (!secret) {
        throw new Error(
            'Missing required environment variable: SERVER_TOKEN_SECRET (required by serverToken.ts for signing server-side render tokens)',
        );
    }
    return secret;
}

function sign(subject: string, expiresAt: number): string {
    const data = `${subject}.${expiresAt}`;
    const signature = createHmac('sha256', getSecret()).update(data).digest('hex');
    return `${data}.${signature}`;
}

/**
 * Creates a short-lived HMAC token bound to `subject`. The subject is
 * typically a resource id (e.g. a schema id, a report id) — the verifier
 * checks that the same subject is presented at consumption time, so a token
 * minted for resource A cannot be replayed against resource B.
 */
export function createServerToken(subject: string, ttlSeconds: number = DEFAULT_TTL_SECONDS): string {
    const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
    return sign(subject, expiresAt);
}

/**
 * Verifies a token previously minted by `createServerToken`. Returns true
 * iff the signature is valid, the token has not expired, and the embedded
 * subject matches `expectedSubject`.
 */
export function verifyServerToken(token: string, expectedSubject: string): boolean {
    const parts = token.split('.');
    if (parts.length !== 3) return false;

    const [subject, expiresAtString, providedSignature] = parts;
    if (!subject || !expiresAtString || !providedSignature) return false;

    const expiresAt = Number(expiresAtString);
    if (Number.isNaN(expiresAt) || Math.floor(Date.now() / 1000) > expiresAt) return false;
    if (subject !== expectedSubject) return false;

    const data = `${subject}.${expiresAtString}`;
    const expectedSignature = createHmac('sha256', getSecret()).update(data).digest('hex');

    const provided = Buffer.from(providedSignature, 'hex');
    const expected = Buffer.from(expectedSignature, 'hex');
    if (provided.length !== expected.length) return false;
    return timingSafeEqual(provided, expected);
}
