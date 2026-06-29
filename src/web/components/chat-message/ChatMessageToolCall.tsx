import { HammerIcon } from 'lucide-react';
import type { GqlCChatMessage, GqlCChatMessageToolCall } from '../../graphql/generated';
import { MessageRow, Timestamp, ToolArgumentsButton } from './shared';

// Renders one tool-call row in the transcript. The base pill (`Called <tool>` +
// args button + timestamp) is the same for top-level orchestrator calls and
// for child rows produced by a sub-agent inside a delegating tool's `execute`.
//
// When child rows are present, they render in an indented block under the
// parent pill — see `docs/architecture/agent-delegation.md` ("Nested tool
// calls"). The transcript groups children via `partitionByParent` and only
// passes them to top-level rows; recursion is bounded by the data (no
// grandchildren today) but the renderer would walk further if a future
// delegation level appeared.
export function ChatMessageToolCallView({
    message,
    childMessages,
}: {
    message: GqlCChatMessageToolCall;
    childMessages?: ReadonlyArray<GqlCChatMessage>;
}) {
    const hasChildren = (childMessages?.length ?? 0) > 0;
    return (
        <MessageRow side="system">
            <div data-slot="chat-message-tool-call" className="flex max-w-full flex-col items-stretch gap-1">
                <div className="inline-flex items-center gap-2 self-center rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                    <HammerIcon aria-hidden />
                    <span>
                        Called <code className="font-mono">{message.toolName}</code>
                    </span>
                    <ToolArgumentsButton toolName={message.toolName} args={message.args} />
                    <Timestamp iso={message.createdAt} className="mt-0" />
                </div>
                {hasChildren ? (
                    <ul
                        data-slot="chat-message-tool-call-children"
                        className="ml-3 flex list-none flex-col gap-1 border-l border-muted-foreground/30 pl-3"
                    >
                        {childMessages!.map((child) =>
                            child.__typename === 'ChatMessageToolCall' ? (
                                <li key={child.chatMessageId} className="text-xs text-muted-foreground">
                                    <div className="inline-flex items-center gap-2">
                                        <HammerIcon aria-hidden className="size-3" />
                                        <span>
                                            Called <code className="font-mono">{child.toolName}</code>
                                        </span>
                                        <ToolArgumentsButton toolName={child.toolName} args={child.args} />
                                        <Timestamp iso={child.createdAt} className="mt-0" />
                                    </div>
                                </li>
                            ) : null,
                        )}
                    </ul>
                ) : null}
            </div>
        </MessageRow>
    );
}
