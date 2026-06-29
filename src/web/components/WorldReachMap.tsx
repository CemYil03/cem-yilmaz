import { cn } from '../utils/cn';

/* ----------------------------------------------------------------------------
 * WorldReachMap — stylised SVG world map used on the landing page to back the
 * time-zone-reach selling point. Three regions are highlighted (Germany, North
 * America, India) with pulsing markers; dashed great-circle-ish arcs connect
 * Berlin to each remote region so the eye reads "Cem is on the European side,
 * working with these other places".
 *
 * The continent shapes are intentionally low-fidelity silhouettes — the map
 * is decorative, not a cartographic surface. Coordinates are equirectangular
 * (x = (lng + 180) / 360 · 1000, y = (90 − lat) / 180 · 500). The viewBox is
 * 1000×500 so the same math drops a pin without per-component fudging.
 *
 * Theme awareness: paths use `currentColor` with low opacity so the map picks
 * up the foreground colour token. Markers use the primary token. Pulse and arc
 * dash animations honour `prefers-reduced-motion: reduce` (the keyframes live
 * in `src/styles.css`).
 * ------------------------------------------------------------------------- */

type Marker = {
    label: string;
    /** Latitude in degrees, north positive. */
    lat: number;
    /** Longitude in degrees, east positive. */
    lng: number;
    /** Whether this is the home anchor (Berlin) — rendered slightly larger. */
    anchor?: boolean;
};

type Props = {
    /** Accessible label describing the map's purpose. */
    title: string;
    markers: ReadonlyArray<Marker>;
    /** Indexes into `markers` for which the anchor draws a connecting arc. */
    arcsFromAnchorTo: ReadonlyArray<number>;
    className?: string;
};

const VIEW_WIDTH = 1000;
const VIEW_HEIGHT = 500;

function project(lat: number, lng: number): { x: number; y: number } {
    return {
        x: ((lng + 180) / 360) * VIEW_WIDTH,
        y: ((90 - lat) / 180) * VIEW_HEIGHT,
    };
}

// Hand-drawn simplified continent silhouettes. They are decorative — the goal
// is "looks like a world map at a glance" rather than geographic precision.
// Each path string sits in the 1000×500 equirectangular viewBox.
const CONTINENTS: ReadonlyArray<string> = [
    // North America
    'M 130 90 L 180 70 L 230 75 L 270 85 L 310 110 L 320 140 L 305 170 L 285 190 L 260 205 L 240 215 L 220 225 L 205 235 L 215 215 L 205 195 L 185 180 L 165 165 L 150 145 L 140 120 Z',
    // Central America
    'M 240 220 L 260 225 L 275 240 L 285 255 L 280 265 L 265 260 L 250 250 L 240 235 Z',
    // Greenland
    'M 330 55 L 360 50 L 380 65 L 375 90 L 360 105 L 340 100 L 330 80 Z',
    // South America
    'M 270 260 L 295 255 L 315 270 L 325 295 L 320 325 L 310 360 L 295 390 L 280 410 L 265 405 L 260 380 L 255 350 L 260 320 L 265 290 Z',
    // Africa
    'M 490 195 L 525 185 L 555 195 L 575 215 L 580 245 L 575 280 L 560 315 L 540 345 L 520 365 L 505 360 L 495 340 L 490 315 L 485 285 L 485 250 L 487 220 Z',
    // Europe
    'M 470 105 L 500 100 L 530 105 L 555 115 L 565 130 L 555 145 L 540 155 L 520 160 L 500 158 L 480 150 L 470 140 L 465 125 Z',
    // Middle East
    'M 555 165 L 585 165 L 610 180 L 615 200 L 600 215 L 575 215 L 555 200 L 550 180 Z',
    // Asia (mainland)
    'M 565 95 L 610 85 L 660 80 L 710 85 L 760 95 L 800 110 L 820 130 L 815 155 L 790 165 L 760 170 L 730 180 L 700 185 L 670 175 L 640 170 L 615 165 L 590 155 L 570 140 L 560 120 Z',
    // South-east Asia / Indian subcontinent
    'M 685 175 L 710 175 L 730 190 L 740 215 L 730 235 L 715 245 L 700 240 L 690 225 L 685 205 Z',
    // Indochina / Indonesia archipelago
    'M 760 220 L 790 215 L 820 220 L 840 235 L 850 255 L 830 265 L 810 260 L 790 250 L 770 240 Z',
    // Australia
    'M 815 305 L 855 300 L 890 310 L 905 330 L 895 350 L 870 360 L 840 355 L 820 340 L 810 325 Z',
    // New Zealand
    'M 925 365 L 940 360 L 945 375 L 935 385 L 925 380 Z',
    // UK / Ireland
    'M 462 115 L 475 110 L 478 125 L 470 135 L 460 130 Z',
    // Scandinavia
    'M 520 75 L 545 70 L 555 85 L 545 100 L 525 95 Z',
    // Japan
    'M 855 130 L 870 125 L 880 140 L 875 155 L 865 160 L 855 150 Z',
];

