import type { GqlCChatMessage, GqlCChatMessageToolCall } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { toolDisplay } from '../../chat/toolDisplay';
import { MessageRow, Timestamp, ToolArgumentsButton, ToolRowShell } from './shared';

// Renders one tool-call row in the transcript. The base pill (friendly tool
// label + args button + timestamp) is the same for top-level orchestrator calls
// and for child rows produced by a sub-agent inside a delegating tool's
// `execute`. Rows sit on the left rail (see `MessageRow` side="system").
//
// `active` is true only for the trailing tool-call row while the turn is still
// in flight — the transcript threads it down so the pill shimmers "working on
// it" until the assistant moves on to streaming text or the turn ends. See
// docs/architecture/chat-transcript.md.
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
    active = false,
}: {
    message: GqlCChatMessageToolCall;
    childMessages?: ReadonlyArray<GqlCChatMessage>;
    active?: boolean;
}) {
    const locale = useLocale();
    const hasChildren = (childMessages?.length ?? 0) > 0;
    return (
        <MessageRow side="system">
            <div data-slot="chat-message-tool-call" className="flex max-w-full flex-col items-stretch gap-1">
                <ToolRowShell toolName={message.toolName} args={message.args} createdAt={message.createdAt} active={active} />
                {hasChildren ? (
                    <ul
                        data-slot="chat-message-tool-call-children"
                        className="ml-3 flex list-none flex-col gap-1 border-l border-muted-foreground/30 pl-3"
                    >
                        {childMessages!.map((child) =>
                            child.__typename === 'ChatMessageToolCall' ? (
                                <li key={child.chatMessageId} className="text-xs text-muted-foreground">
                                    <div className="inline-flex items-center gap-2">
                                        <ChildToolLabel toolName={child.toolName} locale={locale} />
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

function ChildToolLabel({ toolName, locale }: { toolName: string; locale: 'de' | 'en' }) {
    const { Icon, label } = toolDisplay(toolName);
    return (
        <>
            <Icon aria-hidden className="size-3 shrink-0" />
            <span>{label[locale]}</span>
        </>
    );
}
