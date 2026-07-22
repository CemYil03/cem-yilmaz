import type { Meta, StoryObj } from '@storybook/react-vite';
import { BotIcon, ShieldCheckIcon } from 'lucide-react';
import { useState } from 'react';
import type { GqlCChatMessage, GqlCChatMessageUserInput } from '../graphql/generated';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './base/select';
import { ChatMessage } from './chat-message';
import { MessageComposer } from './MessageComposer';

// Composite stories — the composer glued under a real chat thread, the
// workspace hub greeting block, and the approval-mode flow end-to-end.
// Each story is a single page-shaped scene that lets a viewer judge the
// rhythm of the surface, not just one component in isolation.

const meta = {
    title: 'Composite/Composer + Thread',
    parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const author = { __typename: 'User' as const, userId: 'user-1', name: 'Ada Lovelace' };

const visitorThread: ReadonlyArray<GqlCChatMessage> = [
    {
        __typename: 'ChatMessageUser',
        chatMessageId: 'm-1',
        author,
        body: 'Hi! Can Cem help with a Next.js → TanStack migration in Q3?',
        attachments: [],
        compassObservations: [],
        createdAt: '2026-06-03T18:30:00.000Z',
    },
    {
        __typename: 'ChatMessageAssistantText',
        chatMessageId: 'm-2',
        body: "Yes — Cem regularly works on those exact migrations. He's available for a discovery call in mid-July, and the typical engagement is 4–8 weeks. Want me to send a quick intro request?",
        reasoning: null,
        createdAt: '2026-06-03T18:30:05.000Z',
    },
    {
        __typename: 'ChatMessageUser',
        chatMessageId: 'm-3',
        author,
        body: 'Please do!',
        attachments: [],
        compassObservations: [],
        createdAt: '2026-06-03T18:31:00.000Z',
    },
];

export const VisitorChatThread: Story = {
    name: 'Visitor chat — thread + composer',
    render: () => {
        function Demo() {
            const [value, setValue] = useState('');
            const [busy, setBusy] = useState(false);
            return (
                <div className="mx-auto flex h-[640px] w-full max-w-2xl flex-col bg-background">
                    <div className="flex-1 space-y-4 overflow-y-auto p-6">
                        {visitorThread.map((message) => (
                            <ChatMessage key={message.chatMessageId} message={message} />
                        ))}
                    </div>
                    <div className="border-t border-border/60 p-4">
                        <MessageComposer
                            value={value}
                            onValueChange={setValue}
                            onSubmit={() => {
                                setBusy(true);
                                window.setTimeout(() => {
                                    setBusy(false);
                                    setValue('');
                                }, 900);
                            }}
                            busy={busy}
                            placeholder="Ask me anything…"
                        />
                    </div>
                </div>
            );
        }
        return <Demo />;
    },
};

export const WorkspaceHubGreeting: Story = {
    name: 'Workspace hub — greeting + composer as the landing affordance',
    render: () => {
        function Demo() {
            const [value, setValue] = useState('');
            return (
                <div className="mx-auto w-full max-w-3xl px-6 pt-20 pb-12">
                    <h1 className="text-3xl font-semibold tracking-tight">Good morning, Cem.</h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Three open tasks · one project waiting on you · two unread updates.
                    </p>

                    <div className="mt-8">
                        <MessageComposer
                            value={value}
                            onValueChange={setValue}
                            onSubmit={() => setValue('')}
                            placeholder="Ask your assistant — start a task, jump into a project, anything."
                            autoFocus
                            addonStart={
                                <>
                                    <Select defaultValue="gemini-pro">
                                        <SelectTrigger size="sm" className="h-7 gap-1.5 px-2 text-xs">
                                            <BotIcon className="size-3.5 text-muted-foreground" />
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="gemini-pro">Gemini Pro</SelectItem>
                                            <SelectItem value="gemini-flash">Gemini Flash</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Select defaultValue="auto">
                                        <SelectTrigger size="sm" className="h-7 gap-1.5 px-2 text-xs">
                                            <ShieldCheckIcon className="size-3.5 text-muted-foreground" />
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="auto">Auto-approve</SelectItem>
                                            <SelectItem value="require">Require approval</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </>
                            }
                        />
                    </div>
                </div>
            );
        }
        return <Demo />;
    },
};

const approvalThread: ReadonlyArray<GqlCChatMessage> = [
    {
        __typename: 'ChatMessageUser',
        chatMessageId: 'a-1',
        author,
        body: 'Book me a table for two at the Italian place on Friday at 7pm.',
        attachments: [],
        compassObservations: [],
        createdAt: '2026-06-03T18:30:00.000Z',
    },
    {
        __typename: 'ChatMessageToolApprovalRequest',
        chatMessageId: 'a-2',
        approvalId: 'approval-1',
        toolName: 'createReservation',
        args: { restaurantId: 'r-42', name: 'Ada Lovelace', partySize: 2, when: '2026-06-05T19:00:00.000Z' },
        createdAt: '2026-06-03T18:30:08.000Z',
    },
];

const approvedFollowup: ReadonlyArray<GqlCChatMessage> = [
    {
        __typename: 'ChatMessageToolApprovalResponse',
        chatMessageId: 'a-3',
        approvalId: 'approval-1',
        approved: true,
        reason: null,
        createdAt: '2026-06-03T18:30:15.000Z',
    },
    {
        __typename: 'ChatMessageAssistantText',
        chatMessageId: 'a-4',
        body: 'Done. Reservation confirmed for two at 7pm Friday.',
        reasoning: null,
        createdAt: '2026-06-03T18:30:18.000Z',
    },
];

export const ApprovalModeFlow: Story = {
    name: 'Approval flow — composer with mode selector → request → response',
    render: () => {
        function Demo() {
            const [value, setValue] = useState('');
            const [approved, setApproved] = useState<boolean | null>(null);
            return (
                <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-6">
                    {approvalThread.map((message) => (
                        <ChatMessage
                            key={message.chatMessageId}
                            message={message}
                            onApprovalRespond={(_id, approve) => setApproved(approve)}
                        />
                    ))}
                    {approved === true
                        ? approvedFollowup.map((message) => <ChatMessage key={message.chatMessageId} message={message} />)
                        : null}
                    {approved === false ? (
                        <ChatMessage
                            message={{
                                __typename: 'ChatMessageToolApprovalResponse',
                                chatMessageId: 'a-5',
                                approvalId: 'approval-1',
                                approved: false,
                                reason: null,
                                createdAt: '2026-06-03T18:30:15.000Z',
                            }}
                        />
                    ) : null}
                    <div className="mt-4 border-t border-border/60 pt-4">
                        <MessageComposer
                            value={value}
                            onValueChange={setValue}
                            onSubmit={() => setValue('')}
                            placeholder="Reply…"
                            addonStart={
                                <Select defaultValue="require">
                                    <SelectTrigger size="sm" className="h-7 gap-1.5 px-2 text-xs">
                                        <ShieldCheckIcon className="size-3.5 text-muted-foreground" />
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="auto">Auto-approve</SelectItem>
                                        <SelectItem value="require">Require approval</SelectItem>
                                    </SelectContent>
                                </Select>
                            }
                        />
                    </div>
                </div>
            );
        }
        return <Demo />;
    },
};

const inputCollection: GqlCChatMessage = {
    __typename: 'ChatMessageAssistantInputCollection',
    chatMessageId: 'ic-1',
    prompt: 'A few details so I can find the right table:',
    mode: 'Form',
    inputs: [
        { __typename: 'ChatAssistantInputDate', inputId: 'date', prompt: 'When?' },
        { __typename: 'ChatAssistantInputTime', inputId: 'time', prompt: 'What time?' },
        {
            __typename: 'ChatAssistantInputSingleSelect',
            inputId: 'cuisine',
            prompt: 'Cuisine preference?',
            options: ['Italian', 'Japanese', 'Mexican', 'Anything'],
        },
    ],
    createdAt: '2026-06-03T18:30:20.000Z',
};

const collectionAnswered: GqlCChatMessageUserInput = {
    __typename: 'ChatMessageUserInput',
    chatMessageId: 'ic-1-answers',
    author,
    collectionMessageId: 'ic-1',
    answers: [
        {
            __typename: 'ChatMessageUserInputAnswer',
            inputId: 'date',
            value: { __typename: 'ChatAssistantInputValueDate', date: '2026-06-05' },
        },
        { __typename: 'ChatMessageUserInputAnswer', inputId: 'time', value: { __typename: 'ChatAssistantInputValueTime', time: '19:00' } },
        {
            __typename: 'ChatMessageUserInputAnswer',
            inputId: 'cuisine',
            value: { __typename: 'ChatAssistantInputValueString', value: 'Italian' },
        },
    ],
    createdAt: '2026-06-03T18:31:00.000Z',
};

export const InputCollectionFollowup: Story = {
    name: 'Input collection → answered → composer ready for the next turn',
    render: () => {
        function Demo() {
            const [value, setValue] = useState('');
            return (
                <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-6">
                    <ChatMessage message={inputCollection} collectionUserInput={collectionAnswered} />
                    <div className="border-t border-border/60 pt-4">
                        <MessageComposer
                            value={value}
                            onValueChange={setValue}
                            onSubmit={() => setValue('')}
                            placeholder="Anything else?"
                        />
                    </div>
                </div>
            );
        }
        return <Demo />;
    },
};
