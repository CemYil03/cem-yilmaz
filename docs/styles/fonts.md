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

Several pairings were auditioned on `/visual-design` (Inter alone, DM Sans × Inter, Manrope × Inter, Plus Jakarta × Inter, Manrope × DM
Sans) using a temporary font toggle on that page. The toggle has been removed now that the pair is settled — see
[How to audition new pairings](#how-to-audition-new-pairings) for how to bring it back.

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
- **Avoid inline `style={{ fontFamily: ... }}`** outside of `/visual-design` (where it powers the experiment toggle). Reach for the CSS
  variable or Tailwind utility instead so a future swap is one CSS change.

## File locations

| Concern                  | File                                                                 |
| ------------------------ | -------------------------------------------------------------------- |
| Bundled font imports     | `src/styles.css` (top of file, `@import '@fontsource-variable/...'`) |
| CSS variable definitions | `src/styles.css` → `:root` block                                     |
| Tailwind theme tokens    | `src/styles.css` → `@theme inline` block                             |
| Default cascade          | `src/styles.css` → `@layer base { body, h1..h6 }`                    |
| Experiment / toggle page | `src/routes/{-$locale}/visual-design.tsx`                            |
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

If a font is only being trialled (not yet adopted), don't add it to `styles.css`. Add it to the `/visual-design` toggle instead, where it
stays out of the production bundle.

## How to audition new pairings

`/visual-design` is the page used to test typography against a full marketing-style layout. The font toggle that originally lived there has
been removed (the pair is settled), but the page is the right place to bring one back when you want to trial alternatives.

To trial a new pairing:

1. Add a `useState` for a preset id and a small `FONT_PRESETS` array (heading + body family per preset) to `visual-design.tsx`.
2. Render a row of buttons that swap two CSS variables (`--font-heading`, `--font-body`) on the page wrapper.
3. If the trialled families are not bundled, pull them from Google Fonts via a `<link rel="stylesheet">` _on this page only_ — do not add a
   non-adopted family to `src/styles.css`.
4. Open `/visual-design`, click through the chips, and judge against the rest of the layout.

If a pairing wins, follow [How to add a font](#how-to-add-a-font) to bundle it and remove the toggle again so the production bundle stays
small.