export function WorldReachMap({ title, markers, arcsFromAnchorTo, className }: Props) {
    const anchorIndex = markers.findIndex((m) => m.anchor);
    const anchor = anchorIndex >= 0 ? markers[anchorIndex] : null;
    const anchorPoint = anchor ? project(anchor.lat, anchor.lng) : null;

    return (
        <svg
            viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
            role="img"
            aria-label={title}
            className={cn('h-auto w-full text-foreground/55', className)}
            preserveAspectRatio="xMidYMid meet"
        >
            <title>{title}</title>

            {/* Continent silhouettes — a single translucent fill so the markers
             *  and arcs can dominate the visual hierarchy. */}
            <g fill="currentColor" fillOpacity={0.18} stroke="currentColor" strokeOpacity={0.25} strokeWidth={0.5}>
                {CONTINENTS.map((d, i) => (
                    <path key={i} d={d} />
                ))}
            </g>

            {/* Connecting arcs from the anchor (Berlin) to each highlighted
             *  remote region. Quadratic curves with a control point lifted
             *  toward the top of the canvas read as great-circle paths at a
             *  glance without bringing in a proper projection library. */}
            {anchorPoint &&
                arcsFromAnchorTo.map((targetIdx) => {
                    const target = markers[targetIdx];
                    if (!target) return null;
                    const targetPoint = project(target.lat, target.lng);
                    const midX = (anchorPoint.x + targetPoint.x) / 2;
                    const midY = (anchorPoint.y + targetPoint.y) / 2;
                    // Arc lift: ~25% of the horizontal distance, capped, so
                    // long arcs don't sail off the top of the canvas.
                    const lift = Math.min(110, Math.abs(targetPoint.x - anchorPoint.x) * 0.25);
                    const controlY = Math.max(20, midY - lift);
                    const d = `M ${anchorPoint.x} ${anchorPoint.y} Q ${midX} ${controlY} ${targetPoint.x} ${targetPoint.y}`;
                    return (
                        <path
                            key={target.label}
                            d={d}
                            fill="none"
                            stroke="var(--primary)"
                            strokeOpacity={0.55}
                            strokeWidth={1.5}
                            strokeDasharray="4 5"
                            strokeLinecap="round"
                            className="animate-world-reach-arc motion-reduce:animate-none"
                        />
                    );
                })}

            {/* Region markers — a soft outer halo (pulsing) plus a solid dot.
             *  The anchor (Berlin) gets the same treatment at a slightly
             *  larger size so the home pin reads as the origin without
             *  shouting at the viewer. */}
            {markers.map((m) => {
                const { x, y } = project(m.lat, m.lng);
                const haloR = m.anchor ? 14 : 11;
                const dotR = m.anchor ? 4.5 : 3.5;
                return (
                    <g key={m.label}>
                        <circle
                            cx={x}
                            cy={y}
                            r={haloR}
                            fill="var(--primary)"
                            fillOpacity={0.18}
                            className="animate-world-reach-halo motion-reduce:animate-none"
                        />
                        <circle cx={x} cy={y} r={dotR} fill="var(--primary)" />
                    </g>
                );
            })}
        </svg>
    );
}
