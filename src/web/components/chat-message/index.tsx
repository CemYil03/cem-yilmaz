import type { GqlCChatAssistantInputValue, GqlCChatMessage, GqlCChatMessageUserInput } from '../../graphql/generated';
import { ChatMessageAssistantInputCollectionView } from './ChatMessageAssistantInputCollection';
import { ChatMessageAssistantTextView } from './ChatMessageAssistantText';
import { ChatMessageToolApprovalRequestView } from './ChatMessageToolApprovalRequest';
import { ChatMessageToolApprovalResponseView } from './ChatMessageToolApprovalResponse';
import { ChatMessageToolCallView } from './ChatMessageToolCall';
import { ChatMessageUserView } from './ChatMessageUser';

// Renders any variant of the `ChatMessage` union from `schema.graphqls`. The
// switch is exhaustive — `__typename` is the discriminator codegen produces, so
// adding a new union member becomes a TypeScript error here. See
// `docs/architecture/chat.md` for the schema-level rationale.
//
// `ChatMessageUserInput` rows are deliberately not rendered as a standalone
// message: their content is folded into the matching collection card via the
// `userInput` prop on the AssistantInputCollection branch (see chat.md's
// "Rendering — folded into the collection card"). The row stays on the wire
// because `toModelMessages` replays it to the LLM as the `promptUserForInput`
// tool-result; it just doesn't get its own visual element.

interface ChatMessageProps {
    message: GqlCChatMessage;
    /** True only for the most recent assistant input collection in the chat
     *  that has no matching `ChatMessageUserInput` yet — see
     *  "Latest-collection-only is a UI rule" in chat.md. */
    isInteractiveCollection?: boolean;
    /** The user's reply to this collection, if any. Threaded in by the route
     *  via `findUserInputByCollectionId`. Only consulted for the
     *  `ChatMessageAssistantInputCollection` branch. */
    collectionUserInput?: GqlCChatMessageUserInput;
    /** Wired by the parent chat surface; the component itself does not run mutations.
     *  Each answer is the typed `ChatAssistantInputValue` matching its slot kind —
     *  the route flattens these to the GraphQL flat-input shape on the way out. */
    onCollectionSubmit?: (
        collectionMessageId: string,
        answers: ReadonlyArray<{ inputId: string; value: GqlCChatAssistantInputValue }>,
    ) => void;
    onApprovalRespond?: (approvalId: string, approved: boolean, reason?: string) => void;
}

export function ChatMessage({
    message,
    isInteractiveCollection = false,
    collectionUserInput,
    onCollectionSubmit,
    onApprovalRespond,
}: ChatMessageProps) {
    switch (message.__typename) {
        case 'ChatMessageUser':
            return <ChatMessageUserView message={message} />;
        case 'ChatMessageAssistantText':
            return <ChatMessageAssistantTextView message={message} />;
        case 'ChatMessageToolCall':
            return <ChatMessageToolCallView message={message} />;
        case 'ChatMessageToolApprovalRequest':
            return <ChatMessageToolApprovalRequestView message={message} onRespond={onApprovalRespond} />;
        case 'ChatMessageToolApprovalResponse':
            return <ChatMessageToolApprovalResponseView message={message} />;
        case 'ChatMessageAssistantInputCollection':
            return (
                <ChatMessageAssistantInputCollectionView
                    message={message}
                    isInteractive={isInteractiveCollection}
                    userInput={collectionUserInput}
                    onSubmit={onCollectionSubmit}
                />
            );
        case 'ChatMessageUserInput':
            // Folded into the collection card above; emitting nothing here
            // keeps the message log append-only without a duplicate render.
            return null;
        case undefined:
            // Codegen leaves __typename optional; in practice URQL always sets it.
            // This branch keeps the switch exhaustive without crashing on bad fixtures.
            return null;
    }
}
