import type { Meta, StoryObj } from '@storybook/react-vite';
import { CheckIcon } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback, AvatarBadge, AvatarGroup, AvatarGroupCount } from './avatar';

const meta = {
    title: 'Base/Avatar',
    component: Avatar,
    argTypes: {
        size: {
            control: 'select',
            options: ['default', 'sm', 'lg'],
        },
    },
    args: {
        size: 'default',
    },
    tags: ['autodocs'],
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    render: (args) => (
        <Avatar {...args}>
            <AvatarImage src="https://github.com/shadcn.png" alt="User" />
            <AvatarFallback>CN</AvatarFallback>
        </Avatar>
    ),
};

export const WithFallback: Story = {
    render: (args) => (
        <Avatar {...args}>
            <AvatarImage src="/broken-image.jpg" alt="User" />
            <AvatarFallback>AB</AvatarFallback>
        </Avatar>
    ),
};

export const Small: Story = {
    args: { size: 'sm' },
    render: (args) => (
        <Avatar {...args}>
            <AvatarImage src="https://github.com/shadcn.png" alt="User" />
            <AvatarFallback>CN</AvatarFallback>
        </Avatar>
    ),
};

export const Large: Story = {
    args: { size: 'lg' },
    render: (args) => (
        <Avatar {...args}>
            <AvatarImage src="https://github.com/shadcn.png" alt="User" />
            <AvatarFallback>CN</AvatarFallback>
        </Avatar>
    ),
};

export const WithBadge: Story = {
    render: (args) => (
        <Avatar {...args}>
            <AvatarImage src="https://github.com/shadcn.png" alt="User" />
            <AvatarFallback>CN</AvatarFallback>
            <AvatarBadge>
                <CheckIcon />
            </AvatarBadge>
        </Avatar>
    ),
};

export const WithBadgeLarge: Story = {
    args: { size: 'lg' },
    render: (args) => (
        <Avatar {...args}>
            <AvatarImage src="https://github.com/shadcn.png" alt="User" />
            <AvatarFallback>CN</AvatarFallback>
            <AvatarBadge>
                <CheckIcon />
            </AvatarBadge>
        </Avatar>
    ),
};

export const Group: Story = {
    render: () => (
        <AvatarGroup>
            <Avatar>
                <AvatarImage src="https://github.com/shadcn.png" alt="User 1" />
                <AvatarFallback>U1</AvatarFallback>
            </Avatar>
            <Avatar>
                <AvatarFallback>U2</AvatarFallback>
            </Avatar>
            <Avatar>
                <AvatarFallback>U3</AvatarFallback>
            </Avatar>
            <AvatarGroupCount>+5</AvatarGroupCount>
        </AvatarGroup>
    ),
};

export const AllSizes: Story = {
    render: () => (
        <div className="flex items-center gap-4">
            <Avatar size="sm">
                <AvatarImage src="https://github.com/shadcn.png" alt="User" />
                <AvatarFallback>SM</AvatarFallback>
            </Avatar>
            <Avatar size="default">
                <AvatarImage src="https://github.com/shadcn.png" alt="User" />
                <AvatarFallback>MD</AvatarFallback>
            </Avatar>
            <Avatar size="lg">
                <AvatarImage src="https://github.com/shadcn.png" alt="User" />
                <AvatarFallback>LG</AvatarFallback>
            </Avatar>
        </div>
    ),
};
