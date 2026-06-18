import type { Meta, StoryObj } from '@storybook/react-vite';
import { Switch } from './switch';

const meta = {
    title: 'Base/Switch',
    component: Switch,
    argTypes: {
        size: {
            control: 'select',
            options: ['default', 'sm'],
        },
        checked: { control: 'boolean' },
        disabled: { control: 'boolean' },
    },
    args: {
        size: 'default',
    },
    tags: ['autodocs'],
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Checked: Story = {
    args: { defaultChecked: true },
};

export const Small: Story = {
    args: { size: 'sm' },
};

export const SmallChecked: Story = {
    args: { size: 'sm', defaultChecked: true },
};

export const Disabled: Story = {
    args: { disabled: true },
};

export const DisabledChecked: Story = {
    args: { disabled: true, defaultChecked: true },
};

export const WithLabel: Story = {
    render: (args) => (
        <div className="flex items-center gap-2">
            <Switch id="airplane-mode" {...args} />
            <label htmlFor="airplane-mode" className="text-sm font-medium">
                Airplane Mode
            </label>
        </div>
    ),
};

export const AllVariants: Story = {
    render: () => (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
                <Switch />
                <Switch defaultChecked />
                <Switch disabled />
                <Switch disabled defaultChecked />
            </div>
            <div className="flex items-center gap-4">
                <Switch size="sm" />
                <Switch size="sm" defaultChecked />
                <Switch size="sm" disabled />
                <Switch size="sm" disabled defaultChecked />
            </div>
        </div>
    ),
};
