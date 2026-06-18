import type { Meta, StoryObj } from '@storybook/react-vite';
import type { GqlCChatMessage, GqlCChatMessageUserInput } from '../../graphql/generated';
import { ChatMessage } from '.';

const meta = {
    title: 'Chat/ChatMessage',
    component: ChatMessage,
    tags: ['autodocs'],
} satisfies Meta<typeof ChatMessage>;

export default meta;
type Story = StoryObj<typeof meta>;

const author = { __typename: 'User' as const, userId: 'user-1', name: 'Ada Lovelace' };

const userMessage: GqlCChatMessage = {
    __typename: 'ChatMessageUser',
    chatMessageId: 'm-user',
    author,
    body: 'Can you book me a table for two on Friday at 7pm in the city?',
    attachments: [],
    createdAt: '2026-06-03T18:30:00.000Z',
};

const userMessageWithAttachments: GqlCChatMessage = {
    __typename: 'ChatMessageUser',
    chatMessageId: 'm-user-attach',
    author,
    body: 'Here is the menu — what do you recommend?',
    // The URL points at the live download route so the bubble shows a real
    // thumbnail in the deployed Storybook; in CI / offline runs the broken
    // image still demonstrates the layout.
    attachments: [
        {
            __typename: 'FileUpload',
            fileUploadId: 'attach-1',
            filename: 'menu.jpg',
            mediaType: 'image/jpeg',
            size: 1024 * 90,
            url: '/logo512.png',
        },
        {
            __typename: 'FileUpload',
            fileUploadId: 'attach-2',
            filename: 'reservation.pdf',
            mediaType: 'application/pdf',
            size: 1024 * 30,
            url: '/api/file-uploads/attach-2',
        },
    ],
    createdAt: '2026-06-03T18:30:01.000Z',
};

// One-attachment case — the grid collapses to `grid-cols-1 w-1/2` so the
// lone tile doesn't sit next to a phantom empty cell. Visual coverage for
// the 1-tile layout that diverges from the 2+ behavior.
const userMessageWithOneAttachment: GqlCChatMessage = {
    __typename: 'ChatMessageUser',
    chatMessageId: 'm-user-attach-1',
    author,
    body: 'Quick screenshot.',
    attachments: [
        {
            __typename: 'FileUpload',
            fileUploadId: 'attach-one-1',
            filename: 'screenshot.png',
            mediaType: 'image/png',
            size: 1024 * 60,
            url: '/logo512.png',
        },
    ],
    createdAt: '2026-06-03T18:30:01.000Z',
};

// Three attachments — uneven row in the 2-column grid (top row full,
// bottom row half-filled). Visual coverage for the in-between case where
// the layout has a deliberate gap.
const userMessageWithThreeAttachments: GqlCChatMessage = {
    __typename: 'ChatMessageUser',
    chatMessageId: 'm-user-attach-3',
    author,
    body: 'Three references for the trip.',
    attachments: [
        {
            __typename: 'FileUpload',
            fileUploadId: 'attach-three-1',
            filename: 'hotel.jpg',
            mediaType: 'image/jpeg',
            size: 1024 * 100,
            url: '/logo512.png',
        },
        {
            __typename: 'FileUpload',
            fileUploadId: 'attach-three-2',
            filename: 'itinerary.md',
            mediaType: 'text/markdown',
            size: 1024 * 4,
            url: '/api/file-uploads/attach-three-2',
        },
        {
            __typename: 'FileUpload',
            fileUploadId: 'attach-three-3',
            filename: 'budget.csv',
            mediaType: 'text/csv',
            size: 1024 * 2,
            url: '/api/file-uploads/attach-three-3',
        },
    ],
    createdAt: '2026-06-03T18:30:01.000Z',
};

