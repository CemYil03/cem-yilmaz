import type { Meta, StoryObj } from '@storybook/react-vite';
import { CalendarDaysIcon } from 'lucide-react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from './hover-card';
import { Button } from './button';

const meta = {
    title: 'Base/HoverCard',
    component: HoverCard,
    tags: ['autodocs'],
} satisfies Meta<typeof HoverCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    render: () => (
        <HoverCard>
            <HoverCardTrigger asChild>
                <Button variant="link">@hoverable</Button>
            </HoverCardTrigger>
            <HoverCardContent>
                <div className="flex justify-between space-x-4">
                    <div className="space-y-1">
                        <h4 className="text-sm font-semibold">@username</h4>
                        <p className="text-sm">A short bio or description that appears on hover.</p>
                        <div className="flex items-center pt-2">
                            <CalendarDaysIcon className="mr-2 h-4 w-4 opacity-70" />
                            <span className="text-xs text-muted-foreground">Joined December 2021</span>
                        </div>
                    </div>
                </div>
            </HoverCardContent>
        </HoverCard>
    ),
};

export const AlignStart: Story = {
    render: () => (
        <HoverCard>
            <HoverCardTrigger asChild>
                <Button variant="outline">Align Start</Button>
            </HoverCardTrigger>
            <HoverCardContent align="start">
                <p className="text-sm">Content aligned to the start of the trigger.</p>
            </HoverCardContent>
        </HoverCard>
    ),
};

export const AlignEnd: Story = {
    render: () => (
        <HoverCard>
            <HoverCardTrigger asChild>
                <Button variant="outline">Align End</Button>
            </HoverCardTrigger>
            <HoverCardContent align="end">
                <p className="text-sm">Content aligned to the end of the trigger.</p>
            </HoverCardContent>
        </HoverCard>
    ),
};

export const CustomContent: Story = {
    render: () => (
        <HoverCard>
            <HoverCardTrigger asChild>
                <Button variant="secondary">Product Info</Button>
            </HoverCardTrigger>
            <HoverCardContent className="w-80">
                <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Premium Plan</h4>
                    <p className="text-sm text-muted-foreground">Includes unlimited projects, priority support, and advanced analytics.</p>
                    <p className="text-xs text-muted-foreground">$29/month billed annually</p>
                </div>
            </HoverCardContent>
        </HoverCard>
    ),
};
