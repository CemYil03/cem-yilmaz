import type { Meta, StoryObj } from '@storybook/react-vite';
import { AmbientBackdrop } from './AmbientBackdrop';
import { GlassCard } from './GlassCard';

// `AmbientBackdrop` is `fixed inset-0 -z-10` — in Storybook it lives behind
// the whole frame, which makes a tile-sized preview impossible without
// staging it inside its own positioned container. Each story renders the
// backdrop into a clipped frame so the orb is visible at preview size.

const meta = {
    title: 'Layout/AmbientBackdrop',
    component: AmbientBackdrop,
    parameters: {
        layout: 'fullscreen',
    },
    tags: ['autodocs'],
} satisfies Meta<typeof AmbientBackdrop>;

export default meta;
type Story = StoryObj<typeof meta>;

function Frame({ children, dark = false }: { children?: React.ReactNode; dark?: boolean }) {
    return (
        <div
            // `relative isolate` so the absolutely-positioned backdrop layers
            // are clipped to the frame rather than escaping into Storybook's
            // chrome. `bg-background` makes the orb visible against the
            // theme's neutral fill — without it the backdrop just paints onto
            // Storybook's grey body.
            className={`${dark ? 'dark' : ''} relative isolate min-h-[420px] w-full overflow-hidden bg-background`}
        >
            <AmbientBackdrop />
            <div className="relative z-10 grid min-h-[420px] place-items-center p-10">{children}</div>
        </div>
    );
}

export const Light: Story = {
    name: 'Light theme',
    render: () => (
        <Frame>
            <GlassCard className="w-[420px] px-6 py-5">
                <h3 className="text-lg font-semibold tracking-tight">Light backdrop</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                    The `--brand` orb drifts top-left. Cards layer above it; the colour ties focus rings, links and chart accents into one
                    visual system.
                </p>
            </GlassCard>
        </Frame>
    ),
};

export const Dark: Story = {
    name: 'Dark theme',
    render: () => (
        <Frame dark>
            <GlassCard className="w-[420px] px-6 py-5">
                <h3 className="text-lg font-semibold tracking-tight">Dark backdrop</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                    Same `--brand` orb, tuned for dark mode legibility against deep backgrounds.
                </p>
            </GlassCard>
        </Frame>
    ),
};

export const ReducedMotion: Story = {
    name: 'prefers-reduced-motion: reduce',
    parameters: {
        docs: {
            description: {
                story: 'The drift animation still applies — `AmbientBackdrop` does not gate the `drift` keyframe behind `motion-reduce:`. Surfaces that need the orb to stop animating for accessibility should add their own opt-out rule. Captured here so the regression is visible.',
            },
        },
    },
    render: () => (
        <Frame>
            {/* Forcing `motion-reduce` inside the frame just for the preview;
                doesn't affect the user's actual preference. */}
            <style>{`@media (prefers-reduced-motion: no-preference) { .preview-frame * { animation: none !important; } }`}</style>
            <div className="preview-frame">
                <GlassCard className="w-[420px] px-6 py-5">
                    <h3 className="text-lg font-semibold tracking-tight">Reduced motion preview</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Animation is suppressed inside this frame so the orb sits still — useful for checking the static colour at rest.
                    </p>
                </GlassCard>
            </div>
        </Frame>
    ),
};