// Exactly four attachments — the grid is full but the overflow square
// has not yet kicked in. Visual coverage for the boundary just before the
// `+N` tile appears.
const userMessageWithFourAttachments: GqlCChatMessage = {
    __typename: 'ChatMessageUser',
    chatMessageId: 'm-user-attach-4',
    author,
    body: 'Full set of references.',
    attachments: [
        {
            __typename: 'FileUpload',
            fileUploadId: 'attach-four-1',
            filename: 'hotel.jpg',
            mediaType: 'image/jpeg',
            size: 1024 * 100,
            url: '/logo512.png',
        },
        {
            __typename: 'FileUpload',
            fileUploadId: 'attach-four-2',
            filename: 'itinerary.md',
            mediaType: 'text/markdown',
            size: 1024 * 4,
            url: '/api/file-uploads/attach-four-2',
        },
        {
            __typename: 'FileUpload',
            fileUploadId: 'attach-four-3',
            filename: 'budget.csv',
            mediaType: 'text/csv',
            size: 1024 * 2,
            url: '/api/file-uploads/attach-four-3',
        },
        {
            __typename: 'FileUpload',
            fileUploadId: 'attach-four-4',
            filename: 'tickets.pdf',
            mediaType: 'application/pdf',
            size: 1024 * 50,
            url: '/api/file-uploads/attach-four-4',
        },
    ],
    createdAt: '2026-06-03T18:30:01.000Z',
};

// Five attachments — the grid caps at 4 tiles, so the 4th becomes a `+2`
// overflow square. Visual coverage for the cap behavior on top of the
// dialog's arrow-key navigation flow that reaches the hidden tail.
const userMessageWithManyAttachments: GqlCChatMessage = {
    __typename: 'ChatMessageUser',
    chatMessageId: 'm-user-attach-many',
    author,
    body: 'Pulled together a few references for the trip.',
    attachments: [
        {
            __typename: 'FileUpload',
            fileUploadId: 'attach-many-1',
            filename: 'hotel.jpg',
            mediaType: 'image/jpeg',
            size: 1024 * 120,
            url: '/logo512.png',
        },
        {
            __typename: 'FileUpload',
            fileUploadId: 'attach-many-2',
            filename: 'itinerary.md',
            mediaType: 'text/markdown',
            size: 1024 * 4,
            url: '/api/file-uploads/attach-many-2',
        },
        {
            __typename: 'FileUpload',
            fileUploadId: 'attach-many-3',
            filename: 'budget.csv',
            mediaType: 'text/csv',
            size: 1024 * 2,
            url: '/api/file-uploads/attach-many-3',
        },
        {
            __typename: 'FileUpload',
            fileUploadId: 'attach-many-4',
            filename: 'tickets.pdf',
            mediaType: 'application/pdf',
            size: 1024 * 50,
            url: '/api/file-uploads/attach-many-4',
        },
        {
            __typename: 'FileUpload',
            fileUploadId: 'attach-many-5',
            filename: 'sights.png',
            mediaType: 'image/png',
            size: 1024 * 80,
            url: '/logo512.png',
        },
    ],
    createdAt: '2026-06-03T18:30:02.000Z',
};

const assistantText: GqlCChatMessage = {
    __typename: 'ChatMessageAssistantText',
    chatMessageId: 'm-asst',
    body: 'Sure — let me find a few options. A couple of details first:',
    createdAt: '2026-06-03T18:30:05.000Z',
};

const toolCall: GqlCChatMessage = {
    __typename: 'ChatMessageToolCall',
    chatMessageId: 'm-tool',
    toolName: 'searchRestaurants',
    args: { city: 'Berlin', cuisine: 'Italian', partySize: 2, when: '2026-06-05T19:00:00.000Z' },
    createdAt: '2026-06-03T18:30:08.000Z',
};

const approvalRequest: GqlCChatMessage = {
    __typename: 'ChatMessageToolApprovalRequest',
    chatMessageId: 'm-approval-req',
    approvalId: 'approval-123',
    toolName: 'createReservation',
    args: { restaurantId: 'r-42', name: 'Ada Lovelace', partySize: 2, when: '2026-06-05T19:00:00.000Z' },
    createdAt: '2026-06-03T18:30:12.000Z',
};

const approvalResponseApproved: GqlCChatMessage = {
    __typename: 'ChatMessageToolApprovalResponse',
    chatMessageId: 'm-approval-res-y',
    approvalId: 'approval-123',
    approved: true,
    reason: null,
    createdAt: '2026-06-03T18:30:15.000Z',
};

const approvalResponseDeclined: GqlCChatMessage = {
    __typename: 'ChatMessageToolApprovalResponse',
    chatMessageId: 'm-approval-res-n',
    approvalId: 'approval-456',
    approved: false,
    reason: null,
    createdAt: '2026-06-03T18:30:16.000Z',
};

const approvalResponseDeclinedWithReason: GqlCChatMessage = {
    __typename: 'ChatMessageToolApprovalResponse',
    chatMessageId: 'm-approval-res-n-r',
    approvalId: 'approval-789',
    approved: false,
    reason: "Wrong restaurant — let's pick a different one.",
    createdAt: '2026-06-03T18:30:17.000Z',
};

