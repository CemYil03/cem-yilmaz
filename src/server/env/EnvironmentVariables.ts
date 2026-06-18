export interface SessionCookieConfiguration {
    name: string;
    secure: boolean;
    domainScope: string | undefined;
}

export interface EnvironmentVariables {
    databaseUrl: string;
    sessionCookie: SessionCookieConfiguration;
    buildSha: string;
    // Absolute origin of the deployed site (no trailing slash, e.g.
    // `https://example.com`). Single source of truth for SEO concerns —
    // canonical URLs, hreflang alternates, the dynamic sitemap.xml, and the
    // dynamic robots.txt all derive from this. See `docs/architecture/seo.md`.
    webPageUrl: string;
    // Optional at the env layer, fail-fast required at the LLM-capability
    // wiring site (`serverRuntimeCreate`). Keeping it optional here means
    // env validation does not couple to the AI provider — unit tests and
    // build-time tooling can construct a typed env without a key, and the
    // missing-key error surfaces with provider-specific context where it
    // can be acted on.
    googleGenerativeAiApiKey: string | undefined;
    // Optional at the env layer, fail-fast required at the capability site
    // (`serverToken.createServerToken` / `verifyServerToken`). Used to sign
    // short-lived HMAC tokens that authenticate server-side renders against
    // `/server/*` routes. See `docs/architecture/server-side-rendering.md`.
    serverTokenSecret: string | undefined;
}
