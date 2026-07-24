import type { Meta, StoryObj } from '@storybook/react-vite';
import { cn } from '../utils/cn';
import { NavigationProgress } from './NavigationProgress';

// `NavigationProgress` reads from `useRouterState` directly — it can't be
// driven from stories without a real navigation. The "Live" story mounts
// the component as-is (idle, because the preview router never fetches).
// The other stories paint static replicas of the three phases so the
// growth curve and the completion fade are visible at preview size.

const meta = {
    title: 'Layout/NavigationProgress',
    component: NavigationProgress,
    parameters: { layout: 'fullscreen' },
    tags: ['autodocs'],
} satisfies Meta<typeof NavigationProgress>;

export default meta;
type Story = StoryObj<typeof meta>;

function StaticBar({ phase }: { phase: 'idle' | 'loading' | 'completing' }) {
    if (phase === 'idle') {
        return (
            <div className="flex h-16 items-center justify-center text-xs text-muted-foreground">
                Idle — the bar is unmounted entirely; the route is stable.
            </div>
        );
    }
    return (
        <div className="relative h-16">
            <div className="absolute inset-x-0 top-0 h-0.5 overflow-hidden">
                <div
                    className={cn(
                        'bg-primary h-full origin-left',
                        phase === 'loading' && 'animate-[nav-progress-grow_8s_ease-out_forwards]',
                        phase === 'completing' && 'scale-x-100 opacity-0 transition-[transform,opacity] duration-200',
                    )}
                />
            </div>
            <p className="pt-3 text-center text-xs text-muted-foreground">
                {phase === 'loading'
                    ? 'Loading — the bar grows out toward the right edge.'
                    : 'Completing — fills to 100% and fades out over 200ms.'}
            </p>
        </div>
    );
}

export const Live: Story = {
    name: 'Live — mounted at idle (no navigation to drive it)',
    render: () => (
        <div className="relative h-32 w-full bg-background">
            <NavigationProgress />
            <p className="p-6 text-sm text-muted-foreground">
                Production usage: mounted once in the root layout, fires on every TanStack-Router navigation.
            </p>
        </div>
    ),
};

export const Idle: Story = { name: 'Idle (static)', render: () => <StaticBar phase="idle" /> };
export const Loading: Story = { name: 'Loading (static replica)', render: () => <StaticBar phase="loading" /> };
export const Completing: Story = { name: 'Completing (static replica)', render: () => <StaticBar phase="completing" /> };
