import { ShieldCheckIcon } from 'lucide-react';
import { useState } from 'react';
import type { GqlCChatMessageToolApprovalRequest } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { toolDisplayLabel } from '../../chat/toolDisplay';
import { AssistantReasoning } from '../AssistantReasoning';
import { Button } from '../base/button';
import { Card, CardContent, CardHeader, CardTitle } from '../base/card';
import { Textarea } from '../base/textarea';
import { MessageRow, Timestamp, ToolArgumentsButton } from './shared';

export function ChatMessageToolApprovalRequestView({
    message,
    onRespond,
    reasoningText,
}: {
    message: GqlCChatMessageToolApprovalRequest;
    onRespond?: (approvalId: string, approved: boolean, reason?: string) => void;
    reasoningText?: string;
}) {
    const locale = useLocale();
    // Two-step Decline: first click reveals the optional-reason textarea,
    // second click commits with `approved: false` and the typed reason (or
    // `undefined` for an empty draft). Approve stays one click — the SDK
    // treats `reason` as optional on either side of the response, but only
    // declines surface the textarea today.
    const [mode, setMode] = useState<'idle' | 'declining'>('idle');
    const [reasonDraft, setReasonDraft] = useState('');

    const handleConfirmDecline = () => {
        if (!onRespond) return;
        const trimmed = reasonDraft.trim();
        onRespond(message.approvalId, false, trimmed.length > 0 ? trimmed : undefined);
    };

    return (
        <MessageRow side="system">
            <div className="flex w-full max-w-md flex-col gap-2">
                {reasoningText ? <AssistantReasoning text={reasoningText} /> : null}
                <Card className="w-full gap-2 py-4">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-sm">
                            <ShieldCheckIcon aria-hidden />
                            Approval requested
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-2">
                        <p className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>
                                {
                                    {
                                        de: `Der Assistent möchte „${toolDisplayLabel(message.toolName, locale)}“ ausführen.`,
                                        en: `The assistant wants to run “${toolDisplayLabel(message.toolName, locale)}”.`,
                                    }[locale]
                                }
                            </span>
                            <ToolArgumentsButton toolName={message.toolName} args={message.args} />
                        </p>
                        {onRespond && mode === 'idle' ? (
                            <div className="flex gap-2">
                                <Button size="sm" onClick={() => onRespond(message.approvalId, true)}>
                                    Approve
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => setMode('declining')}>
                                    Decline
                                </Button>
                            </div>
                        ) : null}
                        {onRespond && mode === 'declining' ? (
                            <div className="grid gap-2">
                                <Textarea
                                    aria-label="Optional reason for declining"
                                    placeholder="Optional: why decline?"
                                    value={reasonDraft}
                                    onChange={(event) => setReasonDraft(event.target.value)}
                                    rows={3}
                                    autoFocus
                                />
                                <div className="flex gap-2">
                                    <Button size="sm" variant="outline" onClick={handleConfirmDecline}>
                                        Confirm decline
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                            setMode('idle');
                                            setReasonDraft('');
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        ) : null}
                        <Timestamp iso={message.createdAt} />
                    </CardContent>
                </Card>
            </div>
        </MessageRow>
    );
}
