# Motion

Motion on this site is held to the same five-word bar as every other visual choice: **professional, clean, minimalistic, trustworthy,
tasteful**. If a movement does not earn its place against that bar, remove it. See [theme.md](./theme.md) for the palette half of the visual
system and [fonts.md](./fonts.md) for the typography half.

The site is small, calm, and meant to read as considered. A page that twitches with parallax, particles, or scroll-jacked storytelling
betrays that intent before the visitor has read a single sentence. The rules below exist to keep that from happening.

## The one principle

**Motion answers a question the user is already asking.** When a user scrolls, they're asking "what's next?" — reveal it. When they hover a
CTA, they're asking "is this real?" — confirm it. When they submit a question, they're asking "did it hear me?" — acknowledge it. Anything
else is decoration, and decoration does not ship.

Before adding any animation, name the question it answers. If you cannot name one, the answer is no animation.

## Guardrails

These are the quantitative rules. Treat them as hard limits, not suggestions.

| Concern        | Allowed                                                                   | Forbidden                               |
| -------------- | ------------------------------------------------------------------------- | --------------------------------------- |
| Duration       | 150–500ms                                                                 | < 150ms (jittery) or > 500ms (sluggish) |
| Easing         | `ease-out`, or `cubic-bezier(0.2, 0.8, 0.2, 1)` (out-quint)               | `ease-in`, bounces, springs, elastic    |
| Transform axes | `opacity` and small `translate` (≤ 8px) and small `translate-x` (≤ 4px)   | `scale` > 1.02, `rotate`, `skew`        |
| Loops          | Slow ambient breathing (≥ 2s, opacity-only or imperceptible translate)    | Pulsing colors, throbbing scales        |
| Trigger        | User-initiated (hover, focus, click) or natural (scroll into view, mount) | Auto-cycling carousels, attention-pulls |

Anything not on the "allowed" side needs an explicit reason in a PR description before it lands.

## Anti-patterns

The list below names things that are tempting but wrong for this site. They are not allowed without an explicit conversation:

- **Typewriter headlines.** Delay the value proposition for the sake of a parlour trick. Reads as amateur on a consulting site.
- **Mouse-follow / spotlight / gradient cursor.** Reads as "I just learned this library."
- **Animated counters** ("5+ years experience" climbing on scroll). The number being animated is more important than the animation.
- **Floating particles, mesh gradients, animated noise, canvas backdrops.** The `AmbientBackdrop` orb is the one decorative motion the site
  has earned. Don't layer more.
- **Section-pinning / scroll-jacked storytelling.** Hostile to scanners — and portfolio visitors come to _scan_.
- **`whileInView` on paragraphs.** Animating prose mid-reveal makes it harder to read. Animate the container, not each `<p>`.
- **Scale or fade on the hero portrait, logo, or any avatar.** The face is a trust anchor; the moment it animates it stops being one.

## Interaction feedback (hover, focus, pressed)

A button without a pressed state feels dead on mobile — the visitor taps and gets nothing in return until the page transitions. Every
interactive element must answer "did you hear me?" the moment it is engaged. The bar:

- **`hover:`** is for desktop affordance — "this is real, you can click it." Used on color/background, not on transform.
- **`focus-visible:`** is for keyboard users — never strip the ring. Baseline on `Button` is
  `focus-visible:ring-[3px] focus-visible:ring-ring/50` (destructive variants use a destructive-tinted ring).
- **`active:`** is for the tap itself — the moment of contact. **Every clickable element ships with one.** Without it, mobile users tap and
  see nothing change until the page navigates, and the UI reads as broken. Use a slightly darker shade than `hover:` (e.g.
  `hover:bg-primary/90` paired with `active:bg-primary/80`).
- **`aria-current="page"`** marks the active nav item. Pair it with a distinct background so the visitor can see where they are.

The base `Button` primitive in `src/web/components/base/button.tsx` ships these states for every variant — use it instead of styling raw
`<a>` or `<button>` tags. When a link must point somewhere external or to a TanStack `<Link>`, use `<Button asChild>` so the button styling
(including the pressed state) is inherited by the child element.

Touch targets follow the same one principle as the rest of the site: comfortable, not cramped. **Minimum 36px** (`size-9` / `py-2.5 px-4`)
for any element a finger taps. **44px** (`size-10` / `py-3 px-5`) for the primary, repeated, or thumb-zone targets (header icons, mobile
CTAs). Inline text links inside flowing prose are exempt — they ride the line-height of the paragraph.

## `prefers-reduced-motion: reduce`

**Non-negotiable.** The user's OS-level preference is honoured at every layer. Concretely:

- The shared `useInView` hook (`src/web/hooks/useInView.ts`) short-circuits to `inView = true` on mount when the media query matches, so
  observed elements render at their final state with no transition involvement.
- The shared `Reveal` component (`src/web/components/Reveal.tsx`) uses `motion-reduce:transition-none` (and zeros the out-state translate)
  so reduced-motion users see the final opacity/position immediately — there is **no** leftover opacity fade.
- Keyframe animations in `src/styles.css` are paused inside `@media (prefers-reduced-motion: reduce)` blocks (more than one block may exist
  — e.g. todo-specific animations). Every new `@keyframes` entry must be covered by a reduced-motion rule when introduced.
