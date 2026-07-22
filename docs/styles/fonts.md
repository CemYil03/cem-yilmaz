# Fonts

The site uses **two self-hosted variable fonts**, picked to feel professional, clean, minimalistic, trustworthy, and tasteful at the same
time:

| Role                       | Family                 | CSS variable     | Tailwind utility                  |
| -------------------------- | ---------------------- | ---------------- | --------------------------------- |
| Headlines / display        | **Plus Jakarta Sans**  | `--font-heading` | `font-display`                    |
| Body / UI / long-form copy | **Inter**              | `--font-body`    | `font-sans` (the project default) |
| Code / mono                | System monospace stack | `--font-mono`    | `font-mono`                       |

Plus Jakarta carries the personality at large sizes; Inter does the heavy lifting for prose and UI chrome where readability matters most.
Every page on the site picks them up automatically — no per-page wiring needed.

## Why these two

Several pairings were auditioned historically (Inter alone, DM Sans × Inter, Manrope × Inter, Plus Jakarta × Inter, Manrope × DM Sans) using
a temporary font toggle on a since-removed audition page. The toggle is gone now that the pair is settled — see
[How to audition new pairings](#how-to-audition-new-pairings) for how to trial alternatives again.

Plus Jakarta × Inter won because:

- **Plus Jakarta Sans** is measured and balanced as a display face — geometric without feeling cold, distinct without shouting. It reads as
  considered at headline sizes (32px and up).
- **Inter** is the de-facto body font of modern product UI. It's tuned for screens, has excellent metrics at small sizes, and never draws
  attention away from the words.
- The two share enough proportion that switching between a heading and the paragraph below feels continuous, not jarring.

## How they're loaded

Both families are bundled via `@fontsource-variable/*`:

```css
/* src/styles.css */
@import '@fontsource-variable/inter/index.css';
@import '@fontsource-variable/plus-jakarta-sans/index.css';
```

This matters:

- **No external request.** Fonts ship with the Vite bundle, served from our own origin. The browser does not need to talk to
  `fonts.googleapis.com` before painting text.
- **No first-render flash.** Because the font CSS is part of `styles.css`, the browser knows the family before the first paint. There is no
  FOUT (flash of unstyled text) followed by a layout shift when the webfont swaps in.
- **Variable fonts.** A single file covers every weight from 400 to 700, so changing weight does not download another asset.
- **Self-hosting also avoids the GDPR ambiguity** around Google Fonts being a hot legal topic in Germany — see
  [docs/architecture/discovery-seo.md](../architecture/discovery-seo.md) and the privacy notice (Datenschutz) page.

## How to use them

The two variables are exposed both as Tailwind tokens (recommended) and as raw CSS variables.

### From Tailwind (preferred)

```tsx
<h1 className="font-display text-5xl font-semibold tracking-tight">Headline</h1>
<p className="font-sans text-base leading-relaxed">Body copy.</p>
```

`font-sans` is already the project's default — `<body>` sets it via `@layer base` in `styles.css`. You only need to write `font-sans`
explicitly when overriding a parent that pinned a different family.

`font-display` is the heading utility. For convenience the base layer also assigns `--font-heading` to every `<h1>`–`<h6>` automatically, so
a plain `<h1>` already renders in Plus Jakarta. Add `font-display` only when the heading is _not_ an `<h*>` element (e.g. a `<div>` styled
like a title) and you still want the display face.

### From raw CSS

```css
.my-component {
  font-family: var(--font-body);
}

.my-component h2 {
  font-family: var(--font-heading);
}
```

### Rules of thumb

- **Use `<h1>`–`<h6>` semantically.** They get `--font-heading` for free.
- **Use `font-display` on non-heading elements styled as titles** — pull-quotes, hero numbers, callouts.
- **Don't pin `font-sans` on body copy by default.** It cascades from `<body>`. Only override when undoing a parent.
- **Avoid inline `style={{ fontFamily: ... }}`.** Reach for the CSS variable or Tailwind utility instead so a future swap is one CSS change.

## File locations

| Concern                  | File                                                                 |
| ------------------------ | -------------------------------------------------------------------- |
| Bundled font imports     | `src/styles.css` (top of file, `@import '@fontsource-variable/...'`) |
| CSS variable definitions | `src/styles.css` → `:root` block                                     |
| Tailwind theme tokens    | `src/styles.css` → `@theme inline` block                             |
| Default cascade          | `src/styles.css` → `@layer base { body, h1..h6 }`                    |
| This doc                 | `docs/styles/fonts.md`                                               |

## How to add a font

If a future page needs an additional family (a serif callout, a mono variant, a third display face), the steps are:

1. **Install the bundled package** — prefer `@fontsource-variable/<name>` over the regular `@fontsource/<name>` so we keep variable axes and
   a single download per family.
   ```bash
   npm install --save @fontsource-variable/<family-name>
   ```
2. **Import the CSS at the top of `src/styles.css`** alongside the existing imports.
3. **If the family will be used in more than one place**, add a CSS variable in `:root` (e.g. `--font-quote`) and a Tailwind theme token in
   `@theme inline` (e.g. `--font-quote: var(--font-quote);` → `font-quote` utility).
4. **Update this doc.** Add a row to the table at the top, explain the role, and update the file-locations table if anything moved.

If a font is only being trialled (not yet adopted), do **not** add it to `styles.css`. Trial on a throwaway branch or a local-only route so
non-adopted families stay out of the production bundle.

## How to audition new pairings

There is no dedicated `/visual-design` route anymore (the pairing is settled). To trial alternatives:

1. On a throwaway branch, add a small local toggle (or temporary chips on an existing page) that swaps `--font-heading` / `--font-body` on a
   wrapper.
2. If the trialled families are not bundled, pull them from Google Fonts via a `<link rel="stylesheet">` on that trial surface only — do not
   add a non-adopted family to `src/styles.css`.
3. Judge against a full marketing-style layout (landing page is enough).

If a pairing wins, follow [How to add a font](#how-to-add-a-font) to bundle it and remove the trial toggle so the production bundle stays
small.
