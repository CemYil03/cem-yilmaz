import { useState } from 'react';
import type { GqlCChatMessageUser } from '../../graphql/generated';
import { ChatAttachmentPreviewDialog } from './ChatAttachmentPreviewDialog';
import { ChatAttachmentTileGrid } from './ChatAttachmentTileGrid';
import { Bubble, MessageRow, Timestamp } from './shared';

export function ChatMessageUserView({ message }: { message: GqlCChatMessageUser }) {
    const hasAttachments = message.attachments.length > 0;
    // Open + index live here so the bubble owns the open lifecycle and the
    // grid stays purely presentational. Index is preserved across close/reopen
    // — closing and re-clicking the same tile is a no-op against the cache
    // inside `<ChatAttachmentPreviewDialog />`.
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewIndex, setPreviewIndex] = useState(0);

    const openPreviewAt = (index: number) => {
        setPreviewIndex(index);
        setPreviewOpen(true);
    };

    return (
        <MessageRow side="user">
            <Bubble tone="user">
                {hasAttachments ? (
                    <div className="mb-2">
                        <ChatAttachmentTileGrid attachments={message.attachments} onTileClick={openPreviewAt} />
                    </div>
                ) : null}
                {message.body.length > 0 ? <div className="whitespace-pre-wrap wrap-break-word">{message.body}</div> : null}
                <Timestamp iso={message.createdAt} />
            </Bubble>
            {hasAttachments ? (
                <ChatAttachmentPreviewDialog
                    open={previewOpen}
                    onOpenChange={setPreviewOpen}
                    attachments={message.attachments}
                    index={previewIndex}
                    onIndexChange={setPreviewIndex}
                />
            ) : null}
        </MessageRow>
    );
}
