import type { Meta, StoryObj } from '@storybook/react-vite';
import { addDays } from 'date-fns';
import { useState } from 'react';
import type { DateRange } from 'react-day-picker';
import { DateRangePicker } from './date-range-picker';

const meta = {
    title: 'Base/DateRangePicker',
    component: DateRangePicker,
    tags: ['autodocs'],
    args: {
        placeholder: 'Pick dates',
    },
} satisfies Meta<typeof DateRangePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    render: function Render(args) {
        const [range, setRange] = useState<DateRange | undefined>();
        return <DateRangePicker {...args} value={range} onValueChange={setRange} />;
    },
};

export const WithInitialRange: Story = {
    render: function Render(args) {
        const [range, setRange] = useState<DateRange | undefined>({
            from: new Date(new Date().getFullYear(), 0, 20),
            to: addDays(new Date(new Date().getFullYear(), 0, 20), 20),
        });
        return <DateRangePicker {...args} value={range} onValueChange={setRange} />;
    },
};

export const SingleMonth: Story = {
    render: function Render(args) {
        const [range, setRange] = useState<DateRange | undefined>();
        return <DateRangePicker {...args} value={range} onValueChange={setRange} numberOfMonths={1} />;
    },
};

export const DisableWeekends: Story = {
    render: function Render(args) {
        const [range, setRange] = useState<DateRange | undefined>();
        return <DateRangePicker {...args} value={range} onValueChange={setRange} disabled={[{ dayOfWeek: [0, 6] }]} />;
    },
};

export const DropdownCaption: Story = {
    render: function Render(args) {
        const [range, setRange] = useState<DateRange | undefined>();
        return <DateRangePicker {...args} value={range} onValueChange={setRange} captionLayout="dropdown" />;
    },
};
