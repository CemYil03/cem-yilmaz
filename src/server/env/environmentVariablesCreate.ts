import type { EnvironmentVariables } from './EnvironmentVariables';

const requiredEnvironmentVariables = ['DATABASE_URL', 'sessionCookieName', 'WEB_PAGE_URL'] as const;

export function environmentVariablesCreate(source: NodeJS.ProcessEnv = process.env): EnvironmentVariables {
    const missing = requiredEnvironmentVariables.filter((name) => !source[name]);
    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    return {
        databaseUrl: source.DATABASE_URL!,
        sessionCookie: {
            name: source.sessionCookieName!,
            secure: source.sessionCookieSecure === 'true',
            domainScope: source.sessionCookieDomainScope,
        },
        buildSha: source.BUILD_SHA ?? 'unknown',
        webPageUrl: source.WEB_PAGE_URL!.replace(/\/$/, ''),
        // Capability-specific — validated by whoever consumes it (see
        // `serverRuntimeCreate`'s Google client wiring), not at boot.
        googleGenerativeAiApiKey: source.GOOGLE_GENERATIVE_AI_API_KEY,
        // Capability-specific — required only by features that authenticate
        // server-side renders via `serverToken.ts`. Validated at the call
        // site, not at boot. See `docs/architecture/server-side-rendering.md`.
        serverTokenSecret: source.SERVER_TOKEN_SECRET,
    };
}

let cachedEnvironmentVariables: EnvironmentVariables | undefined;

export const environmentVariables: EnvironmentVariables = new Proxy({} as EnvironmentVariables, {
    get(_target, property) {
        cachedEnvironmentVariables ??= environmentVariablesCreate();
        return cachedEnvironmentVariables[property as keyof EnvironmentVariables];
    },
});
