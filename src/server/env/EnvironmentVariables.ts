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
    // dynamic robots.txt all derive from this. See `docs/architecture/discovery-seo.md`.
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
    // Per-deploy salt mixed into the SHA-256 of every visitor request's
    // client IP before it lands in `Sessions.ipHash`. The hash is used for
    // the public visitor-chat rate limit (see
    // `docs/features/chat-visitor.md`); salting means a DB leak does not
    // expose visitor IPs and two deploys cannot be cross-correlated.
    // Required at boot — refusing a missing salt up front is safer than
    // silently dropping the IP bucket of the rate limiter.
    visitorIpHashSalt: string;
    // Optional at the env layer, fail-fast required at the email-capability
    // call site (`emailServiceCreate`). Same rationale as
    // `googleGenerativeAiApiKey`: tests and build-time tooling build a typed
    // env without a key, and the missing-key error surfaces with
    // provider-specific context where it can be acted on. See
    // `docs/features/chat-email-tools.md`.
    resendApiKey: string | undefined;
    // From-address Resend sends as. The Resend account must own the sending
    // domain (DNS + SPF + DKIM). Format is `"Name <local@domain>"` or a bare
    // address. Optional at the env layer for the same reason as
    // `resendApiKey` — fail-fast happens in `emailServiceCreate`.
    emailFromAddress: string | undefined;
    // The AdminMediaMovie Database (TMDB) v3 API key used by the `/workspace/media`
    // movie search + auto-fill flow. Optional: the feature degrades to
    // manual-entry-only when the key is missing (TMDB search returns an
    // empty list, no 500). See `docs/features/workspace-media.md`.
    tmdbApiKey: string | undefined;
    // YouTube Data API v3 key used by the `/workspace/media` channel
    // search + auto-fill flow (avatar, handle, description). Same
    // degrade-gracefully posture as `tmdbApiKey` — missing key means
    // empty search results and the manual entry path still works. See
    // `docs/features/workspace-media.md`.
    youtubeApiKey: string | undefined;
}
