import { format, parseISO } from 'date-fns';
import type { GqlCChatMessageAssistantText } from '../../graphql/generated';
import { AssistantMarkdown } from '../AssistantMarkdown';
import { AssistantReasoning } from '../AssistantReasoning';
import { CopyButton, SpeakButton } from './shared';

export function ChatMessageAssistantTextView({
    message,
    reasoningText,
}: {
    message: GqlCChatMessageAssistantText;
    /** Resolved thought summary for this step (live or persisted). */
    reasoningText?: string;
}) {
    return (
        <div data-slot="chat-message-row" data-side="assistant" className="flex w-full min-w-0 max-w-full">
            <div className="flex w-full min-w-0 max-w-full flex-col gap-1 overflow-x-auto">
                {reasoningText ? <AssistantReasoning text={reasoningText} /> : null}
                <AssistantMarkdown text={message.body} />
                <div className="flex items-center gap-2 text-[11px] opacity-70">
                    <time dateTime={message.createdAt}>{format(parseISO(message.createdAt), 'HH:mm')}</time>
                    <SpeakButton text={message.body} />
                    <CopyButton text={message.body} />
                </div>
            </div>
        </div>
    );
}
