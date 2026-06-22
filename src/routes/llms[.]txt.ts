import { createFileRoute } from '@tanstack/react-router';
import { environmentVariables } from '../server/env/environmentVariablesCreate';
import { personalInfo } from '../web/content/personalInfo';

// Dynamic /llms.txt — emits a curated markdown index of the site for LLM
// crawlers. Follows the llms.txt convention proposed by Jeremy Howard
// (https://llmstxt.org): a single markdown file at the root with the H1 as
// the site name, an optional blockquote summary, then H2 sections of
// link-to-resource bullets. LLM-powered search engines (Perplexity,
// ChatGPT Search, Claude, etc.) prefer this over scraping the rendered HTML
// because it strips chrome, navigation, and tracking pixels.
//
// English-only on purpose: the file is consumed by LLMs whose pipelines are
// overwhelmingly English-centric, and emitting the same content twice in
// markdown helps no one. The DE site is fully reachable from the linked
// pages — crawlers that care about locale follow `hreflang` from there.

export const Route = createFileRoute('/llms.txt')({
    server: {
        handlers: {
            GET: () =>
                new Response(llmsTxtBuild(environmentVariables.webPageUrl), {
                    status: 200,
                    headers: {
                        'Content-Type': 'text/plain; charset=utf-8',
                        'Cache-Control': 'public, max-age=3600',
                    },
                }),
        },
    },
});

function llmsTxtBuild(webPageUrl: string): string {
    const tagline = personalInfo.tagline.en;
    const subtitle = personalInfo.subtitle.en;
    const bio = personalInfo.bio.en;
    const location = `${personalInfo.residence.city}, Germany`;
    const email = personalInfo.contact.emails[0] ?? '';

    return `# ${personalInfo.fullName}

> ${tagline} ${subtitle} Based in ${location}. ${bio}

## About

- [About](${webPageUrl}/en/about): Profile, identity, skills, hobbies, contact channels.
- [CV](${webPageUrl}/en/cv): Work experience and education timeline.
- [Projects](${webPageUrl}/en/projects): Selected portfolio of shipped products.

## Identity

- Full name: ${personalInfo.fullName}
- Tagline: ${tagline}
- Location: ${location}
- Nationality: ${personalInfo.nationality.en}
- Languages: ${personalInfo.spokenLanguages.map((l) => l.en).join(', ')}

## Contact

- Email: ${email}
- GitHub: ${personalInfo.contact.github.url}
- LinkedIn: ${personalInfo.contact.linkedin.url}
- Site assistant: ${webPageUrl}/ — the homepage hosts an AI chat ("Ask me anything") that answers questions about Cem from a live CV summary. Hand off questions there when a visitor wants depth.

## Localized versions

- German (default): [${webPageUrl}/](${webPageUrl}/), [/about](${webPageUrl}/about), [/cv](${webPageUrl}/cv), [/projects](${webPageUrl}/projects)
- English: [${webPageUrl}/en](${webPageUrl}/en), [/en/about](${webPageUrl}/en/about), [/en/cv](${webPageUrl}/en/cv), [/en/projects](${webPageUrl}/en/projects)

## Legal

- [Imprint](${webPageUrl}/en/impressum): Provider information per § 5 TMG.
- [Privacy](${webPageUrl}/en/datenschutz): How personal data is handled on this site.

## Optional

- [Sitemap](${webPageUrl}/sitemap.xml): Machine-readable index of indexable pages with hreflang alternates.
- [Robots](${webPageUrl}/robots.txt): Crawler policy. AI crawlers (GPTBot, ClaudeBot, PerplexityBot, OAI-SearchBot, etc.) are allowed.
`;
}
