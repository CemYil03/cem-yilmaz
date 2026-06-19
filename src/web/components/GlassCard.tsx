import type { ReactNode } from 'react';
import { cn } from '../utils/cn';

type Props = {
    /** Extra Tailwind classes — typically padding/layout for the card body. */
    className?: string;
    children: ReactNode;
};

/* ----------------------------------------------------------------------------
 * GlassCard — the shared frosted-glass surface used by the Header, the public
 * landing-page section grid, and the workspace focus-area grid.
 *
 * The look: a translucent rounded container with a saturated backdrop blur,
 * a hairline border, a soft outer drop, and a single-pixel "sheen" along the
 * top edge that fakes the curvature where light hits the glass. Both light
 * and dark themes are tuned so the surface reads against the ambient backdrop
 * (`AmbientBackdrop`) without disappearing into it.
 *
 * Pages compose the card body themselves — pass padding/layout via
 * `className`. The component renders only the surface, the sheen, and the
 * children, so it stays a pure visual primitive.
 *
 * For the floating header use case the parent positions the card with
 * `sticky top-4`; the card itself does not assume a position.
 * ------------------------------------------------------------------------- */

export function GlassCard({ className, children }: Props) {
    return (
        <div
            className={cn(
                'relative overflow-hidden rounded-2xl border border-white/55 bg-white/40 shadow-[0_1px_0_0_oklch(1_0_0/0.7)_inset,0_1px_2px_0_oklch(0_0_0/0.04),0_24px_60px_-30px_oklch(0.4_0.1_260/0.35)] backdrop-blur-2xl backdrop-saturate-150 dark:border-white/10 dark:bg-white/4 dark:shadow-[0_1px_0_0_oklch(1_0_0/0.08)_inset,0_24px_60px_-20px_oklch(0_0_0/0.6)]',
                className,
            )}
        >
            {/* top sheen — fakes the curvature where light hits the glass edge */}
            <div
                aria-hidden
                className="bg-linear-to-r pointer-events-none absolute inset-x-3 top-0 h-px from-transparent via-white/90 to-transparent dark:via-white/30"
            />
            {children}
        </div>
    );
}
