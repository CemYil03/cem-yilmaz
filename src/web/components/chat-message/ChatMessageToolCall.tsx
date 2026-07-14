import type { GqlCChatMessage, GqlCChatMessageToolCall } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { cn } from '../../utils/cn';
import { toolDisplay } from '../../chat/toolDisplay';
import { interpretToolResult } from '../../chat/toolResult';
import { MessageRow, Timestamp, ToolArgumentsButton, ToolRowShell, ToolStatusIcon } from './shared';

// Renders one tool-call row in the transcript. The base pill (friendly tool
// label + status glyph + args/result inspector + timestamp, plus an expandable
// result summary) is `ToolRowShell`. Rows sit on the left rail (see
// `MessageRow` side="system").
//
// `active` is true only for the trailing tool-call row while the turn is still
// in flight — the transcript threads it down so the pill shows the in-progress
// spinner + shimmer until the assistant streams text or the turn ends. See
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
    const hasChildren = (childMessages?.length ?? 0) > 0;
    return (
        <MessageRow side="system">
            <div data-slot="chat-message-tool-call" className="flex max-w-full flex-col items-stretch gap-1">
                <ToolRowShell
                    toolName={message.toolName}
                    args={message.args}
                    result={message.toolResult}
                    createdAt={message.createdAt}
                    active={active}
                />
                {hasChildren ? (
                    <ul
                        data-slot="chat-message-tool-call-children"
                        className="ml-3 flex list-none flex-col gap-1 border-l border-muted-foreground/30 pl-3"
                    >
                        {childMessages!.map((child) =>
                            child.__typename === 'ChatMessageToolCall' ? <ChildToolRow key={child.chatMessageId} child={child} /> : null,
                        )}
                    </ul>
                ) : null}
            </div>
        </MessageRow>
    );
}

// One child (sub-agent) tool row. Denser than the parent pill: friendly label,
// a status glyph, the args/result inspector, a timestamp, and — when the tool
// returned a summary — a single clamped line (no expander here; the density of
// the child list is the point, and the full result is one click away in the
// inspector).
function ChildToolRow({ child }: { child: GqlCChatMessageToolCall }) {
    const locale = useLocale();
    const { Icon, label } = toolDisplay(child.toolName);
    const { status, summary } = interpretToolResult(child.toolResult, false);
    return (
        <li className="flex flex-col gap-0.5 text-xs text-muted-foreground">
            <div className="group/tool-row inline-flex max-w-full items-center gap-2">
                <Icon aria-hidden className="size-3 shrink-0" />
                <span className="truncate">{label[locale]}</span>
                <ToolStatusIcon status={status} className="size-3 shrink-0" />
                <ToolArgumentsButton toolName={child.toolName} args={child.args} result={child.toolResult} />
                <Timestamp iso={child.createdAt} className="mt-0" />
            </div>
            {summary ? (
                <span className={cn('ml-5 line-clamp-1 min-w-0', status === 'failed' && 'text-destructive/90')}>{summary}</span>
            ) : null}
        </li>
    );
}
