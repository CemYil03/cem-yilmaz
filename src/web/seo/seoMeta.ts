import { DEFAULT_LOCALE, LOCALES } from '../utils/locale';
import type { Locale } from '../utils/locale';
import { DEFAULT_SHARE_IMAGE, DEFAULT_SHARE_IMAGE_DIMENSIONS, OG_LOCALE, SITE_NAME } from './seoConstants';

export interface SeoInput {
    // The page-specific title — `seoMeta` appends ` — ${SITE_NAME}` for the
    // browser tab title and Open Graph card. Aim for ≤ 60 characters before
    // the suffix is added.
    title: string;
    // Plain-text description used for the meta description, OG, and Twitter
    // card. Aim for 50–160 characters.
    description: string;
    // Canonical path WITHOUT any locale prefix and starting with `/` (e.g.
    // `/`, `/terms`). The locale prefix is added per-locale internally.
    path: string;
    // The locale this page is currently rendering in.
    locale: Locale;
    // Absolute origin (no trailing slash). Comes from
    // `EnvironmentVariables.webPageUrl` plumbed through the root route's
    // context — pass it in rather than reading it as a global to keep the
    // helper pure and isomorphic.
    webPageUrl: string;
    // Optional override for the Open Graph / Twitter share image. May be a
    // root-relative path (turned into an absolute URL) or an absolute URL.
    image?: string;
    // Optional intrinsic dimensions of `image`. When omitted the helper falls
    // back to `DEFAULT_SHARE_IMAGE_DIMENSIONS`. Setting both `og:image:width`
    // and `og:image:height` lets crawlers reserve layout space and skip a
    // round-trip to probe the file.
    imageWidth?: number;
    imageHeight?: number;
    // Open Graph object type. Defaults to `'website'`.
    type?: 'website' | 'article';
    // When true, emits `<meta name="robots" content="noindex,nofollow">`.
    // Otherwise emits `index,follow` so indexability is always explicit.
    noindex?: boolean;
}

type MetaTag = { title: string } | { name: string; content: string } | { property: string; content: string };
type LinkTag = { rel: string; href: string; hrefLang?: string };

export interface SeoOutput {
    meta: MetaTag[];
    links: LinkTag[];
}

export function seoMeta(input: SeoInput): SeoOutput {
    const fullTitle = `${input.title} — ${SITE_NAME}`;
    const canonical = canonicalUrlBuild(input.webPageUrl, input.locale, input.path);
    const usingDefaultImage = !input.image;
    const imageUrl = imageUrlAbsolute(input.webPageUrl, input.image ?? DEFAULT_SHARE_IMAGE);
    const imageWidth = input.imageWidth ?? (usingDefaultImage ? DEFAULT_SHARE_IMAGE_DIMENSIONS.width : undefined);
    const imageHeight = input.imageHeight ?? (usingDefaultImage ? DEFAULT_SHARE_IMAGE_DIMENSIONS.height : undefined);
    const ogType = input.type ?? 'website';

    const meta: MetaTag[] = [
        { title: fullTitle },
        { name: 'description', content: input.description },
        { name: 'robots', content: input.noindex ? 'noindex,nofollow' : 'index,follow' },
        { property: 'og:title', content: fullTitle },
        { property: 'og:description', content: input.description },
        { property: 'og:url', content: canonical },
        { property: 'og:type', content: ogType },
        { property: 'og:site_name', content: SITE_NAME },
        { property: 'og:locale', content: OG_LOCALE[input.locale] },
        { property: 'og:image', content: imageUrl },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: fullTitle },
        { name: 'twitter:description', content: input.description },
        { name: 'twitter:image', content: imageUrl },
    ];

    if (imageWidth !== undefined && imageHeight !== undefined) {
        meta.push(
            { property: 'og:image:width', content: String(imageWidth) },
            { property: 'og:image:height', content: String(imageHeight) },
        );
    }

    for (const otherLocale of LOCALES) {
        if (otherLocale === input.locale) continue;
        meta.push({
            property: 'og:locale:alternate',
            content: OG_LOCALE[otherLocale],
        });
    }

    const links: LinkTag[] = [{ rel: 'canonical', href: canonical }];
    for (const otherLocale of LOCALES) {
        links.push({
            rel: 'alternate',
            hrefLang: otherLocale,
            href: canonicalUrlBuild(input.webPageUrl, otherLocale, input.path),
        });
    }
    links.push({
        rel: 'alternate',
        hrefLang: 'x-default',
        href: canonicalUrlBuild(input.webPageUrl, DEFAULT_LOCALE, input.path),
    });

    return { meta, links };
}

function canonicalUrlBuild(webPageUrl: string, locale: Locale, path: string): string {
    const prefix = locale === DEFAULT_LOCALE ? '' : `/${locale}`;
    // path === '/' must collapse to no trailing slash on the prefix-only URL
    // (e.g. `https://example.com/en` not `https://example.com/en/`).
    const suffix = path === '/' ? '' : path;
    return `${webPageUrl}${prefix}${suffix}` || webPageUrl;
}

function imageUrlAbsolute(webPageUrl: string, image: string): string {
    if (image.startsWith('http://') || image.startsWith('https://')) return image;
    return `${webPageUrl}${image.startsWith('/') ? '' : '/'}${image}`;
}
