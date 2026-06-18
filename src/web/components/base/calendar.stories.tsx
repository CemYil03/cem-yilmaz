import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { DateRange } from 'react-day-picker';
import { Calendar } from './calendar';
import { addDays } from 'date-fns';

const meta = {
    title: 'Base/Calendar',
    component: Calendar,
    argTypes: {
        showOutsideDays: { control: 'boolean' },
        showWeekNumber: { control: 'boolean' },
        captionLayout: {
            control: 'select',
            options: ['label', 'dropdown', 'dropdown-months', 'dropdown-years'],
        },
        buttonVariant: {
            control: 'select',
            options: ['default', 'outline', 'ghost', 'secondary'],
        },
    },
    args: {
        showOutsideDays: true,
    },
    tags: ['autodocs'],
} satisfies Meta<typeof Calendar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Single: Story = {
    render: function Render() {
        const [date, setDate] = useState<Date | undefined>(new Date());
        return <Calendar mode="single" selected={date} onSelect={setDate} />;
    },
};

export const Multiple: Story = {
    render: function Render() {
        const [dates, setDates] = useState<Date[] | undefined>([new Date(), addDays(new Date(), 3)]);
        return <Calendar mode="multiple" selected={dates} onSelect={setDates} />;
    },
};

export const Range: Story = {
    render: function Render() {
        const [range, setRange] = useState<DateRange | undefined>({
            from: new Date(),
            to: addDays(new Date(), 7),
        });
        return <Calendar mode="range" selected={range} onSelect={setRange} />;
    },
};

export const WithWeekNumbers: Story = {
    args: { showWeekNumber: true },
};

export const WithoutOutsideDays: Story = {
    args: { showOutsideDays: false },
};

export const DropdownNavigation: Story = {
    args: {
        captionLayout: 'dropdown',
        startMonth: new Date(2020, 0),
        endMonth: new Date(2030, 11),
    },
};

export const MultipleMonths: Story = {
    args: { numberOfMonths: 2 },
};

export const DisabledDates: Story = {
    render: function Render() {
        const [date, setDate] = useState<Date | undefined>(new Date());
        return <Calendar mode="single" selected={date} onSelect={setDate} disabled={[{ dayOfWeek: [0, 6] }]} />;
    },
};
