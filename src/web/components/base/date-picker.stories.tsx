import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { DatePicker } from './date-picker';

const meta = {
    title: 'Base/DatePicker',
    component: DatePicker,
    tags: ['autodocs'],
} satisfies Meta<typeof DatePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    render: function Render() {
        const [date, setDate] = useState<Date | undefined>();
        return <DatePicker value={date} onValueChange={setDate} />;
    },
};

export const WithInitialValue: Story = {
    render: function Render() {
        const [date, setDate] = useState<Date | undefined>(new Date());
        return <DatePicker value={date} onValueChange={setDate} />;
    },
};

export const CustomPlaceholder: Story = {
    render: function Render() {
        const [date, setDate] = useState<Date | undefined>();
        return <DatePicker value={date} onValueChange={setDate} placeholder="Select your birthday" />;
    },
};

export const DisableWeekends: Story = {
    render: function Render() {
        const [date, setDate] = useState<Date | undefined>();
        return <DatePicker value={date} onValueChange={setDate} disabled={[{ dayOfWeek: [0, 6] }]} />;
    },
};

export const DropdownCaption: Story = {
    render: function Render() {
        const [date, setDate] = useState<Date | undefined>();
        return <DatePicker value={date} onValueChange={setDate} captionLayout="dropdown" />;
    },
};

export const DropdownYearsOnly: Story = {
    render: function Render() {
        const [date, setDate] = useState<Date | undefined>();
        return <DatePicker value={date} onValueChange={setDate} captionLayout="dropdown-years" />;
    },
};
