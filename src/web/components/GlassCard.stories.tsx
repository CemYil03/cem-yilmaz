import type { Meta, StoryObj } from '@storybook/react-vite';
import { GlassCard } from './GlassCard';
import { AmbientBackdrop } from './AmbientBackdrop';
import { Button } from './base/button';

const meta = {
    title: 'Layout/GlassCard',
    component: GlassCard,
    parameters: {
        layout: 'centered',
    },
    args: { children: null },
    tags: ['autodocs'],
} satisfies Meta<typeof GlassCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        className: 'w-[420px] px-6 py-5',
        children: (
            <div>
                <h3 className="text-lg font-semibold tracking-tight">Frosted glass surface</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                    The shared card primitive used by the header, the landing page section grid, and the workspace focus-area grid.
                </p>
            </div>
        ),
    },
};

export const Compact: Story = {
    args: {
        className: 'w-[280px] px-4 py-3',
        children: <p className="text-sm font-medium">Compact card · used in chips and trail items</p>,
    },
};

export const Wide: Story = {
    args: {
        className: 'w-[640px] px-8 py-7',
        children: (
            <div className="flex items-start justify-between gap-6">
                <div>
                    <h3 className="text-lg font-semibold tracking-tight">Wide card</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Used by the landing page selling-point rows.</p>
                </div>
                <Button size="sm">Action</Button>
            </div>
        ),
    },
};

// The whole point of the card is the way it reads on top of `AmbientBackdrop` —
// pin them together so the saturation tweak and the top sheen are visible.
export const OnAmbientBackdrop: Story = {
    name: 'On AmbientBackdrop (recommended pairing)',
    render: () => (
        <div className="relative h-[360px] w-[640px] overflow-hidden rounded-3xl">
            <AmbientBackdrop />
            <div className="relative z-10 grid h-full place-items-center p-6">
                <GlassCard className="w-full px-6 py-5">
                    <h3 className="text-lg font-semibold tracking-tight">On top of the brand orb</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Light and dark themes are both tuned so the surface reads against the ambient backdrop without disappearing.
                    </p>
                </GlassCard>
            </div>
        </div>
    ),
};

export const Grid: Story = {
    name: 'Grid — focus-area layout',
    render: () => (
        <div className="grid w-[720px] grid-cols-3 gap-4 p-6">
            {Array.from({ length: 6 }).map((_, index) => (
                <GlassCard key={index} className="px-5 py-4">
                    <h4 className="text-sm font-semibold">Tile {index + 1}</h4>
                    <p className="mt-1 text-xs text-muted-foreground">Six identical cards demonstrating how the surface tiles.</p>
                </GlassCard>
            ))}
        </div>
    ),
};
