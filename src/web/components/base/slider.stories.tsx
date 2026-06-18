import type { Meta, StoryObj } from '@storybook/react-vite';
import { Slider } from './slider';

const meta = {
    title: 'Base/Slider',
    component: Slider,
    argTypes: {
        min: { control: 'number' },
        max: { control: 'number' },
        step: { control: 'number' },
        disabled: { control: 'boolean' },
        orientation: { control: 'select', options: ['horizontal', 'vertical'] },
    },
    args: {
        min: 0,
        max: 100,
        defaultValue: [50],
    },
    tags: ['autodocs'],
} satisfies Meta<typeof Slider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Range: Story = {
    args: { defaultValue: [25, 75] },
};

export const WithStep: Story = {
    args: { defaultValue: [50], step: 10 },
};

export const Disabled: Story = {
    args: { defaultValue: [50], disabled: true },
};

export const Vertical: Story = {
    args: { defaultValue: [50], orientation: 'vertical' },
    decorators: [(Story) => <div className="h-48">{Story()}</div>],
};

export const CustomRange: Story = {
    args: { min: 0, max: 10, defaultValue: [3], step: 1 },
};

export const WithLabel: Story = {
    render: () => (
        <div className="flex w-64 flex-col gap-2">
            <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Volume</label>
                <span className="text-muted-foreground text-sm">75%</span>
            </div>
            <Slider defaultValue={[75]} />
        </div>
    ),
};
