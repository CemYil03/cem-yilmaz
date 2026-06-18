import type { Meta, StoryObj } from '@storybook/react-vite';
import { HeartIcon, MailIcon, BellIcon, SettingsIcon } from 'lucide-react';
import { Button } from './button';
import { Input } from './input';
import { Textarea } from './textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { Switch } from './switch';
import { Slider } from './slider';
import { Avatar, AvatarFallback, AvatarImage, AvatarGroup } from './avatar';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './card';
import { Separator } from './separator';
import { Skeleton } from './skeleton';
import { Spinner } from './spinner';
import { Kbd } from './kbd';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from './input-otp';
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from './pagination';

const meta = {
    title: 'Base/Overview',
    parameters: {
        layout: 'padded',
    },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
    render: () => (
        <TooltipProvider>
            <div className="mx-auto flex max-w-4xl flex-col gap-10 p-6">
                {/* Buttons */}
                <section className="flex flex-col gap-3">
                    <h2 className="text-lg font-semibold">Buttons</h2>
                    <div className="flex flex-wrap items-center gap-3">
                        <Button variant="default">Default</Button>
                        <Button variant="secondary">Secondary</Button>
                        <Button variant="destructive">Destructive</Button>
                        <Button variant="outline">Outline</Button>
                        <Button variant="ghost">Ghost</Button>
                        <Button variant="link">Link</Button>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <Button size="xs">Extra Small</Button>
                        <Button size="sm">Small</Button>
                        <Button size="default">Default</Button>
                        <Button size="lg">Large</Button>
                        <Button size="icon" aria-label="Settings">
                            <SettingsIcon />
                        </Button>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <Button>
                            <MailIcon /> With Icon
                        </Button>
                        <Button disabled>Disabled</Button>
                        <Button disabled>
                            <Spinner /> Loading
                        </Button>
                    </div>
                </section>

                <Separator />

                {/* Inputs */}
                <section className="flex flex-col gap-3">
                    <h2 className="text-lg font-semibold">Inputs</h2>
                    <div className="grid max-w-sm gap-3">
                        <Input placeholder="Default input" />
                        <Input type="email" placeholder="Email" />
                        <Input disabled placeholder="Disabled" />
                        <Textarea placeholder="Textarea..." />
                    </div>
                </section>

                <Separator />

                {/* Select */}
                <section className="flex flex-col gap-3">
                    <h2 className="text-lg font-semibold">Select</h2>
                    <div className="max-w-sm">
                        <Select>
                            <SelectTrigger>
                                <SelectValue placeholder="Choose an option" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="react">React</SelectItem>
                                <SelectItem value="vue">Vue</SelectItem>
                                <SelectItem value="svelte">Svelte</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </section>

                <Separator />

                {/* Switch & Slider */}
                <section className="flex flex-col gap-3">
                    <h2 className="text-lg font-semibold">Switch & Slider</h2>
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <Switch defaultChecked />
                            <span className="text-sm">Enabled</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Switch />
                            <span className="text-sm">Disabled</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Switch size="sm" defaultChecked />
                            <span className="text-sm">Small</span>
                        </div>
                    </div>
                    <div className="max-w-sm">
                        <Slider defaultValue={[40]} />
                    </div>
                </section>

                <Separator />

                {/* Avatars */}
                <section className="flex flex-col gap-3">
                    <h2 className="text-lg font-semibold">Avatars</h2>
                    <div className="flex items-center gap-4">
                        <Avatar size="sm">
                            <AvatarFallback>S</AvatarFallback>
                        </Avatar>
                        <Avatar>
                            <AvatarFallback>AB</AvatarFallback>
                        </Avatar>
                        <Avatar size="lg">
                            <AvatarImage src="https://github.com/shadcn.png" alt="shadcn" />
                            <AvatarFallback>CN</AvatarFallback>
                        </Avatar>
                        <AvatarGroup>
                            <Avatar>
                                <AvatarFallback>A</AvatarFallback>
                            </Avatar>
                            <Avatar>
                                <AvatarFallback>B</AvatarFallback>
                            </Avatar>
                            <Avatar>
                                <AvatarFallback>C</AvatarFallback>
                            </Avatar>
                        </AvatarGroup>
                    </div>
                </section>

                <Separator />

                {/* Card */}
                <section className="flex flex-col gap-3">
                    <h2 className="text-lg font-semibold">Card</h2>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Notifications</CardTitle>
                                <CardDescription>You have 3 unread messages.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-3">
                                    <BellIcon className="size-5 text-muted-foreground" />
                                    <span className="text-sm">Push notifications are enabled</span>
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button size="sm" variant="outline">
                                    Mark all read
                                </Button>
                            </CardFooter>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Profile</CardTitle>
                                <CardDescription>Manage your account settings.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-col gap-2">
                                    <Input placeholder="Name" defaultValue="John Doe" />
                                    <Input placeholder="Email" defaultValue="john@example.com" />
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button size="sm">Save</Button>
                            </CardFooter>
                        </Card>
                    </div>
                </section>

                <Separator />

                {/* OTP Input */}
                <section className="flex flex-col gap-3">
                    <h2 className="text-lg font-semibold">OTP Input</h2>
                    <InputOTP maxLength={6}>
                        <InputOTPGroup>
                            <InputOTPSlot index={0} />
                            <InputOTPSlot index={1} />
                            <InputOTPSlot index={2} />
                        </InputOTPGroup>
                        <InputOTPSeparator />
                        <InputOTPGroup>
                            <InputOTPSlot index={3} />
                            <InputOTPSlot index={4} />
                            <InputOTPSlot index={5} />
                        </InputOTPGroup>
                    </InputOTP>
                </section>

                <Separator />

                {/* Tooltip & Kbd */}
                <section className="flex flex-col gap-3">
                    <h2 className="text-lg font-semibold">Tooltip & Keyboard</h2>
                    <div className="flex items-center gap-4">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="outline" size="icon" aria-label="Like">
                                    <HeartIcon />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>
                                    Add to favorites <Kbd>F</Kbd>
                                </p>
                            </TooltipContent>
                        </Tooltip>
                        <div className="flex items-center gap-2 text-sm">
                            <span>Shortcuts:</span>
                            <Kbd>⌘</Kbd>
                            <Kbd>K</Kbd>
                            <Kbd>Ctrl+S</Kbd>
                        </div>
                    </div>
                </section>

                <Separator />

                {/* Skeleton */}
                <section className="flex flex-col gap-3">
                    <h2 className="text-lg font-semibold">Skeleton & Spinner</h2>
                    <div className="flex items-center gap-4">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="flex flex-col gap-2">
                            <Skeleton className="h-4 w-48" />
                            <Skeleton className="h-4 w-32" />
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Spinner />
                        <Spinner className="size-6" />
                        <Spinner className="size-8" />
                    </div>
                </section>

                <Separator />

                {/* Pagination */}
                <section className="flex flex-col gap-3">
                    <h2 className="text-lg font-semibold">Pagination</h2>
                    <Pagination>
                        <PaginationContent>
                            <PaginationItem>
                                <PaginationPrevious href="#" />
                            </PaginationItem>
                            <PaginationItem>
                                <PaginationLink href="#">1</PaginationLink>
                            </PaginationItem>
                            <PaginationItem>
                                <PaginationLink href="#" isActive>
                                    2
                                </PaginationLink>
                            </PaginationItem>
                            <PaginationItem>
                                <PaginationLink href="#">3</PaginationLink>
                            </PaginationItem>
                            <PaginationItem>
                                <PaginationEllipsis />
                            </PaginationItem>
                            <PaginationItem>
                                <PaginationNext href="#" />
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                </section>
            </div>
        </TooltipProvider>
    ),
};
