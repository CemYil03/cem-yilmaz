import { format, parseISO } from 'date-fns';
import type { GqlCChatMessageAssistantText } from '../../graphql/generated';
import { AssistantMarkdown } from '../AssistantMarkdown';
import { CopyButton } from './shared';

export function ChatMessageAssistantTextView({ message }: { message: GqlCChatMessageAssistantText }) {
    return (
        <div data-slot="chat-message-row" data-side="assistant" className="flex w-full min-w-0 max-w-full">
            <div className="flex w-full min-w-0 max-w-full flex-col gap-1 overflow-x-auto">
                <AssistantMarkdown text={message.body} />
                <div className="flex items-center gap-2 text-[11px] opacity-70">
                    <time dateTime={message.createdAt}>{format(parseISO(message.createdAt), 'HH:mm')}</time>
                    <CopyButton text={message.body} />
                </div>
            </div>
        </div>
    );
}
