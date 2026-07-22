// JSON-LD (schema.org) builders. Search engines and AI-search engines use
// these blocks to render rich snippets and to attribute entities (Person,
// Organization, etc.) without inferring them from HTML. Output shape matches
// TanStack Router `head().scripts`: each entry renders as a
// `<script type="application/ld+json">…</script>` in the document head.
//
// Three builders live here:
//   - `jsonLdScripts(webPageUrl)` — `WebSite` + `Person` for the homepage.
//     Tells search engines what the site is and who Cem is, including
//     `sameAs` links to GitHub / LinkedIn for entity reconciliation.
//   - `jsonLdProfilePage(webPageUrl)` — `ProfilePage` for `/about`. The
//     schema.org type specifically intended for "about me" pages; AI
//     engines weight it more than a bare `Person` on a generic URL.
//   - `jsonLdFaqPage(qa)` — `FAQPage` for the Q&A block on `/about`. AI
//     engines extract these verbatim when answering questions about Cem.
//
// All builders read identity facts from `personalInfo` so the JSON-LD stays
// in sync with the rest of the site. `dateModified` is the last-commit ISO
// timestamp injected by Vite (`__SITE_LAST_MODIFIED__`) — without it AI
// engines have no freshness signal and may deprioritise stale-looking
// content.

import { languageTagFromLocale, LOCALES } from '../../shared';
import { personalInfo } from '../content/personalInfo';
import { SITE_NAME } from './seoConstants';

interface JsonLdScript {
    type: 'application/ld+json';
    children: string;
}

export interface FaqEntry {
    question: string;
    answer: string;
}

function personEntity(webPageUrl: string) {
    return {
        '@type': 'Person',
        '@id': `${webPageUrl}/#person`,
        name: personalInfo.fullName,
        url: webPageUrl,
        image: `${webPageUrl}/profile-picture.png`,
        jobTitle: personalInfo.tagline.en,
        description: personalInfo.bio.en,
        address: {
            '@type': 'PostalAddress',
            postalCode: personalInfo.residence.postalCode,
            addressLocality: personalInfo.residence.city,
            addressCountry: 'DE',
        },
        nationality: 'German',
        knowsLanguage: ['de', 'en'],
        sameAs: [personalInfo.contact.github.url, personalInfo.contact.linkedin.url],
    };
}

export function jsonLdScripts(webPageUrl: string): ReadonlyArray<JsonLdScript> {
    const webSite = {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        '@id': `${webPageUrl}/#website`,
        url: webPageUrl,
        name: SITE_NAME,
        inLanguage: LOCALES.map(languageTagFromLocale),
        dateModified: __SITE_LAST_MODIFIED__,
        publisher: { '@id': `${webPageUrl}/#person` },
    };

    const person = {
        '@context': 'https://schema.org',
        ...personEntity(webPageUrl),
    };

    return [
        { type: 'application/ld+json', children: JSON.stringify(webSite) },
        { type: 'application/ld+json', children: JSON.stringify(person) },
    ];
}

export function jsonLdProfilePage(webPageUrl: string, locale: 'de' | 'en'): JsonLdScript {
    const path = locale === 'de' ? '/about' : '/en/about';
    const profilePage = {
        '@context': 'https://schema.org',
        '@type': 'ProfilePage',
        '@id': `${webPageUrl}${path}#profile`,
        url: `${webPageUrl}${path}`,
        name: locale === 'de' ? `Über mich — ${personalInfo.fullName}` : `About — ${personalInfo.fullName}`,
        inLanguage: languageTagFromLocale(locale),
        dateModified: __SITE_LAST_MODIFIED__,
        mainEntity: personEntity(webPageUrl),
    };
    return { type: 'application/ld+json', children: JSON.stringify(profilePage) };
}

export function jsonLdFaqPage(entries: ReadonlyArray<FaqEntry>): JsonLdScript {
    const faqPage = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        dateModified: __SITE_LAST_MODIFIED__,
        mainEntity: entries.map((entry) => ({
            '@type': 'Question',
            name: entry.question,
            acceptedAnswer: { '@type': 'Answer', text: entry.answer },
        })),
    };
    return { type: 'application/ld+json', children: JSON.stringify(faqPage) };
}
