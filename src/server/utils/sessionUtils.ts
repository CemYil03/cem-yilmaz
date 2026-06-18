import type { GqlSSession } from '../graphql/generated';
import type { SessionCookieConfiguration } from '../env/EnvironmentVariables';

function getSessionIdFromRequest(sessionCookieConfig: SessionCookieConfiguration, request: Request): string | null {
    const cookieHeader = request.headers.get('cookie');

    if (!cookieHeader) return null;

    const cookies = cookieHeader.split(';').map((c) => c.trim());
    const sessionCookie = cookies.find((c) => c.startsWith(sessionCookieConfig.name + '='));

    if (!sessionCookie) return null;

    return sessionCookie.split('=')[1] ?? null;
}

type SameSite = 'Strict' | 'Lax' | 'None';

interface CookieOptions {
    name: string;
    value: string;
    expires?: Date;
    httpOnly?: boolean;
    sameSite?: SameSite;
    secure?: boolean;
    domain?: string;
}

export function createSetCookieString(options: CookieOptions): string {
    const { name, value, expires, httpOnly = true, sameSite = 'Strict', secure = true, domain } = options;

    // Start with the name and value
    let cookieString = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;

    // Add optional properties
    if (expires) {
        cookieString += `; Expires=${expires.toUTCString()}`;
    }

    if (httpOnly) {
        cookieString += `; HttpOnly`;
    }

    if (secure) {
        cookieString += `; Secure`;
    }

    cookieString += `; SameSite=${sameSite}`;

    if (domain) {
        cookieString += `; Domain=${domain}`;
    }

    cookieString += `; Path=/`;

    return cookieString;
}

function createSetSessionCookie(sessionCookieConfig: SessionCookieConfiguration, session: GqlSSession): string {
    const sessionLifetimeMs = 365 * 24 * 60 * 60 * 1000;

    return createSetCookieString({
        name: sessionCookieConfig.name,
        value: session.sessionId,
        expires: new Date(Date.now() + sessionLifetimeMs),
        httpOnly: true,
        sameSite: sessionCookieConfig.secure ? 'None' : 'Lax',
        secure: sessionCookieConfig.secure,
        domain: sessionCookieConfig.domainScope,
    });
}

function clearSessionCookie(env: SessionCookieConfiguration): string {
    return `${env.name}=; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=0`;
}

export const sessionUtils = {
    getSessionIdFromRequest,
    createSetSessionCookie,
    clearSessionCookie,
};
