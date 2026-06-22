import { useEffect, useRef, useState } from 'react';

/* ----------------------------------------------------------------------------
 * useInView — flips `inView` to `true` the first time the observed element
 * crosses the configured intersection threshold, then disconnects. Used by
 * `Reveal` to trigger scroll-in animations on the landing page.
 *
 * Once-only is deliberate: the landing page should not re-animate sections
 * when the user scrolls back up. That would draw the eye away from whatever
 * they came back to read.
 *
 * `prefers-reduced-motion: reduce` short-circuits the observer entirely —
 * the element starts in the "in" state on mount so consumers render the
 * final visual without any transform.
 * ------------------------------------------------------------------------- */

export function useInView<T extends Element>(options?: { threshold?: number; rootMargin?: string }) {
    const ref = useRef<T | null>(null);
    const [inView, setInView] = useState(false);

    useEffect(() => {
        // SSR-safe: bail if we somehow run without a window. Also short-
        // circuit when the user has asked for reduced motion — the animation
        // never plays, so there is nothing to observe.
        if (typeof window === 'undefined') return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            setInView(true);
            return;
        }

        const element = ref.current;
        if (!element) return;

        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        setInView(true);
                        observer.disconnect();
                        return;
                    }
                }
            },
            {
                threshold: options?.threshold ?? 0.15,
                rootMargin: options?.rootMargin ?? '0px 0px -40px 0px',
            },
        );

        observer.observe(element);
        return () => observer.disconnect();
    }, [options?.threshold, options?.rootMargin]);

    return { ref, inView };
}
