import { useCallback, useState } from 'react';
import { useMutation } from 'urql';
import { ChatMessageCreateDocument } from '../graphql/generated';
import { uploadFile } from './fileUpload';
import { MessageComposer } from '../components/MessageComposer';
import type { ComposerAttachment } from '../components/MessageComposer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/base/select';

// `auto` lets the assistant invoke tools directly; `manual` flips
// `requireToolCallApprovals` so each call surfaces an approval message in the
// transcript before it runs.
type ToolCallApprovalMode = 'auto' | 'manual';

interface ChatComposerProps {
    /** Optional — undefined means "first send creates a new chat". */
    chatId?: string;
    /** Called with the chatId returned by the mutation. For an existing chat
     *  this is just `chatId`; for a new one it's the freshly-allocated id.
     *  Empty-state callers use it to navigate; loaded-state callers can ignore. */
    onMessageSent?: (chatId: string) => void;
    /** True when a turn (this composer's own send, or another flow's submit)
     *  is in flight. Locks the composer so two generations don't race. */
    isLocked: boolean;
    /** Allocate a `generationId` and mount the live-updates listener BEFORE
     *  the mutation fires. From `useChatLiveUpdates`. */
    beginTurn: () => string;
    /** Tear down per-turn state if the mutation errors before the server
     *  could publish anything. From `useChatLiveUpdates`. */
    endTurn: () => void;
}

export function ChatComposer({ chatId, onMessageSent, isLocked, beginTurn, endTurn }: ChatComposerProps) {
    const [draft, setDraft] = useState('');
    // Each composer attachment carries its upload lifecycle. Files are
    // uploaded as soon as they're attached so the eventual send is fast and
    // the per-tile UI shows real progress instead of a deceptive spinner on
    // the Send button.
    const [attachments, setAttachments] = useState<ComposerAttachment[]>([]);
    const [mode, setMode] = useState<ToolCallApprovalMode>('auto');
    const [, sendMessage] = useMutation(ChatMessageCreateDocument);

    const updateAttachment = useCallback((localId: string, patch: Partial<ComposerAttachment>) => {
        setAttachments((current) =>
            current.map((attachment) => (attachment.localId === localId ? { ...attachment, ...patch } : attachment)),
        );
    }, []);

    const onAttachmentsAdd = useCallback(
        (files: File[]) => {
            const additions: ComposerAttachment[] = files.map((file) => ({
                localId: crypto.randomUUID(),
                file,
                status: 'uploading' as const,
            }));
            setAttachments((current) => [...current, ...additions]);
            // Fire each upload independently — the user can keep adding more
            // files (or typing) while earlier ones finish in the background.
            for (const attachment of additions) {
                void (async () => {
                    try {
                        const uploaded = await uploadFile(attachment.file);
                        updateAttachment(attachment.localId, {
                            status: 'uploaded',
                            fileUploadId: uploaded.fileUploadId,
                        });
                    } catch (error) {
                        const message = error instanceof Error ? error.message : 'Upload failed';
                        updateAttachment(attachment.localId, { status: 'error', error: message });
                    }
                })();
            }
        },
        [updateAttachment],
    );

    const onAttachmentRemove = useCallback((localId: string) => {
        setAttachments((current) => current.filter((attachment) => attachment.localId !== localId));
    }, []);

    const submit = useCallback(async () => {
        const message = draft.trim();
        // Send is enabled when there's text OR an attachment — but we still
        // require at least one of those to fire a mutation (an empty send
        // makes no sense and the server would reject the empty body anyway).
        // The `isLocked` prop already gates the composer once a turn is in
        // flight (beginTurn synchronously sets generationId), so we don't
        // need a separate inflight ref here — the only path back into this
        // function while a turn is running would be a programmatic call
        // bypassing the disabled UI, which we don't have.
        const hasUploaded = attachments.some((a) => a.status === 'uploaded');
        if (!message && !hasUploaded) return;

        // Lift the generationId BEFORE firing the mutation so the route's
        // listener mounts and subscribes before any server-side publish can
        // happen. The mutation now returns as soon as the user-side row is
        // durable; the assistant turn runs detached and its `TurnEnded`
        // event clears the generationId at the route level (which unlocks
        // the composer).
        const generationId = beginTurn();
        const sentAttachments = attachments;
        // Only forward successfully-uploaded ids — errored tiles are kept on
        // screen so the user can decide to retry-by-removal-and-re-add, but
        // they don't ride the mutation.
        const fileUploadIds = attachments
            .filter((attachment) => attachment.status === 'uploaded' && attachment.fileUploadId)
            .map((attachment) => attachment.fileUploadId!);
        setDraft('');
        setAttachments([]);

        const result = await sendMessage({
            chatId,
            message,
            fileUploadIds,
            generationId,
            requireToolCallApprovals: mode === 'manual',
        });

        if (result.error || !result.data?.user.chatMessageCreate) {
            // Restore the draft so the user doesn't lose their text on a
            // transport failure. We restore the attachment tiles too — they
            // already point at server-side rows (the upload succeeded), so
            // resending after a transport blip is "press Send again", not a
            // re-upload. Clear the generationId since no turn is actually
            // running.
            setDraft(message);
            setAttachments(sentAttachments);
            endTurn();
            return;
        }
        // Don't clear `generationId` on success — the turn is still running
        // detached on the server. The `TurnEnded` event clears it.
        onMessageSent?.(result.data.user.chatMessageCreate.chatId);
    }, [attachments, chatId, draft, mode, onMessageSent, sendMessage, beginTurn, endTurn]);

    return (
        <MessageComposer
            value={draft}
            onValueChange={setDraft}
            onSubmit={() => void submit()}
            disabled={isLocked}
            busy={isLocked}
            placeholder="Type a message…"
            attachments={attachments}
            onAttachmentsAdd={onAttachmentsAdd}
            onAttachmentRemove={onAttachmentRemove}
            addonStart={
                <Select value={mode} onValueChange={(value) => setMode(value as ToolCallApprovalMode)} disabled={isLocked}>
                    <SelectTrigger size="sm" aria-label="Tool call approval mode" className="h-7 gap-1 px-2 text-xs">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="auto">Auto</SelectItem>
                        <SelectItem value="manual">Manual</SelectItem>
                    </SelectContent>
                </Select>
            }
        />
    );
}
