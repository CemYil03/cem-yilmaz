import type { Meta, StoryObj } from '@storybook/react-vite';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from './select';

const meta = {
    title: 'Base/Select',
    component: Select,
    tags: ['autodocs'],
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    render: () => (
        <Select>
            <SelectTrigger className="w-48">
                <SelectValue placeholder="Select a fruit" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="apple">Apple</SelectItem>
                <SelectItem value="banana">Banana</SelectItem>
                <SelectItem value="cherry">Cherry</SelectItem>
                <SelectItem value="grape">Grape</SelectItem>
            </SelectContent>
        </Select>
    ),
};

export const WithGroups: Story = {
    render: () => (
        <Select>
            <SelectTrigger className="w-48">
                <SelectValue placeholder="Select a food" />
            </SelectTrigger>
            <SelectContent>
                <SelectGroup>
                    <SelectLabel>Fruits</SelectLabel>
                    <SelectItem value="apple">Apple</SelectItem>
                    <SelectItem value="banana">Banana</SelectItem>
                    <SelectItem value="cherry">Cherry</SelectItem>
                </SelectGroup>
                <SelectSeparator />
                <SelectGroup>
                    <SelectLabel>Vegetables</SelectLabel>
                    <SelectItem value="carrot">Carrot</SelectItem>
                    <SelectItem value="broccoli">Broccoli</SelectItem>
                    <SelectItem value="spinach">Spinach</SelectItem>
                </SelectGroup>
            </SelectContent>
        </Select>
    ),
};

export const Small: Story = {
    render: () => (
        <Select>
            <SelectTrigger size="sm" className="w-48">
                <SelectValue placeholder="Small trigger" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="one">Option One</SelectItem>
                <SelectItem value="two">Option Two</SelectItem>
                <SelectItem value="three">Option Three</SelectItem>
            </SelectContent>
        </Select>
    ),
};

export const WithDefaultValue: Story = {
    render: () => (
        <Select defaultValue="banana">
            <SelectTrigger className="w-48">
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="apple">Apple</SelectItem>
                <SelectItem value="banana">Banana</SelectItem>
                <SelectItem value="cherry">Cherry</SelectItem>
            </SelectContent>
        </Select>
    ),
};

export const Disabled: Story = {
    render: () => (
        <Select disabled>
            <SelectTrigger className="w-48">
                <SelectValue placeholder="Disabled" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="apple">Apple</SelectItem>
                <SelectItem value="banana">Banana</SelectItem>
            </SelectContent>
        </Select>
    ),
};

export const DisabledItems: Story = {
    render: () => (
        <Select>
            <SelectTrigger className="w-48">
                <SelectValue placeholder="Some disabled" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="apple">Apple</SelectItem>
                <SelectItem value="banana" disabled>
                    Banana (sold out)
                </SelectItem>
                <SelectItem value="cherry">Cherry</SelectItem>
                <SelectItem value="grape" disabled>
                    Grape (sold out)
                </SelectItem>
            </SelectContent>
        </Select>
    ),
};

export const AllSizes: Story = {
    render: () => (
        <div className="flex flex-wrap items-center gap-4">
            <Select>
                <SelectTrigger size="sm" className="w-48">
                    <SelectValue placeholder="Small" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="a">Option A</SelectItem>
                    <SelectItem value="b">Option B</SelectItem>
                </SelectContent>
            </Select>
            <Select>
                <SelectTrigger size="default" className="w-48">
                    <SelectValue placeholder="Default" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="a">Option A</SelectItem>
                    <SelectItem value="b">Option B</SelectItem>
                </SelectContent>
            </Select>
        </div>
    ),
};
