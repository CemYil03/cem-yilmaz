import type { ReactNode } from 'react';
import { useInView } from '../hooks/useInView';
import { cn } from '../utils/cn';

type Props = {
    children: ReactNode;
    /** Stagger index inside a sibling group (e.g. a grid of cards). Each
     *  step delays the reveal by 70ms, capped at 3 steps so a long list
     *  never feels like it's "loading row by row". */
    index?: number;
    /** Override the default block-level wrapper (e.g. for `<li>`). */
    as?: 'div' | 'section' | 'li';
    className?: string;
};

/* ----------------------------------------------------------------------------
 * Reveal — fades the wrapper in (opacity 0 → 1) and lifts it 8px once it
 * scrolls into view. The transition runs once and is disabled entirely for
 * users with `prefers-reduced-motion: reduce` (the underlying hook starts
 * `inView` as `true`, so the element renders at its final state with no
 * transition involvement).
 *
 * The motion is intentionally restrained — the design doc calls for
 * trustworthy, minimalistic feel. No bounces, no scale, no large translate.
 * ------------------------------------------------------------------------- */

const STAGGER_STEP_MS = 70;
const STAGGER_MAX_STEPS = 3;

export function Reveal({ children, index = 0, as: Tag = 'div', className }: Props) {
    const { ref, inView } = useInView<HTMLDivElement>();
    const step = Math.min(Math.max(index, 0), STAGGER_MAX_STEPS);
    const delayMs = step * STAGGER_STEP_MS;

    return (
        <Tag
            // Casting ref because `as` is constrained to the three element
            // tags whose instances are all HTMLDivElement-shaped enough for
            // IntersectionObserver — no behavioural difference at runtime.
            ref={ref as never}
            data-state={inView ? 'in' : 'out'}
            style={{ transitionDelay: `${delayMs}ms` }}
            className={cn(
                'transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none',
                'data-[state=out]:opacity-0 data-[state=out]:translate-y-2 motion-reduce:data-[state=out]:translate-y-0',
                'data-[state=in]:opacity-100 data-[state=in]:translate-y-0',
                className,
            )}
        >
            {children}
        </Tag>
    );
}
