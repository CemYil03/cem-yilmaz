import { createIsomorphicFn } from '@tanstack/react-start';
import { environmentVariables } from '../../server/env/environmentVariablesCreate';

// Resolves the absolute origin used for canonicals, hreflang alternates, OG
// URLs, and the dynamic sitemap. The `.server()` body is stripped from the
// client bundle by the TanStack Start plugin (same pattern as
// `routeLoaderGraphqlClient`), so the server-only `environmentVariables`
// import does not leak.
//
// On the client we fall back to `window.location.origin`. That divergence
// from the configured `WEB_PAGE_URL` is intentional and harmless: crawlers
// see the SSR-rendered head where the server value is correct; client-side
// navigations only update the head locally and a localhost origin during
// dev/preview is the right answer there.
export const webPageUrlGet: () => string = createIsomorphicFn()
    .server(() => environmentVariables.webPageUrl)
    .client(() => window.location.origin);
