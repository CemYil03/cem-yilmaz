import type { Meta, StoryObj } from '@storybook/react-vite';
import { MailIcon, Loader2Icon, ChevronRightIcon } from 'lucide-react';
import { Button } from './button';

const meta = {
    title: 'Base/Button',
    component: Button,
    argTypes: {
        variant: {
            control: 'select',
            options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
        },
        size: {
            control: 'select',
            options: ['default', 'xs', 'sm', 'lg', 'icon', 'icon-xs', 'icon-sm', 'icon-lg'],
        },
        disabled: { control: 'boolean' },
        asChild: { table: { disable: true } },
    },
    args: {
        children: 'Button',
        variant: 'default',
        size: 'default',
    },
    tags: ['autodocs'],
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Destructive: Story = {
    args: { variant: 'destructive', children: 'Delete' },
};

export const Outline: Story = {
    args: { variant: 'outline', children: 'Outline' },
};

export const Secondary: Story = {
    args: { variant: 'secondary', children: 'Secondary' },
};

export const Ghost: Story = {
    args: { variant: 'ghost', children: 'Ghost' },
};

export const Link: Story = {
    args: { variant: 'link', children: 'Link' },
};

export const Small: Story = {
    args: { size: 'sm', children: 'Small' },
};

export const Large: Story = {
    args: { size: 'lg', children: 'Large' },
};

export const ExtraSmall: Story = {
    args: { size: 'xs', children: 'XS' },
};

export const WithIcon: Story = {
    args: {
        children: (
            <>
                <MailIcon /> Login with Email
            </>
        ),
    },
};

export const IconOnly: Story = {
    args: {
        size: 'icon',
        'aria-label': 'Next',
        children: <ChevronRightIcon />,
    },
};

export const Loading: Story = {
    args: {
        disabled: true,
        children: (
            <>
                <Loader2Icon className="animate-spin" /> Please wait
            </>
        ),
    },
};

export const Disabled: Story = {
    args: { disabled: true },
};

export const AllVariants: Story = {
    render: () => (
        <div className="flex flex-wrap items-center gap-4">
            <Button variant="default">Default</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="link">Link</Button>
        </div>
    ),
};

export const AllSizes: Story = {
    render: () => (
        <div className="flex flex-wrap items-center gap-4">
            <Button size="xs">Extra Small</Button>
            <Button size="sm">Small</Button>
            <Button size="default">Default</Button>
            <Button size="lg">Large</Button>
            <Button size="icon" aria-label="Icon">
                <MailIcon />
            </Button>
            <Button size="icon-xs" aria-label="Icon XS">
                <MailIcon />
            </Button>
            <Button size="icon-sm" aria-label="Icon SM">
                <MailIcon />
            </Button>
            <Button size="icon-lg" aria-label="Icon LG">
                <MailIcon />
            </Button>
        </div>
    ),
};