- One-off hover transforms (e.g. landing `NavCard`'s arrow translate — a local helper in `index.tsx`, not a shared primitive) suppress
  themselves with `motion-reduce:group-hover:translate-x-0` or equivalent.

The site must work as a still page. Test by enabling "Reduce motion" in your OS and walking through the landing page — nothing should
animate, nothing should feel broken.

## Composer states

The `MessageComposer` (`src/web/components/MessageComposer.tsx`) holds the same five-word bar as the rest of the site — no continuous loops,
no decorative sweeps. Each state answers one question:

| State       | User's question                    | Visual                                                                                                                                                                |
| ----------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Focus**   | "Am I in the right field?"         | Brand-tinted static ring on the wrapper (`focus-within:border-brand`, `ring-brand/30`). Uses `--brand` so the composer ties into the ambient orb, links, and chart-1. |
| **Ready**   | "Did it notice I typed something?" | Send button lifts `−1px` and fades from muted to full opacity (`enabled:-translate-y-px`, 200 ms). Stops the moment the draft is empty again.                         |
| **Sending** | "Did it hear me?"                  | `SendIcon` crossfades to a `Spinner` (150 ms) inside the Send button.                                                                                                 |
| **Sent**    | "Did it land?"                     | `CheckIcon` flashes in the Send button slot for 700 ms after the busy → idle edge, then the icon stack reverts to `SendIcon`.                                         |

Everything beyond these four states — rotating borders, sweeping highlights, particle effects, gradient cursors, animated placeholders — is
decoration. Don't add it without writing the question it answers into the PR description first, the same bar as anywhere else on the site.

## The shared primitives

Before writing a new motion, check whether one of these already covers it:

| Primitive                   | Location                                    | Use when                                                                                                                                                                                                                                                                                                                                                              |
| --------------------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useInView`                 | `src/web/hooks/useInView.ts`                | You need to detect first scroll-in for a single element                                                                                                                                                                                                                                                                                                               |
| `Reveal`                    | `src/web/components/Reveal.tsx`             | You need a section or grid child to fade and lift into view                                                                                                                                                                                                                                                                                                           |
| `animate-pulse-dot`         | `src/styles.css` (`@keyframes`)             | A liveness indicator (e.g. "available now" dot)                                                                                                                                                                                                                                                                                                                       |
| `animate-portrait-halo`     | `src/styles.css` (`@keyframes`)             | A blurred decorative shape that should breathe slowly behind content                                                                                                                                                                                                                                                                                                  |
| `animate-chat-button-pulse` | `src/styles.css` (`@keyframes`)             | One-shot ring pulse (1.2 s, single breath) when an overlay closes and the trigger button needs to draw the eye — "your conversation went there." Driven by a monotonic `highlightSignal` counter on the chat providers; the consumer (`HeaderChatButton` for both visitor and workspace variants) toggles the class for the animation window.                         |
| Radix dialog / popover      | `src/web/components/base/*`                 | Open / close transitions — use the stock fade + zoom-in, don't layer more                                                                                                                                                                                                                                                                                             |
| Thoughts disclosure         | `src/web/components/AssistantReasoning.tsx` | User expand/collapse of Gemini thought summaries — height (`grid-template-rows` 0fr↔1fr) + chevron rotate, 200 ms `ease-out`. No opacity fade (collapse blanked the text while the row was still open). Answers "where did that go / where is it coming from?" Live-driven open/close stays instant (no fight with stick-to-bottom). `motion-reduce:transition-none`. |

Compose these before reaching for a dependency. No animation library has been added to the project (`tw-animate-css` provides the Radix
data-attribute transitions; that's the floor, not a starting kit). If you find yourself wanting Framer Motion, gesture handling, or layout
animation, write the case in the PR description first.

## How to add a new motion

1. **Name the question.** Write one line in the PR description: "When the user does X, they're asking Y. This motion confirms Y." If you
   can't, stop.
2. **Pick the cheapest primitive.** Tailwind transition utilities beat a custom keyframe. A keyframe beats a JS animation. A JS animation
   beats a library.
3. **Stay inside the guardrails table.** If the motion needs scale, bounce, or duration outside 150–500ms, the answer is almost always to
   simplify rather than to expand the guardrails.
4. **Wire reduced-motion at the layer you're working in** — hook-level, component-level, or `@media` block. Test it by toggling the OS
   setting.
5. **Document where it lives.** Page-specific motion goes into the feature doc (e.g. `docs/features/portfolio-landing.md` has a "Motion"
   subsection). Reusable primitives go into the table above.

## File locations

| Concern                                | File                                            |
| -------------------------------------- | ----------------------------------------------- |
| Reveal component                       | `src/web/components/Reveal.tsx`                 |
| Intersection-observer hook             | `src/web/hooks/useInView.ts`                    |
| Keyframes + reduced-motion media query | `src/styles.css` (bottom of file)               |
| Ambient backdrop orb (slow drift)      | `src/web/components/AmbientBackdrop.tsx`        |
| Landing-page motion specifics          | `docs/features/portfolio-landing.md` (Motion §) |
| This doc                               | `docs/styles/motion.md`                         |
