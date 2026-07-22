# Theme

The site has **two themes** — light and dark — plus an `auto` mode that follows the operating system. Both themes share the same set of
design tokens declared as CSS custom properties; switching theme just rebinds those properties. See [fonts.md](./fonts.md) for the
typography half of the visual system.

The visual goal is **professional, clean, minimalistic, trustworthy, tasteful**. Every choice on this page should be measured against those
five words: if a token, surface, or accent does not earn its place against that bar, simplify it.

## Tokens

All theme tokens live in `src/styles.css`:

- `:root` defines the **light** values.
- `.dark` overrides them with the **dark** values.
- `@theme inline` re-exposes each `--<name>` as a Tailwind token (e.g. `--color-background`, `--color-background-alt`, `--color-brand`) so
  utilities like `bg-background`, `bg-background-alt`, `bg-brand`, `text-brand`, `text-foreground`, and `border-border` resolve to the
  active theme automatically.

Two principles to keep the palette small:

1. **Hue stays at 250.** Every cool-leaning token — backgrounds, brand, selection, the ambient orb, `chart-1` — sits on hue 250. One hue
   keeps the page calm; varying lightness and chroma is what creates separation. Don't introduce a second cool hue without a deliberate
   reason.
2. **Lightness encodes elevation.** Page is darkest, alt section is one step deeper (because cards and the orb are what we want to stand
   out, not the page). Cards are a step lighter than the page, popovers a step lighter than cards. Don't reach for shadows when a lightness
   step would do the job.

### Surface stack

The page uses four surface lightness stops in each theme. Use the lowest layer that still reads:

| Token              | Light                   | Dark                     | Used for                                                             |
| ------------------ | ----------------------- | ------------------------ | -------------------------------------------------------------------- |
| `--background`     | `oklch(0.95 0.012 250)` | `oklch(0.141 0.005 285)` | Page base — the canvas behind everything                             |
| `--background-alt` | `oklch(0.92 0.014 250)` | `oklch(0.18 0.008 285)`  | Alternating landing-page sections, marketing rhythm                  |
| `--card`           | `oklch(0.99 0.004 250)` | `oklch(0.20 0.008 285)`  | Default elevated surface — `GlassCard`, focus-area cards, list items |
| `--popover`        | `oklch(1 0 0)`          | `oklch(0.235 0.008 285)` | Floating overlays — popovers, dropdowns, command menus               |

Each step is roughly one perceptual stop, so a popover on a card on an alt section on the page reads as four distinct planes without any
borders or shadows doing the work. The light card is **not** pure white because pure white kills the cool tilt that the page leans on.

Apply tokens via the Tailwind utilities (`bg-background`, `bg-background-alt`, `bg-card`, `bg-popover`) — never hardcode the OKLCH literal
in a component, so a future palette tweak is one CSS edit.

### Foreground & muted

| Token                | Light                    | Dark                     | Notes                                      |
| -------------------- | ------------------------ | ------------------------ | ------------------------------------------ |
| `--foreground`       | `oklch(0.141 0.005 285)` | `oklch(0.985 0 0)`       | Body copy, headings                        |
| `--muted-foreground` | `oklch(0.48 0.012 250)`  | `oklch(0.705 0.015 286)` | Subtitles, helper text, secondary metadata |
| `--border`           | `oklch(0.92 0.004 286)`  | `oklch(0.274 0.006 286)` | Hairline dividers, card outlines           |

Muted text in light was tightened from the shadcn default (`L 0.552`) to `L 0.48` so 14 px subtitles still clear WCAG AA against `--card`.
The cool 250 hue also picks up the page tilt instead of fighting it.

### Brand

A single hue ties the ambient orb, focus rings, primary CTAs, links, and `chart-1` together. There is one brand colour for the whole site;
it just lifts in dark mode so it reads off the near-black canvas.

