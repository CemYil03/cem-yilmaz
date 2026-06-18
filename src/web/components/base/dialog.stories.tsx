import type { Meta, StoryObj } from '@storybook/react-vite';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './dialog';
import { Button } from './button';

const meta = {
    title: 'Base/Dialog',
    component: Dialog,
    tags: ['autodocs'],
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    render: () => (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline">Open Dialog</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Profile</DialogTitle>
                    <DialogDescription>Make changes to your profile here. Click save when you're done.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <input className="border rounded px-3 py-2" placeholder="Name" defaultValue="John Doe" />
                    <input className="border rounded px-3 py-2" placeholder="Email" defaultValue="john@example.com" />
                </div>
                <DialogFooter>
                    <Button>Save changes</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    ),
};

export const WithCloseButtonInFooter: Story = {
    render: () => (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline">View Details</Button>
            </DialogTrigger>
            <DialogContent showCloseButton={false}>
                <DialogHeader>
                    <DialogTitle>Item Details</DialogTitle>
                    <DialogDescription>Here are the details for the selected item.</DialogDescription>
                </DialogHeader>
                <div className="py-4 text-sm text-muted-foreground">
                    <p>This dialog has no close icon in the corner. Instead, it uses a close button in the footer.</p>
                </div>
                <DialogFooter showCloseButton>
                    <Button>Confirm</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    ),
};

export const NoCloseButton: Story = {
    render: () => (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline">Open Minimal Dialog</Button>
            </DialogTrigger>
            <DialogContent showCloseButton={false}>
                <DialogHeader>
                    <DialogTitle>Terms of Service</DialogTitle>
                    <DialogDescription>Please read and accept the terms of service to continue.</DialogDescription>
                </DialogHeader>
                <div className="py-4 text-sm text-muted-foreground">
                    <p>By clicking accept, you agree to our terms and conditions.</p>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Decline</Button>
                    </DialogClose>
                    <DialogClose asChild>
                        <Button>Accept</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    ),
};

export const LongContent: Story = {
    render: () => (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline">View Changelog</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Changelog</DialogTitle>
                    <DialogDescription>Recent updates and improvements.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-3 py-4 text-sm">
                    {Array.from({ length: 10 }, (_, i) => (
                        <div key={i} className="border-b pb-3 last:border-b-0">
                            <p className="font-medium">v1.{10 - i}.0</p>
                            <p className="text-muted-foreground">Bug fixes and performance improvements.</p>
                        </div>
                    ))}
                </div>
                <DialogFooter showCloseButton />
            </DialogContent>
        </Dialog>
    ),
};
