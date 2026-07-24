import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { DatePicker } from './date-picker';

const meta = {
    title: 'Base/DatePicker',
    component: DatePicker,
    tags: ['autodocs'],
    args: {
        placeholder: 'Pick a date',
    },
} satisfies Meta<typeof DatePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    render: function Render(args) {
        const [date, setDate] = useState<Date | undefined>();
        return <DatePicker {...args} value={date} onValueChange={setDate} />;
    },
};

export const WithInitialValue: Story = {
    render: function Render(args) {
        const [date, setDate] = useState<Date | undefined>(new Date());
        return <DatePicker {...args} value={date} onValueChange={setDate} />;
    },
};

export const CustomPlaceholder: Story = {
    args: {
        placeholder: 'Select your birthday',
    },
    render: function Render(args) {
        const [date, setDate] = useState<Date | undefined>();
        return <DatePicker {...args} value={date} onValueChange={setDate} />;
    },
};

export const DisableWeekends: Story = {
    render: function Render(args) {
        const [date, setDate] = useState<Date | undefined>();
        return <DatePicker {...args} value={date} onValueChange={setDate} disabled={[{ dayOfWeek: [0, 6] }]} />;
    },
};

export const DropdownCaption: Story = {
    render: function Render(args) {
        const [date, setDate] = useState<Date | undefined>();
        return <DatePicker {...args} value={date} onValueChange={setDate} captionLayout="dropdown" />;
    },
};

export const DropdownYearsOnly: Story = {
    render: function Render(args) {
        const [date, setDate] = useState<Date | undefined>();
        return <DatePicker {...args} value={date} onValueChange={setDate} captionLayout="dropdown-years" />;
    },
};
