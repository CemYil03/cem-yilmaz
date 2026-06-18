import type { Meta, StoryObj } from '@storybook/react-vite';
import { Skeleton } from './skeleton';

const meta = {
    title: 'Base/Skeleton',
    component: Skeleton,
    tags: ['autodocs'],
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: { className: 'h-4 w-48' },
};

export const Circle: Story = {
    args: { className: 'h-12 w-12 rounded-full' },
};

export const Card: Story = {
    render: () => (
        <div className="flex items-center space-x-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-36" />
            </div>
        </div>
    ),
};

export const TextBlock: Story = {
    render: () => (
        <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
        </div>
    ),
};
