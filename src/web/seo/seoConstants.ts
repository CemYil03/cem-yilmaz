import type { Locale } from '../utils/locale';

// Site-wide branding and SEO defaults. Update `SITE_NAME` here once and every
// page's `<title>`, `og:site_name`, and Twitter card text follows.
export const SITE_NAME = 'Project name';

// Default Open Graph / Twitter Card image. Root-relative so the `seoMeta()`
// helper turns it into an absolute URL using `webPageUrl`. Replace with your
// actual social-share image (recommended 1200×630).
export const DEFAULT_SHARE_IMAGE = '/logo512.png';

// Maps app locales to the IETF tags Open Graph expects. Add a new entry here
// whenever you add a locale in `src/web/utils/locale.ts`.
export const OG_LOCALE: Record<Locale, string> = {
    de: 'de_DE',
    en: 'en_US',
};
