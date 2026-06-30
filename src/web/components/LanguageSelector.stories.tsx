import type { Meta, StoryObj } from '@storybook/react-vite';
import { LanguageSelector } from './LanguageSelector';

// `LanguageSelector` is a self-contained pill button that reads the current
// locale from the router and toggles between DE and EN. The story preview
// router (mounted in `.storybook/preview.tsx`) only carries a `/` route, so
// the button shows the DE → EN affordance in its default state. To preview
// the EN state, navigate to an `initialEntries: ['/en']` history (left as
// a known limitation — the preview router doesn't expose that hook yet).

const meta = {
    title: 'Header/LanguageSelector',
    component: LanguageSelector,
    parameters: { layout: 'centered' },
    tags: ['autodocs'],
} satisfies Meta<typeof LanguageSelector>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const InsideHeaderCluster: Story = {
    name: 'Inside a header cluster — sized to match its siblings',
    render: () => (
        <div className="flex items-center gap-2 rounded-full border border-foreground/10 bg-white/40 p-1 backdrop-blur-md dark:bg-white/4">
            <LanguageSelector />
        </div>
    ),
};
