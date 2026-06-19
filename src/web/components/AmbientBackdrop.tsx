/**
 * AmbientBackdrop — the soft animated color orb that lives behind every page.
 *
 * Mounted once in the root layout (`src/routes/__root.tsx`) so it spans the
 * whole site rather than being repeated per route. The fixed positioning and
 * `-z-10` keep it behind all content while staying anchored to the viewport
 * during scroll. The orb itself is a blurred radial gradient that drifts on
 * the `drift` keyframe defined in `src/styles.css`.
 *
 * The size and offset are tuned in viewport-width units, which makes the orb
 * shrink on narrow screens. Below the `sm` breakpoint the orb is sized and
 * positioned in `vh` instead so it stays prominent on portrait phones and
 * the bright center lands in the top-left corner — matching where it sits
 * on desktop. The desktop visual is preserved at `sm` and up.
 *
 * See docs/styles/theme.md for the visual rationale.
 */
export function AmbientBackdrop() {
    return (
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
            <div className="animate-[drift_22s_ease-in-out_infinite] absolute left-[-50vh] top-[-30vh] size-[110vh] rounded-full bg-[radial-gradient(closest-side,oklch(0.7_0.22_250/0.55),transparent_70%)] blur-3xl will-change-transform sm:left-[-20vw] sm:top-[-10vw] sm:size-[55vw]" />
        </div>
    );
}
