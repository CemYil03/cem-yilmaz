import { CheckCircleIcon, XCircleIcon } from 'lucide-react';
import type { GqlCChatMessageToolApprovalResponse } from '../../graphql/generated';
import { cn } from '../../utils/cn';
import { MessageRow, Timestamp } from './shared';

export function ChatMessageToolApprovalResponseView({ message }: { message: GqlCChatMessageToolApprovalResponse }) {
    const Icon = message.approved ? CheckCircleIcon : XCircleIcon;
    const label = message.approved ? 'Approved' : 'Declined';
    return (
        <MessageRow side="system">
            <div className="flex flex-col items-start gap-1">
                <div
                    data-slot="chat-message-tool-approval-response"
                    data-approved={message.approved}
                    className={cn(
                        'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs',
                        message.approved
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                            : 'bg-destructive/10 text-destructive',
                    )}
                >
                    <Icon aria-hidden />
                    <span>{label}</span>
                    <Timestamp iso={message.createdAt} className="mt-0 opacity-80" />
                </div>
                {/* The optional human-typed justification rides through to the
                    LLM via `toModelMessages`, but we also surface it in the
                    transcript so the human's reasoning is visible alongside
                    their decision. */}
                {message.reason ? (
                    <p data-slot="chat-message-tool-approval-response-reason" className="px-3 text-xs italic text-muted-foreground">
                        “{message.reason}”
                    </p>
                ) : null}
            </div>
        </MessageRow>
    );
}
