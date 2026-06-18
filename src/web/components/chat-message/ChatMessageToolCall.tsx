import { HammerIcon } from 'lucide-react';
import type { GqlCChatMessageToolCall } from '../../graphql/generated';
import { MessageRow, Timestamp, ToolArgumentsButton } from './shared';

export function ChatMessageToolCallView({ message }: { message: GqlCChatMessageToolCall }) {
    return (
        <MessageRow side="system">
            <div
                data-slot="chat-message-tool-call"
                className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground"
            >
                <HammerIcon aria-hidden />
                <span>
                    Called <code className="font-mono">{message.toolName}</code>
                </span>
                <ToolArgumentsButton toolName={message.toolName} args={message.args} />
                <Timestamp iso={message.createdAt} className="mt-0" />
            </div>
        </MessageRow>
    );
}
