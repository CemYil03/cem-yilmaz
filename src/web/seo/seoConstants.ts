import type { Locale } from '../utils/locale';

// Site-wide branding and SEO defaults. Update `SITE_NAME` here once and every
// page's `<title>`, `og:site_name`, and Twitter card text follows.
export const SITE_NAME = 'Cem Yilmaz';

// Default Open Graph / Twitter Card image. Root-relative so the `seoMeta()`
// helper turns it into an absolute URL using `webPageUrl`. Replace with your
// actual social-share image (recommended 1200×630).
export const DEFAULT_SHARE_IMAGE = '/profile-picture.png';

// Intrinsic dimensions of `DEFAULT_SHARE_IMAGE`. Emitted as
// `og:image:width` / `og:image:height` so crawlers (Facebook, LinkedIn) can
// render the share card without an extra probe request. Keep in sync with the
// file in `public/`.
export const DEFAULT_SHARE_IMAGE_DIMENSIONS = { width: 640, height: 640 } as const;

// Maps app locales to the IETF tags Open Graph expects. Add a new entry here
// whenever you add a locale in `src/web/utils/locale.ts`.
export const OG_LOCALE: Record<Locale, string> = {
    de: 'de_DE',
    en: 'en_US',
};
