import { createFileRoute } from '@tanstack/react-router';
import { environmentVariables } from '../server/env/environmentVariablesCreate';

// Dynamic robots.txt — emits an absolute `Sitemap:` URL using
// `WEB_PAGE_URL` so crawlers don't need to resolve relative URLs and so the
// served file matches the deployed environment exactly. Excludes the API
// surface and the authenticated `/server/*` render targets.
//
// AI / generative-search crawlers are enumerated explicitly. The same
// `Disallow` rules apply to every group, but listing each by name signals
// affirmative consent to the bots that look for an explicit policy
// (PerplexityBot, OAI-SearchBot, ClaudeBot) and documents intent for the
// ones that don't (CCBot). The list covers both categories of bot:
//   - Training crawlers (GPTBot, ClaudeBot, Google-Extended,
//     Applebot-Extended, CCBot, anthropic-ai, cohere-ai) — feed model
//     training corpora.
//   - Inference / live-citation crawlers (OAI-SearchBot, ChatGPT-User,
//     PerplexityBot, Perplexity-User) — fetch on-demand when answering a
//     user's live query and cite the source.
// See docs/architecture/discovery-geo.md for the policy
// rationale.

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

// Crawlers that get the same allow/disallow rules as the generic `*` group.
// Keep this list flat and alphabetised — easier to audit than nested groups.
const AI_USER_AGENTS = [
    'anthropic-ai',
    'Applebot-Extended',
    'CCBot',
    'ChatGPT-User',
    'ClaudeBot',
    'cohere-ai',
    'Google-Extended',
    'GPTBot',
    'OAI-SearchBot',
    'PerplexityBot',
    'Perplexity-User',
] as const;

function robotsTxtBuild(webPageUrl: string): string {
    const disallowBlock = ['Disallow: /api/', 'Disallow: /server/', 'Disallow: /workspace/'].join('\n');
    const genericGroup = `User-agent: *\n${disallowBlock}`;
    const aiGroups = AI_USER_AGENTS.map((agent) => `User-agent: ${agent}\nAllow: /\n${disallowBlock}`).join('\n\n');
    return `${genericGroup}\n\n${aiGroups}\n\nSitemap: ${webPageUrl}/sitemap.xml\n`;
}
