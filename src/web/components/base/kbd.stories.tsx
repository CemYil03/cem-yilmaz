import type { Meta, StoryObj } from '@storybook/react-vite';
import { Kbd, KbdGroup } from './kbd';

const meta = {
    title: 'Base/Kbd',
    component: Kbd,
    args: {
        children: '⌘',
    },
    tags: ['autodocs'],
} satisfies Meta<typeof Kbd>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const SingleKey: Story = {
    args: { children: 'K' },
};

export const ModifierKey: Story = {
    args: { children: '⌘K' },
};

export const Group: Story = {
    render: () => (
        <KbdGroup>
            <Kbd>⌘</Kbd>
            <Kbd>K</Kbd>
        </KbdGroup>
    ),
};

export const CommonShortcuts: Story = {
    render: () => (
        <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
                <span className="text-sm">Copy</span>
                <KbdGroup>
                    <Kbd>⌘</Kbd>
                    <Kbd>C</Kbd>
                </KbdGroup>
            </div>
            <div className="flex items-center gap-2">
                <span className="text-sm">Paste</span>
                <KbdGroup>
                    <Kbd>⌘</Kbd>
                    <Kbd>V</Kbd>
                </KbdGroup>
            </div>
            <div className="flex items-center gap-2">
                <span className="text-sm">Save</span>
                <KbdGroup>
                    <Kbd>⌘</Kbd>
                    <Kbd>S</Kbd>
                </KbdGroup>
            </div>
            <div className="flex items-center gap-2">
                <span className="text-sm">Search</span>
                <KbdGroup>
                    <Kbd>⌘</Kbd>
                    <Kbd>K</Kbd>
                </KbdGroup>
            </div>
        </div>
    ),
};

export const WithCustomClass: Story = {
    args: {
        children: 'Esc',
        className: 'text-sm',
    },
};
