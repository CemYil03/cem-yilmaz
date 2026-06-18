import type { Meta, StoryObj } from '@storybook/react-vite';
import { TriangleAlertIcon, Trash2Icon } from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogMedia,
    AlertDialogTitle,
    AlertDialogTrigger,
} from './alert-dialog';
import { Button } from './button';

const meta = {
    title: 'Base/AlertDialog',
    component: AlertDialog,
    tags: ['autodocs'],
} satisfies Meta<typeof AlertDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    render: () => (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="outline">Delete Account</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete your account and remove your data from our servers.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction>Continue</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    ),
};

export const Destructive: Story = {
    render: () => (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="destructive">Delete Project</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete project?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently delete the project and all associated data. This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction variant="destructive">Delete</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    ),
};

export const WithMedia: Story = {
    render: () => (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="outline">Show Warning</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogMedia>
                        <TriangleAlertIcon />
                    </AlertDialogMedia>
                    <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
                    <AlertDialogDescription>You have unsaved changes that will be lost if you leave this page.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Stay</AlertDialogCancel>
                    <AlertDialogAction variant="destructive">Discard</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    ),
};

export const SmallSize: Story = {
    render: () => (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm">
                    Remove
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent size="sm">
                <AlertDialogHeader>
                    <AlertDialogMedia>
                        <Trash2Icon />
                    </AlertDialogMedia>
                    <AlertDialogTitle>Remove item?</AlertDialogTitle>
                    <AlertDialogDescription>This item will be removed from your list.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel size="sm">Cancel</AlertDialogCancel>
                    <AlertDialogAction size="sm" variant="destructive">
                        Remove
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    ),
};
