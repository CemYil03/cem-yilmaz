import type { Meta, StoryObj } from '@storybook/react-vite';
import { Textarea } from './textarea';

const meta = {
    title: 'Base/Textarea',
    component: Textarea,
    argTypes: {
        placeholder: { control: 'text' },
        disabled: { control: 'boolean' },
        rows: { control: 'number' },
    },
    args: {
        placeholder: 'Type your message here.',
    },
    tags: ['autodocs'],
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithValue: Story = {
    args: { defaultValue: 'This is some example text in the textarea.' },
};

export const Disabled: Story = {
    args: { disabled: true, defaultValue: 'Disabled textarea content' },
};

export const Invalid: Story = {
    args: { 'aria-invalid': true, defaultValue: 'Invalid input' },
};

export const WithRows: Story = {
    args: { rows: 6, placeholder: 'Textarea with explicit rows' },
};

export const AllStates: Story = {
    render: () => (
        <div className="flex flex-col gap-4 max-w-sm">
            <Textarea placeholder="Default" />
            <Textarea placeholder="Disabled" disabled />
            <Textarea placeholder="Invalid" aria-invalid />
        </div>
    ),
};
