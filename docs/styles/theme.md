# Theme

The site has **two themes** — light and dark — plus an `auto` mode that follows the operating system. Both themes share the same set of
design tokens declared as CSS custom properties; switching theme just rebinds those properties. See [fonts.md](./fonts.md) for the
typography half of the visual system.

## Tokens

All theme tokens live in `src/styles.css`:

- `:root` defines the **light** values.
- `.dark` overrides them with the **dark** values.
- `@theme inline` re-exposes each `--<name>` as a Tailwind token (e.g. `--color-background`) so utilities like `bg-background`,
  `text-foreground`, and `border-border` resolve to the active theme automatically.

The light page background is **`oklch(0.95 0.012 250)`** — a cool off-white. Pure white was rejected because glass surfaces, color orbs, and
hairline borders disappear against it. The slight cool tilt (hue 250) keeps the page calm and pairs well with the deep navy used in dark
mode. Apply it via the `bg-background` utility — never hardcode the literal in components, so a future palette change is one CSS edit.

## Switching modes

Three modes are persisted in `localStorage` under the key `theme`:

| Stored value | Effect                                                           |
| ------------ | ---------------------------------------------------------------- |
| `auto`       | Follows `prefers-color-scheme`. Default for first-time visitors. |
| `light`      | Forces light, regardless of OS preference.                       |
| `dark`       | Forces dark, regardless of OS preference.                        |

The mode is applied in three places to avoid any flash-of-wrong-theme:

1. **Inline boot script** in `src/routes/__root.tsx` (`THEME_INIT_SCRIPT`) — runs synchronously before paint, reads `localStorage`, sets
   `<html class="dark">` / `<html class="light">`, sets `color-scheme`, and re-points the favicon links (see below).
2. **`ThemeSelector` component** in `src/web/components/ThemeSelector.tsx` — the user-facing toggle. Cycles `light → dark → auto` and
   re-applies the same DOM updates as the boot script.
3. **`prefers-color-scheme` listener** inside `ThemeSelector` — only active while `mode === 'auto'`, so OS theme changes propagate live.

The two scripts intentionally duplicate logic. They must stay in sync — when you change one, change the other. The boot script runs from the
inlined string before React hydrates; the component runs after.

## Favicon

The site ships **two favicons** so the icon is legible against either toolbar:

| File                      | Used for              |
| ------------------------- | --------------------- |
| `public/favicon.ico`      | Light browser chrome. |
| `public/favicon-dark.ico` | Dark browser chrome.  |

`src/routes/__root.tsx` declares both as `<link rel="icon">` tags, distinguished by:

- A `media` query (`(prefers-color-scheme: light)` / `(prefers-color-scheme: dark)`) so the browser picks the right one in `auto` mode using
  CSS alone.
- A `data-theme-icon="light"` / `data-theme-icon="dark"` hook so the boot script and `ThemeSelector` can find them and override the `media`
  attributes when the user manually picks a mode.

When the user picks **`light`** explicitly, the script sets `media="all"` on the light icon and `media="not all"` on the dark icon (and vice
versa for `dark`). In `auto`, both `media` attributes go back to their `prefers-color-scheme` values so the OS preference wins.

To swap either icon, replace the file in `public/`. Keep the names — they are referenced from `__root.tsx` and from `public/manifest.json`.

## Adding a new theme-aware asset

If a future asset needs a light/dark variant (logo, illustration, OG image), the recommended pattern depends on where it renders:

- **CSS-controlled image** — use Tailwind's `dark:` variant on `<img>` pairs (see the nav logo on `/visual-design`):
  ```tsx
  <img src="/logo-light.svg" className="dark:hidden" alt="" />
  <img src="/logo-dark.svg" className="hidden dark:block" alt="" />
  ```
- **Browser-managed asset** (favicons, OG images, app icons) — declare both in `<head>` with a `prefers-color-scheme` media query and, if it
  must follow the manual toggle, give it a `data-theme-icon` hook and extend `applyFaviconForMode` (or create a sibling helper) to flip the
  `media` attribute.
- **Single asset that should adapt itself** — prefer SVG with `currentColor` so it inherits `color: var(--foreground)` automatically.

## File locations

| Concern                               | File                                                 |
| ------------------------------------- | ---------------------------------------------------- |
| Light & dark token definitions        | `src/styles.css` (`:root`, `.dark`, `@theme inline`) |
| Inline pre-paint mode application     | `src/routes/__root.tsx` (`THEME_INIT_SCRIPT`)        |
| `<link rel="icon">` declarations      | `src/routes/__root.tsx` (`head().links`)             |
| User-facing toggle + manual switching | `src/web/components/ThemeSelector.tsx`               |
| Site-wide ambient backdrop            | `src/web/components/AmbientBackdrop.tsx`             |
| Shared frosted-glass surface          | `src/web/components/GlassCard.tsx`                   |
| `drift` keyframe                      | `src/styles.css`                                     |
| Favicons                              | `public/favicon.ico`, `public/favicon-dark.ico`      |
| Web app manifest                      | `public/manifest.json`                               |
| This doc                              | `docs/styles/theme.md`                               |

## Ambient backdrop

A blurred, slowly drifting color orb sits behind every page — the calm-glass look the rest of the surfaces are designed against. It's
mounted once in `src/routes/__root.tsx` so it spans the whole site rather than being re-instantiated per route. The component itself is
`src/web/components/AmbientBackdrop.tsx`; the `drift` keyframe lives in `src/styles.css`. Pages don't render their own backdrop — adding one
would double-up against the root layer.

The orb's size and offset are responsive: at the `sm` breakpoint and up it is sized as a percentage of viewport **width** (`55vw`,
positioned at `-20vw / -10vw`) so it scales gracefully with the desktop layout. Below `sm` — phones in portrait — that same `vw` math would
shrink the orb to a few hundred pixels and bury it in the corner, so the mobile sizing switches to viewport **height** for both size and
offset (`110vh`, positioned at `-50vh / -30vh`). Keeping the offset in the same unit as the size anchors the bright center to the top-left
corner the way it does on desktop, instead of letting the `vw`-scaled offset drag it toward the right on narrow viewports.

## Glass card

`GlassCard` (`src/web/components/GlassCard.tsx`) is the shared frosted-glass surface used by the floating header, the public landing-page
section grid (projects / blog / web tools / chat), and the workspace focus-area grid. It renders a translucent rounded container with a
saturated backdrop blur, a hairline border, a soft outer drop shadow, and a single-pixel sheen along the top edge that fakes the curvature
where light hits the glass. Both themes are tuned so the surface reads against the ambient backdrop without disappearing into it.

The component is presentational only — pass padding/layout via `className` and compose the body (header, content, etc.) inside it. For
positioning (e.g. the header's `sticky top-4`) the parent wraps the card; the card itself does not assume a position. When a new card-shaped
surface needs the same glass look, reach for `GlassCard` instead of styling a fresh container.
