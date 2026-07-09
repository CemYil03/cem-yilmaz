import { sankey, sankeyLinkHorizontal, sankeyLeft } from 'd3-sankey';
import { useMemo } from 'react';
import type { Locale } from '../utils/locale';

// Hand-rolled inline SVG Sankey for `/workspace/finances`. Same "no chart
// library" posture as the inventory sparkline — d3-sankey does only the
// layout math; every stroke, fill, and label is our SVG. Colors resolve via
// Tailwind semantic classes so light / dark themes both work without a
// per-mode branch. See `docs/features/workspace-finances.md`.

function formatCents(cents: number, locale: Locale): string {
    return new Intl.NumberFormat(locale === 'de' ? 'de-DE' : 'en-GB', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0,
    }).format(cents / 100);
}

type FinancesSankeyNodeKind = 'income' | 'category' | 'item';

export interface FinancesSankeyInputNode {
    id: string;
    kind: FinancesSankeyNodeKind;
    label: string;
    /** Free-form sublabel drawn below the main label (e.g. cadence). */
    sublabel?: string;
}

export interface FinancesSankeyInputLink {
    source: string;
    target: string;
    valueCents: number;
}

interface FinancesSankeyProps {
    nodes: readonly FinancesSankeyInputNode[];
    links: readonly FinancesSankeyInputLink[];
    locale: Locale;
    ariaLabel: string;
}

// `d3-sankey` mutates the objects it receives; we keep our public props
// read-only and copy into disposable node/link objects here.
interface LayoutNode extends FinancesSankeyInputNode {
    x0?: number;
    x1?: number;
    y0?: number;
    y1?: number;
    value?: number;
}
interface LayoutLink {
    source: string | LayoutNode;
    target: string | LayoutNode;
    value: number;
    width?: number;
    y0?: number;
    y1?: number;
}

const WIDTH = 960;
const HEIGHT = 480;
const NODE_WIDTH = 14;
const NODE_PADDING = 12;

const NODE_KIND_CLASSES: Record<FinancesSankeyNodeKind, string> = {
    income: 'fill-primary',
    category: 'fill-primary/70',
    item: 'fill-muted-foreground/60',
};

export function FinancesSankey({ nodes, links, locale, ariaLabel }: FinancesSankeyProps) {
    // Empty state — no active recurring costs. The route decides when to
    // render this component; the guard here is defence in depth so the
    // layout call never sees zero-node input.
    const hasData = nodes.length > 0 && links.length > 0;

    const layout = useMemo(() => {
        if (!hasData) return null;
        const layoutNodes: LayoutNode[] = nodes.map((node) => ({ ...node }));
        const layoutLinks: LayoutLink[] = links.map((link) => ({
            source: link.source,
            target: link.target,
            value: Math.max(link.valueCents, 1),
        }));

        const generator = sankey<LayoutNode, LayoutLink>()
            .nodeId((node) => node.id)
            .nodeAlign(sankeyLeft)
            .nodeWidth(NODE_WIDTH)
            .nodePadding(NODE_PADDING)
            .extent([
                [8, 8],
                [WIDTH - 8, HEIGHT - 8],
            ]);

        return generator({ nodes: layoutNodes, links: layoutLinks });
    }, [nodes, links, hasData]);

    if (!hasData || !layout) {
        return (
            <p className="text-sm text-muted-foreground">{{ de: 'Noch keine aktiven Ausgaben.', en: 'No active costs yet.' }[locale]}</p>
        );
    }

    const linkPath = sankeyLinkHorizontal<LayoutNode, LayoutLink>();

    return (
        <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            preserveAspectRatio="xMidYMid meet"
            className="w-full h-auto text-foreground"
            role="img"
            aria-label={ariaLabel}
        >
            <g>
                {layout.links.map((link, index) => {
                    const d = linkPath(link);
                    if (!d) return null;
                    return (
                        <path
                            key={`link-${index}`}
                            d={d}
                            className="fill-none stroke-primary/25 hover:stroke-primary/45 transition-colors"
                            strokeWidth={Math.max(link.width ?? 1, 1)}
                        >
                            <title>{formatCents(link.value, locale)}</title>
                        </path>
                    );
                })}
            </g>
            <g>
                {layout.nodes.map((node) => {
                    const x0 = node.x0 ?? 0;
                    const x1 = node.x1 ?? 0;
                    const y0 = node.y0 ?? 0;
                    const y1 = node.y1 ?? 0;
                    const width = x1 - x0;
                    const height = Math.max(y1 - y0, 1);
                    const labelOnRight = x0 < WIDTH / 2;
                    const labelX = labelOnRight ? x1 + 8 : x0 - 8;
                    const anchor: 'start' | 'end' = labelOnRight ? 'start' : 'end';
                    const midY = y0 + height / 2;
                    return (
                        <g key={`node-${node.id}`}>
                            <rect x={x0} y={y0} width={width} height={height} rx={2} className={NODE_KIND_CLASSES[node.kind]}>
                                <title>{`${node.label} — ${formatCents(node.value ?? 0, locale)}`}</title>
                            </rect>
                            <text
                                x={labelX}
                                y={midY - (node.sublabel ? 4 : 0)}
                                dy="0.32em"
                                textAnchor={anchor}
                                className="fill-foreground text-[11px] font-medium"
                            >
                                {node.label}
                            </text>
                            {node.sublabel ? (
                                <text
                                    x={labelX}
                                    y={midY + 10}
                                    dy="0.32em"
                                    textAnchor={anchor}
                                    className="fill-muted-foreground text-[10px]"
                                >
                                    {node.sublabel}
                                </text>
                            ) : null}
                        </g>
                    );
                })}
            </g>
        </svg>
    );
}