| Token                | Light                  | Dark                   | Used for                                                              |
| -------------------- | ---------------------- | ---------------------- | --------------------------------------------------------------------- |
| `--brand`            | `oklch(0.62 0.18 250)` | `oklch(0.72 0.20 250)` | Focus rings, primary CTA fill, links, `chart-1`, ambient backdrop orb |
| `--brand-foreground` | `oklch(0.99 0 0)`      | `oklch(0.10 0 0)`      | Text/icons rendered on top of `--brand` (e.g. inside the Send button) |

Usage rules:

- **Sparingly.** Brand is for moments where the user's attention is the whole point — the primary CTA in a section, the active focus ring, a
  link inside body copy. A page covered in brand colour stops being branded; it becomes loud.
- **One hue, two themes.** The light and dark values share hue 250 — never fork the brand into a different colour for dark mode.
- **The orb is the brand at low opacity.** `AmbientBackdrop` references `var(--brand)` directly; do not introduce a parallel "ambient" hue.
- **Charts default to the brand.** `--chart-1` is the same hue. Multi-series charts walk away from it through the existing `--chart-2..5`
  stops; don't add a new chart hue without checking it works in both themes.

### Selection

`::selection` uses a brand-tinted highlight so dragging across copy feels like part of the visual system, not a default browser blue. The
foreground swap keeps selected text legible in both themes.

| Token                    | Light                  | Dark                   | Notes                       |
| ------------------------ | ---------------------- | ---------------------- | --------------------------- |
| `--selection`            | `oklch(0.85 0.10 250)` | `oklch(0.40 0.14 250)` | Background of selected text |
| `--selection-foreground` | `oklch(0.20 0.01 250)` | `oklch(0.99 0 0)`      | Text colour while selected  |

The single rule that wires it up lives in `@layer base` in `src/styles.css`:

```css
::selection {
  background-color: var(--selection);
  color: var(--selection-foreground);
}
```

The same rule serves both themes because the tokens flip under `.dark`. Add element-scoped `::selection` only if a specific surface needs a
deviation (e.g. selecting code inside a syntax-highlighted block) — and document the deviation here.

### Accessibility notes

Contrast was checked at the most strained pairings — light has tighter ratios than dark because the canvas is closer to its foreground:

| Pair (light)                                  | Ratio  | Verdict                                  |
| --------------------------------------------- | ------ | ---------------------------------------- |
| `--foreground` on `--background`              | ~17:1  | WCAG AAA                                 |
| `--foreground` on `--card`                    | ~18:1  | WCAG AAA                                 |
| `--muted-foreground` on `--card`              | ~6.0:1 | WCAG AA for any size, AAA for ≥18 px     |
| `--brand` on `--background` (link text)       | ~4.7:1 | WCAG AA for ≥16 px — fine for body links |
| `--brand-foreground` on `--brand` (CTA label) | ~4.6:1 | WCAG AA for ≥16 px                       |
| `--selection-foreground` on `--selection`     | ~10:1  | Comfortably legible while skimming       |

