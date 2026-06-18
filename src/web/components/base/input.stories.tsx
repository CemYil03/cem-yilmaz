import type { Meta, StoryObj } from '@storybook/react-vite';
import { MailIcon, SearchIcon } from 'lucide-react';
import { Input } from './input';

const meta = {
    title: 'Base/Input',
    component: Input,
    argTypes: {
        type: {
            control: 'select',
            options: ['text', 'email', 'password', 'number', 'search', 'tel', 'url', 'file'],
        },
        placeholder: { control: 'text' },
        disabled: { control: 'boolean' },
    },
    args: {
        placeholder: 'Enter text...',
        type: 'text',
    },
    tags: ['autodocs'],
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Email: Story = {
    args: { type: 'email', placeholder: 'you@example.com' },
};

export const Password: Story = {
    args: { type: 'password', placeholder: 'Enter password' },
};

export const Number: Story = {
    args: { type: 'number', placeholder: '0' },
};

export const SearchType: Story = {
    args: { type: 'search', placeholder: 'Search...' },
};

export const File: Story = {
    args: { type: 'file' },
};

export const Disabled: Story = {
    args: { disabled: true, placeholder: 'Disabled input' },
};

export const Invalid: Story = {
    args: { 'aria-invalid': true, defaultValue: 'Invalid value' },
};

export const WithIcon: Story = {
    render: () => (
        <div className="relative">
            <MailIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input className="pl-9" placeholder="you@example.com" />
        </div>
    ),
};

export const WithSearchIcon: Story = {
    render: () => (
        <div className="relative">
            <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input className="pl-9" type="search" placeholder="Search..." />
        </div>
    ),
};

export const AllTypes: Story = {
    render: () => (
        <div className="flex w-80 flex-col gap-4">
            <Input type="text" placeholder="Text" />
            <Input type="email" placeholder="Email" />
            <Input type="password" placeholder="Password" />
            <Input type="number" placeholder="Number" />
            <Input type="search" placeholder="Search" />
            <Input type="tel" placeholder="Phone" />
            <Input type="url" placeholder="URL" />
            <Input type="file" />
        </div>
    ),
};
