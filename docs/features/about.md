# About page

## User behavior

- The `/about` page introduces Cem with title, tagline, bio, and profile facts.
- The top section now includes the same profile portrait treatment as the landing page hero: circular image, glass frame, and soft halo.
- The page continues with skills, hobbies, contact cards, FAQs, and a CTA to the full CV.

## Options considered

1. Reuse the landing page portrait styling so personal branding stays consistent between entry page and profile page.
2. Keep `/about` text-only and avoid introducing visual identity imagery there.

## Option chosen

Use the same portrait treatment as the landing page.

Reasons:

- Visual continuity between the landing page and the dedicated profile page.
- Faster recognition and trust through a consistent personal image.
- No new asset pipeline or dependency changes; existing profile image is reused.

## Implementation details

- Route file: `src/routes/{-$locale}/about.tsx`
  - About header now uses a two-column responsive layout (`text + portrait`).
  - Added `AboutPortrait` component with:
    - `/profile-picture.png`
    - circular container with border/backdrop styles matching landing page hero
    - animated halo background (`animate-portrait-halo`)
  - Added locale-aware `alt` text:
    - DE: `Porträt von Cem Yilmaz`
    - EN: `Portrait of Cem Yilmaz`