const inputCollection: GqlCChatMessage = {
    __typename: 'ChatMessageAssistantInputCollection',
    chatMessageId: 'm-coll',
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
        {
            __typename: 'ChatAssistantInputMultiSelect',
            inputId: 'dietary',
            prompt: 'Dietary needs?',
            options: ['Vegetarian', 'Vegan', 'Gluten-free', 'Nut-free'],
        },
        { __typename: 'ChatAssistantInputBoolean', inputId: 'window', prompt: 'Window seat?' },
        { __typename: 'ChatAssistantInputText', inputId: 'notes', prompt: 'Anything else?' },
    ],
    createdAt: '2026-06-03T18:30:20.000Z',
};

const inputCollectionStepThrough: GqlCChatMessage = {
    ...inputCollection,
    chatMessageId: 'm-coll-step',
    mode: 'StepThrough',
};

const userInputAnswer: GqlCChatMessageUserInput = {
    __typename: 'ChatMessageUserInput',
    chatMessageId: 'm-user-input',
    author,
    collectionMessageId: 'm-coll',
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
        {
            __typename: 'ChatMessageUserInputAnswer',
            inputId: 'dietary',
            value: { __typename: 'ChatAssistantInputValueStringList', values: ['Vegetarian', 'Nut-free'] },
        },
        {
            __typename: 'ChatMessageUserInputAnswer',
            inputId: 'window',
            value: { __typename: 'ChatAssistantInputValueBoolean', boolean: true },
        },
    ],
    createdAt: '2026-06-03T18:31:00.000Z',
};

const userInputSkipped: GqlCChatMessageUserInput = {
    __typename: 'ChatMessageUserInput',
    chatMessageId: 'm-user-input-skip',
    author,
    collectionMessageId: 'm-coll',
    answers: [],
    createdAt: '2026-06-03T18:31:00.000Z',
};

export const User: Story = { args: { message: userMessage } };
export const UserWithOneAttachment: Story = { args: { message: userMessageWithOneAttachment } };
export const UserWithAttachments: Story = { args: { message: userMessageWithAttachments } };
export const UserWithThreeAttachments: Story = { args: { message: userMessageWithThreeAttachments } };
export const UserWithFourAttachments: Story = { args: { message: userMessageWithFourAttachments } };
export const UserWithManyAttachments: Story = { args: { message: userMessageWithManyAttachments } };
export const AssistantText: Story = { args: { message: assistantText } };
export const ToolCall: Story = { args: { message: toolCall } };
export const ToolApprovalRequest: Story = { args: { message: approvalRequest, onApprovalRespond: () => {} } };
export const ToolApprovalApproved: Story = { args: { message: approvalResponseApproved } };
export const ToolApprovalDeclined: Story = { args: { message: approvalResponseDeclined } };
export const ToolApprovalDeclinedWithReason: Story = { args: { message: approvalResponseDeclinedWithReason } };
export const AssistantInputCollectionInteractive: Story = {
    args: { message: inputCollection, isInteractiveCollection: true, onCollectionSubmit: () => {} },
};
export const AssistantInputCollectionStepThrough: Story = {
    args: { message: inputCollectionStepThrough, isInteractiveCollection: true, onCollectionSubmit: () => {} },
};
// Answered/skipped renderings of the SAME collection — the ChatMessageUserInput
// row is folded in via `collectionUserInput` and is no longer rendered as its
// own message. See "Rendering — folded into the collection card" in chat.md.
export const AssistantInputCollectionAnswered: Story = {
    args: { message: inputCollection, isInteractiveCollection: false, collectionUserInput: userInputAnswer },
};
export const AssistantInputCollectionSkipped: Story = {
    args: { message: inputCollection, isInteractiveCollection: false, collectionUserInput: userInputSkipped },
};

export const FullConversation: Story = {
    args: { message: userMessage },
    render: () => (
        <div className="grid w-full max-w-2xl gap-4 p-4">
            <ChatMessage message={userMessage} />
            <ChatMessage message={assistantText} />
            <ChatMessage message={inputCollection} isInteractiveCollection={false} collectionUserInput={userInputAnswer} />
            <ChatMessage message={toolCall} />
            <ChatMessage message={approvalRequest} onApprovalRespond={() => {}} />
            <ChatMessage message={approvalResponseApproved} />
        </div>
    ),
};
