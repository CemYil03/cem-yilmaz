import type { EnvironmentVariables } from './EnvironmentVariables';

const requiredEnvironmentVariables = ['DATABASE_URL', 'sessionCookieName', 'WEB_PAGE_URL', 'VISITOR_IP_HASH_SALT'] as const;

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
        visitorIpHashSalt: source.VISITOR_IP_HASH_SALT!,
        // Capability-specific — required only when the visitor chat's email
        // tools are actually invoked. Validated in `emailServiceCreate`. See
        // `docs/features/chat-email-tools.md`.
        resendApiKey: source.RESEND_API_KEY,
        emailFromAddress: source.EMAIL_FROM_ADDRESS,
        // Capability-specific — required only by the `/workspace/media` TMDB
        // search / auto-fill flow. Validated at the call site in
        // `tmdbClientCreate`; when missing, that client returns an empty
        // result set instead of throwing so the media page's manual-entry
        // path still works. See `docs/features/workspace-media.md`.
        tmdbApiKey: source.TMDB_API_KEY,
        // Same posture as `tmdbApiKey`, for the YouTube channel search on
        // `/workspace/media`. Validated in `youtubeClientCreate`; missing
        // key → empty results.
        youtubeApiKey: source.YOUTUBE_API_KEY,
    };
}

let cachedEnvironmentVariables: EnvironmentVariables | undefined;

export const environmentVariables: EnvironmentVariables = new Proxy({} as EnvironmentVariables, {
    get(_target, property) {
        cachedEnvironmentVariables ??= environmentVariablesCreate();
        return cachedEnvironmentVariables[property as keyof EnvironmentVariables];
    },
});
