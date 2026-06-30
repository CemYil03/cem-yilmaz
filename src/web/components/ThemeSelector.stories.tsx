import type { Meta, StoryObj } from '@storybook/react-vite';
import { ThemeSelector } from './ThemeSelector';

// Three-state toggle: light → dark → auto → light. Each click rotates the
// icon (SunIcon → MoonIcon → SunMoonIcon) and writes the choice to
// `localStorage`. The story is interactive — click it to see the rotation.

const meta = {
    title: 'Header/ThemeSelector',
    component: ThemeSelector,
    parameters: { layout: 'centered' },
    tags: ['autodocs'],
} satisfies Meta<typeof ThemeSelector>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    parameters: {
        docs: {
            description: {
                story: 'Initial render reads `localStorage` (defaults to `auto`). Click to cycle modes — the document `<html>` class flips, so the rest of the preview pane will switch themes along with the button.',
            },
        },
    },
};
