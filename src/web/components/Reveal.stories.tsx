import type { Meta, StoryObj } from '@storybook/react-vite';
import { Reveal } from './Reveal';
import { GlassCard } from './GlassCard';

// `Reveal` triggers when its element scrolls into view. Stories include a
// tall spacer above each reveal so the user can actually scroll the
// transition rather than seeing the post-animation frame on mount.

const meta = {
    title: 'Motion/Reveal',
    component: Reveal,
    parameters: {
        layout: 'fullscreen',
    },
    args: { children: null },
    tags: ['autodocs'],
} satisfies Meta<typeof Reveal>;

export default meta;
type Story = StoryObj<typeof meta>;

function ScrollFrame({ children }: { children: React.ReactNode }) {
    return (
        <div className="mx-auto max-w-2xl px-6 py-10">
            <p className="text-sm text-muted-foreground">Scroll down to trigger the reveal animation.</p>
            <div className="h-[80vh]" />
            {children}
            <div className="h-[40vh]" />
        </div>
    );
}

export const Default: Story = {
    name: 'Default — fade + 8px lift',
    render: () => (
        <ScrollFrame>
            <Reveal>
                <GlassCard className="px-6 py-5">
                    <h3 className="text-lg font-semibold">Hello from the other side of the fold</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Fades in (opacity 0 → 1) and lifts 8px once the element crosses the threshold. The transition runs once.
                    </p>
                </GlassCard>
            </Reveal>
        </ScrollFrame>
    ),
};

export const Staggered: Story = {
    name: 'Staggered — index drives a 70ms delay (capped at 3)',
    render: () => (
        <ScrollFrame>
            <div className="grid gap-4">
                {[0, 1, 2, 3, 4, 5].map((index) => (
                    <Reveal key={index} index={index}>
                        <GlassCard className="px-5 py-4">
                            <p className="text-sm font-medium">Card {index + 1}</p>
                            <p className="text-xs text-muted-foreground">
                                Index {index}: delay {Math.min(index, 3) * 70}ms
                            </p>
                        </GlassCard>
                    </Reveal>
                ))}
            </div>
        </ScrollFrame>
    ),
};

export const AsList: Story = {
    name: 'as="li" — wraps as a list item',
    render: () => (
        <ScrollFrame>
            <ul className="grid gap-2">
                {['Apprenticeship', 'Master’s', 'Freelance'].map((label, index) => (
                    <Reveal key={label} as="li" index={index}>
                        <GlassCard className="px-5 py-4">
                            <p className="text-sm font-medium">{label}</p>
                        </GlassCard>
                    </Reveal>
                ))}
            </ul>
        </ScrollFrame>
    ),
};

export const ReducedMotion: Story = {
    name: 'prefers-reduced-motion: reduce',
    parameters: {
        docs: {
            description: {
                story: 'When the user prefers reduced motion, `useInView` short-circuits to `inView: true` on mount, the `motion-reduce:translate-y-0` class cancels the lift, and the transition is disabled. The element renders straight at its final state.',
            },
        },
    },
    render: () => (
        <div className="mx-auto max-w-2xl px-6 py-10">
            <p className="mb-4 text-sm text-muted-foreground">
                Toggle <code>prefers-reduced-motion</code> in your OS to see the difference; the wrapper renders without animation.
            </p>
            <Reveal>
                <GlassCard className="px-6 py-5">
                    <h3 className="text-lg font-semibold">Static reveal</h3>
                    <p className="mt-2 text-sm text-muted-foreground">No fade, no lift — straight to final state.</p>
                </GlassCard>
            </Reveal>
        </div>
    ),
};
