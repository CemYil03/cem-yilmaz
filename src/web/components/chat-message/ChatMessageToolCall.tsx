import { FileTextIcon } from 'lucide-react';
import { useDocumentPanel } from '../../chat/DocumentPanelProvider';
import { toolDisplay } from '../../chat/toolDisplay';
import { interpretToolResult } from '../../chat/toolResult';
import type { GqlCChatMessage, GqlCChatMessageToolCall } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { cn } from '../../utils/cn';
import { AssistantReasoning } from '../AssistantReasoning';
import {
    Attachment,
    AttachmentContent,
    AttachmentDescription,
    AttachmentMedia,
    AttachmentTitle,
    AttachmentTrigger,
} from '../base/attachment';
import { MessageRow, Timestamp, ToolArgumentsButton, ToolRowShell, ToolStatusIcon } from './shared';

// A `workspaceFileCreate` tool result carries the created file's id + names.
// The column is the GraphQL `JSON` scalar (typed `unknown` on the client), so
// we narrow defensively before rendering the attachment card.
interface CreatedWorkspaceFile {
    workspaceFileId: string;
    filename: string;
    label: string | null;
}

function createdWorkspaceFileFromResult(result: unknown): CreatedWorkspaceFile | null {
    if (!result || typeof result !== 'object') return null;
    const record = result as Record<string, unknown>;
    if (typeof record.workspaceFileId !== 'string' || typeof record.filename !== 'string') return null;
    return {
        workspaceFileId: record.workspaceFileId,
        filename: record.filename,
        label: typeof record.label === 'string' ? record.label : null,
    };
}

// Renders one tool-call row in the transcript. The base pill (friendly tool
// label + status glyph + args/result inspector + timestamp, plus an expandable
// result summary) is `ToolRowShell`. Rows sit on the left rail (see
// `MessageRow` side="system").
//
// `active` is true only for the trailing open tool-call row (`toolResult`
// still null) while the turn is in flight — the transcript threads it down so
// the pill shows the in-progress spinner + shimmer until the result lands
// (then the pending "Thinking…" row takes over until answer text). See
// docs/styles/chat.md.
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
    reasoningText,
}: {
    message: GqlCChatMessageToolCall;
    childMessages?: ReadonlyArray<GqlCChatMessage>;
    active?: boolean;
    /** Resolved thought summary for this step (live or persisted). */
    reasoningText?: string;
}) {
    const hasChildren = (childMessages?.length ?? 0) > 0;
    // A completed `workspaceFileCreate` grows a clickable document attachment
    // card beneath its normal tool pill — the pill keeps the turn's "the
    // assistant used a tool" record intact, and the card is the affordance to
    // open the file. While the call is still in flight (no result yet) the card
    // is absent and only the shimmering pill shows; it appears once the id lands.
    const createdFile = message.toolName === 'workspaceFileCreate' ? createdWorkspaceFileFromResult(message.toolResult) : null;
    return (
        <MessageRow side="system">
            <div data-slot="chat-message-tool-call" className="flex max-w-full flex-col items-stretch gap-1">
                {reasoningText ? <AssistantReasoning text={reasoningText} /> : null}
                <ToolRowShell
                    toolName={message.toolName}
                    args={message.args}
                    result={message.toolResult}
                    createdAt={message.createdAt}
                    active={active}
                />
                {createdFile ? <WorkspaceFileAttachment file={createdFile} /> : null}
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
// inspector). Nested steps have no live stream artifact, so Thoughts come
// only from the persisted `child.reasoning` column.
function ChildToolRow({ child }: { child: GqlCChatMessageToolCall }) {
    const locale = useLocale();
    const { Icon, label } = toolDisplay(child.toolName);
    const { status, summary } = interpretToolResult(child.toolResult, false);
    const reasoning = child.reasoning ?? undefined;
    return (
        <li className="flex flex-col gap-0.5 text-xs text-muted-foreground">
            {reasoning ? <AssistantReasoning text={reasoning} className="text-xs" /> : null}
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

// The document card shown beneath a `workspaceFileCreate` tool pill. Clicking
// it opens the file in the assistant sidebar's file-display state via the
// `DocumentPanel` context. When no panel is available (`canOpen` false, e.g.
// the visitor sheet), the card renders inert so it never looks
// clickable-but-dead.
function WorkspaceFileAttachment({ file }: { file: CreatedWorkspaceFile }) {
    const locale = useLocale();
    const { openDocument, canOpen } = useDocumentPanel();
    const title = file.label ?? file.filename;
    const openLabel = { de: 'Dokument öffnen', en: 'Open document' }[locale];
    return (
        <Attachment orientation="horizontal" className={cn('max-w-full', canOpen && 'cursor-pointer')}>
            <AttachmentMedia>
                <FileTextIcon aria-hidden />
            </AttachmentMedia>
            <AttachmentContent>
                <AttachmentTitle>{title}</AttachmentTitle>
                <AttachmentDescription>{file.filename}</AttachmentDescription>
            </AttachmentContent>
            {canOpen ? <AttachmentTrigger aria-label={openLabel} onClick={() => openDocument(file.workspaceFileId)} /> : null}
        </Attachment>
    );
}
