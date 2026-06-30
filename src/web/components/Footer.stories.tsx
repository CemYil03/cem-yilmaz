import type { Meta, StoryObj } from '@storybook/react-vite';
import { Footer } from './Footer';

const meta = {
    title: 'Layout/Footer',
    component: Footer,
    parameters: { layout: 'fullscreen' },
    decorators: [
        (Story) => (
            <div className="min-h-[80vh] w-full bg-background">
                {/* Spacer so the brand-tinted hairline accent at the top of
                    the footer reads against page content rather than against
                    the Storybook chrome. */}
                <div className="mx-auto max-w-6xl px-6 py-20 text-sm text-muted-foreground">
                    Imagine a landing page above. The footer below is the page's close: three columns on `md+`, copyright + legal links on
                    the bottom bar.
                </div>
                <Story />
            </div>
        ),
    ],
    tags: ['autodocs'],
} satisfies Meta<typeof Footer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
