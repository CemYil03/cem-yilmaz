import type { Meta, StoryObj } from '@storybook/react-vite';
import { SettingsIcon, BellIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger, PopoverHeader, PopoverTitle, PopoverDescription } from './popover';
import { Button } from './button';

const meta = {
    title: 'Base/Popover',
    component: Popover,
    tags: ['autodocs'],
} satisfies Meta<typeof Popover>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    render: () => (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="outline">Open Popover</Button>
            </PopoverTrigger>
            <PopoverContent>
                <p className="text-sm">This is a basic popover with some content inside.</p>
            </PopoverContent>
        </Popover>
    ),
};

export const WithHeader: Story = {
    render: () => (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="outline">
                    <SettingsIcon /> Settings
                </Button>
            </PopoverTrigger>
            <PopoverContent>
                <PopoverHeader>
                    <PopoverTitle>Dimensions</PopoverTitle>
                    <PopoverDescription>Set the dimensions for the layer.</PopoverDescription>
                </PopoverHeader>
                <div className="mt-4 grid gap-2">
                    <div className="grid grid-cols-3 items-center gap-4">
                        <label className="text-sm font-medium">Width</label>
                        <input className="col-span-2 h-8 rounded-md border px-3 text-sm" defaultValue="100%" />
                    </div>
                    <div className="grid grid-cols-3 items-center gap-4">
                        <label className="text-sm font-medium">Height</label>
                        <input className="col-span-2 h-8 rounded-md border px-3 text-sm" defaultValue="25px" />
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    ),
};

export const AlignStart: Story = {
    render: () => (
        <div className="flex justify-center">
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="outline">Align Start</Button>
                </PopoverTrigger>
                <PopoverContent align="start">
                    <p className="text-sm">Content aligned to the start of the trigger.</p>
                </PopoverContent>
            </Popover>
        </div>
    ),
};

export const AlignEnd: Story = {
    render: () => (
        <div className="flex justify-center">
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="outline">Align End</Button>
                </PopoverTrigger>
                <PopoverContent align="end">
                    <p className="text-sm">Content aligned to the end of the trigger.</p>
                </PopoverContent>
            </Popover>
        </div>
    ),
};

export const CustomWidth: Story = {
    render: () => (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="secondary">
                    <BellIcon /> Notifications
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-96">
                <PopoverHeader>
                    <PopoverTitle>Notifications</PopoverTitle>
                    <PopoverDescription>You have 3 unread messages.</PopoverDescription>
                </PopoverHeader>
                <div className="mt-4 space-y-2">
                    <div className="rounded-md border p-2 text-sm">New comment on your post</div>
                    <div className="rounded-md border p-2 text-sm">Someone mentioned you</div>
                    <div className="rounded-md border p-2 text-sm">Your build completed</div>
                </div>
            </PopoverContent>
        </Popover>
    ),
};

export const DefaultOpen: Story = {
    render: () => (
        <Popover defaultOpen>
            <PopoverTrigger asChild>
                <Button variant="outline">Already Open</Button>
            </PopoverTrigger>
            <PopoverContent>
                <p className="text-sm">This popover is open by default.</p>
            </PopoverContent>
        </Popover>
    ),
};
