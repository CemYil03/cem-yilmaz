import { useEffect, useState } from 'react';

// Live `window.visualViewport` metrics. The visual viewport is the part of the
// page actually visible to the user — it shrinks when iOS Safari's soft
// keyboard appears, while the layout viewport (what `100vh` and `inset-y-0`
// resolve against) does not. Sheets and other overlays that need to sit
// inside the visible area on mobile drive their height/top from this.
//
// Returns `null` during SSR and on the very first render — callers should
// fall back to their default (typically `100vh`/`top: 0`) until the first
// client effect runs.

export interface VisualViewportMetrics {
    height: number;
    offsetTop: number;
}

export function useVisualViewport(): VisualViewportMetrics | null {
    const [metrics, setMetrics] = useState<VisualViewportMetrics | null>(null);

    useEffect(() => {
        const vv = typeof window !== 'undefined' ? window.visualViewport : null;
        if (!vv) {
            // Older browsers without VisualViewport — fall back to the layout
            // viewport. The keyboard fix won't apply, but the overlay still
            // sizes correctly.
            setMetrics({ height: window.innerHeight, offsetTop: 0 });
            return;
        }
        const read = () => setMetrics({ height: vv.height, offsetTop: vv.offsetTop });
        read();
        vv.addEventListener('resize', read);
        vv.addEventListener('scroll', read);
        return () => {
            vv.removeEventListener('resize', read);
            vv.removeEventListener('scroll', read);
        };
    }, []);

    return metrics;
}