Dark-mode pairs all clear AAA at the same positions. If you change a token, re-check it here — a lightness shift of `0.05` is enough to drop
a pair below AA. The numbers above are illustrative; verify with a contrast checker (e.g. [oklch.com](https://oklch.com)) when adjusting
tokens.

### When to reach for `--background-alt`

The landing page uses alternating section backgrounds to give a long scroll some rhythm without resorting to dividers. Apply
`bg-background-alt` to every other top-level section on the public landing page; leave the rest on `bg-background` (the cascaded default).
The step is intentionally subtle — three perceptual stops from the page — so the cards still feel elevated against either surface.

Don't use `bg-background-alt` inside a card or popover; cards already sit above the page on the elevation stack and a banded background
inside one would re-introduce the visual noise the alt token exists to avoid.

The light page background is **`oklch(0.95 0.012 250)`** — a cool off-white. Pure white was rejected because glass surfaces, color orbs, and
hairline borders disappear against it. The slight cool tilt (hue 250) keeps the page calm and pairs well with the deep navy used in dark
mode.

## Scrollbar gutter (no layout shift)

Chrome classic-scrollbar mode (and “Always show scrollbars” on macOS) grows/shrinks the viewport width when a vertical scrollbar appears or
disappears. That shows up as a left–right jump when:

- a tab switch changes whether the page overflows, or
- a dialog / sheet locks body scroll and removes the bar.

Two root rules keep the layout still — both are required:

| Rule                          | Where                                      | Why                                                                                                                                                                                                                                                                                                                          |
| ----------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scrollbar-gutter: stable`    | `html` in `src/styles.css` (`@layer base`) | Reserves the scrollbar column on the viewport even when content is short, and keeps the lane while Radix scroll-lock sets `overflow: hidden`.                                                                                                                                                                                |
| `overflow-x-clip` on `<body>` | `src/routes/__root.tsx`                    | Clips horizontal bleed without creating a scroll container. `overflow-x: hidden` would force `overflow-y` to `auto`, making `<body>` the scrollport — sticky headers break and the scrollbar toggles on the wrong element. Same reason public pages use `overflow-x-clip` on their page wrappers (see `Header` sticky note). |

Do not “fix” the shift by forcing `overflow-y: scroll` forever — that always paints a disabled track. Do not put `overflow-x-hidden` on
`<body>` or on sticky ancestors. Nested scroll surfaces (chat transcripts) still opt into their own `scrollbar-gutter: stable`; that is
independent of the document gutter — see [chat.md](./chat.md).

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

- **CSS-controlled image** — use Tailwind's `dark:` variant on `<img>` pairs (e.g. light/dark logos in the site header):
  ```tsx
  <img src="/logo-light.svg" className="dark:hidden" alt="" />
  <img src="/logo-dark.svg" className="hidden dark:block" alt="" />
  ```
- **Browser-managed asset** (favicons, OG images, app icons) — declare both in `<head>` with a `prefers-color-scheme` media query and, if it
  must follow the manual toggle, give it a `data-theme-icon` hook and extend `applyFaviconForMode` (or create a sibling helper) to flip the
  `media` attribute.
- **Single asset that should adapt itself** — prefer SVG with `currentColor` so it inherits `color: var(--foreground)` automatically.

## File locations

| Concern                               | File                                                    |
| ------------------------------------- | ------------------------------------------------------- |
| Light & dark token definitions        | `src/styles.css` (`:root`, `.dark`, `@theme inline`)    |
| Document scrollbar gutter             | `src/styles.css` (`html { scrollbar-gutter: stable }`)  |
| Body overflow (clip, not hidden)      | `src/routes/__root.tsx` (`overflow-x-clip` on `<body>`) |
| Inline pre-paint mode application     | `src/routes/__root.tsx` (`THEME_INIT_SCRIPT`)           |
| `<link rel="icon">` declarations      | `src/routes/__root.tsx` (`head().links`)                |
| User-facing toggle + manual switching | `src/web/components/ThemeSelector.tsx`                  |
| Site-wide ambient backdrop            | `src/web/components/AmbientBackdrop.tsx`                |
| Shared frosted-glass surface          | `src/web/components/GlassCard.tsx`                      |
| `drift` keyframe                      | `src/styles.css`                                        |
| Favicons                              | `public/favicon.ico`, `public/favicon-dark.ico`         |
| Web app manifest                      | `public/manifest.json`                                  |
| This doc                              | `docs/styles/theme.md`                                  |

## Ambient backdrop

A blurred, slowly drifting color orb sits behind every page — the calm-glass look the rest of the surfaces are designed against. It's
mounted once in `src/routes/__root.tsx` so it spans the whole site rather than being re-instantiated per route. The component itself is
`src/web/components/AmbientBackdrop.tsx`; the `drift` keyframe lives in `src/styles.css`. Pages don't render their own backdrop — adding one
would double-up against the root layer.

**The orb's colour is `var(--brand)`** at low opacity, so the ambient hue, focus rings, links, and `chart-1` all share a single source of
truth. If you want to retune the brand, change the `--brand` token — the orb follows.

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
