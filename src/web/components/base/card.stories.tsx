import type { Meta, StoryObj } from '@storybook/react-vite';
import { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter } from './card';
import { Button } from './button';

const meta = {
    title: 'Base/Card',
    component: Card,
    tags: ['autodocs'],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    render: () => (
        <Card className="w-[350px]">
            <CardHeader>
                <CardTitle>Card Title</CardTitle>
                <CardDescription>Card description goes here.</CardDescription>
            </CardHeader>
            <CardContent>
                <p>Card content goes here.</p>
            </CardContent>
            <CardFooter>
                <Button>Action</Button>
            </CardFooter>
        </Card>
    ),
};

export const WithAction: Story = {
    render: () => (
        <Card className="w-[350px]">
            <CardHeader>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>You have 3 unread messages.</CardDescription>
                <CardAction>
                    <Button variant="outline" size="sm">
                        Mark all read
                    </Button>
                </CardAction>
            </CardHeader>
            <CardContent>
                <p>Message previews would go here.</p>
            </CardContent>
        </Card>
    ),
};

export const HeaderOnly: Story = {
    render: () => (
        <Card className="w-[350px]">
            <CardHeader>
                <CardTitle>Simple Card</CardTitle>
                <CardDescription>A card with only a header.</CardDescription>
            </CardHeader>
        </Card>
    ),
};

export const WithFooter: Story = {
    render: () => (
        <Card className="w-[350px]">
            <CardHeader>
                <CardTitle>Create Project</CardTitle>
                <CardDescription>Deploy a new project in one click.</CardDescription>
            </CardHeader>
            <CardContent>
                <p>Configure your project settings below.</p>
            </CardContent>
            <CardFooter className="justify-between">
                <Button variant="outline">Cancel</Button>
                <Button>Deploy</Button>
            </CardFooter>
        </Card>
    ),
};

export const ContentOnly: Story = {
    render: () => (
        <Card className="w-[350px]">
            <CardContent>
                <p>A minimal card with only content, no header or footer.</p>
            </CardContent>
        </Card>
    ),
};
