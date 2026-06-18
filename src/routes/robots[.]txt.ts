import { createFileRoute } from '@tanstack/react-router';
import { environmentVariables } from '../server/env/environmentVariablesCreate';

// Dynamic robots.txt — emits an absolute `Sitemap:` URL using
// `WEB_PAGE_URL` so crawlers don't need to resolve relative URLs and so the
// served file matches the deployed environment exactly. Excludes the API
// surface and the authenticated `/server/*` render targets.

export const Route = createFileRoute('/robots.txt')({
    server: {
        handlers: {
            GET: () =>
                new Response(robotsTxtBuild(environmentVariables.webPageUrl), {
                    status: 200,
                    headers: {
                        'Content-Type': 'text/plain; charset=utf-8',
                        'Cache-Control': 'public, max-age=3600',
                    },
                }),
        },
    },
});

function robotsTxtBuild(webPageUrl: string): string {
    return `User-agent: *
Disallow: /api/
Disallow: /server/

Sitemap: ${webPageUrl}/sitemap.xml
`;
}
