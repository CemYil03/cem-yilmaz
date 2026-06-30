import { useCallback, useState } from 'react';
import type { Locale } from '../utils/locale';
import type { ReactNode } from 'react';
import type { TypedDocumentNode } from 'urql';
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
    locale: Locale;
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
    /** Which `chatMessageCreate` mutation to send. Defaults to the visitor
     *  mutation (`Mutation.chatMessageCreate`); the workspace assistant route
     *  passes the `admin.chatMessageCreate` variant so the same UI dispatches
     *  to `agentPersonalAssistant` instead. See
     *  `docs/architecture/multi-agent-chat.md`. */
    sendMutation?: TypedDocumentNode<unknown, ChatMessageCreateVariables>;
    /** Pulls `{ chatId }` out of the mutation result. Defaults to the
     *  visitor shape (`data.chatMessageCreate`); the workspace caller passes
     *  `(data) => data?.admin?.chatMessageCreate ?? null`. Returning `null`
     *  is treated as a transport failure (draft restored, turn cleared). */
    extractResult?: (data: unknown) => { chatId: string } | null;
    /** Localized placeholder. Defaults to "Type a message…". */
    placeholder?: string;
    /** Focus the composer on mount. Use on landing surfaces where the
     *  composer is the primary affordance (e.g. `/workspace`). */
    autoFocus?: boolean;
    /** Render the tool-call approval-mode selector (Auto / Manual) at the
     *  bottom-left of the composer. Defaults to true. The visitor dialog
     *  passes `false` — page visitors never need to gate tool calls. */
    showApprovalMode?: boolean;
    /** Catalog of chat models the user can pick from. When passed together
     *  with `selectedModelId` and `onModelChange`, the composer renders a
     *  model-selection dropdown in the addon row and uses the selected
     *  model's `supportedMediaTypes` as the file picker's `accept` filter.
     *  Visitor surfaces don't pass these — they stay on the single hardcoded
     *  fallback model. See `docs/features/admin-chat-config.md`. */
    availableModels?: ReadonlyArray<{
        modelId: string;
        label: string;
        supportedMediaTypes: ReadonlyArray<string>;
    }>;
    selectedModelId?: string;
    onModelChange?: (modelId: string) => void;
    /** Extra content rendered in the bottom-left addon slot, beside (or in
     *  place of) the approval-mode selector. Use this to inject
     *  surface-specific controls — the visitor dialog uses it for a
     *  "New chat" button on the loaded transcript. */
    addonStart?: ReactNode;
}

// Both the visitor and admin variants of `chatMessageCreate` accept the same
// argument shape — only the result wrapping differs (`admin { … }`). Typing
// the document on this single variables shape lets one component drive both
// without `any` at the call site.
interface ChatMessageCreateVariables {
    chatId?: string | null;
    message: string;
    fileUploadIds?: string[] | null;
    generationId?: string | null;
    requireToolCallApprovals: boolean;
    modelId?: string | null;
}

const defaultExtractResult = (data: unknown): { chatId: string } | null => {
    const wrapper = data as { chatMessageCreate?: { chatId: string } | null } | null | undefined;
    return wrapper?.chatMessageCreate ?? null;
};

export function ChatComposer({
    chatId,
    onMessageSent,
    isLocked,
    beginTurn,
    endTurn,
    sendMutation = ChatMessageCreateDocument as unknown as TypedDocumentNode<unknown, ChatMessageCreateVariables>,
    extractResult = defaultExtractResult,
    placeholder = 'Type a message…',
    autoFocus = false,
    showApprovalMode = true,
    availableModels,
    selectedModelId,
    onModelChange,
    addonStart,
    locale,
}: ChatComposerProps) {
    const [draft, setDraft] = useState('');
    // Each composer attachment carries its upload lifecycle. Files are
    // uploaded as soon as they're attached so the eventual send is fast and
    // the per-tile UI shows real progress instead of a deceptive spinner on
    // the Send button.
    const [attachments, setAttachments] = useState<ComposerAttachment[]>([]);
    const [mode, setMode] = useState<ToolCallApprovalMode>('auto');
    const [, sendMessage] = useMutation(sendMutation);

    // The active model gates which file types the picker accepts. Only the
    // workspace surface passes `availableModels`; visitor surfaces leave this
    // undefined so the picker stays permissive (no `accept` filter).
    const activeModel = availableModels?.find((model) => model.modelId === selectedModelId) ?? null;
    const acceptedMediaTypes = activeModel ? activeModel.supportedMediaTypes.join(',') : undefined;
    // Human tooltip on the paperclip — "Attach files (PDF, Word, …)" — so the
    // user knows what the active model accepts before opening the picker.
    const attachmentsTitle = activeModel
        ? {
              de: `Anhängen (${formatMediaTypeHint(activeModel.supportedMediaTypes)})`,
              en: `Attach (${formatMediaTypeHint(activeModel.supportedMediaTypes)})`,
          }[locale]
        : undefined;

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
            modelId: selectedModelId ?? null,
        });

        const created = result.data ? extractResult(result.data) : null;
        if (result.error || !created) {
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
        onMessageSent?.(created.chatId);
    }, [attachments, chatId, draft, mode, onMessageSent, sendMessage, beginTurn, endTurn, extractResult, selectedModelId]);

    return (
        <MessageComposer
            value={draft}
            onValueChange={setDraft}
            onSubmit={() => void submit()}
            disabled={isLocked}
            busy={isLocked}
            placeholder={placeholder}
            autoFocus={autoFocus}
            sendLabel={{ de: 'Senden', en: 'Send' }[locale]}
            attachments={attachments}
            onAttachmentsAdd={onAttachmentsAdd}
            onAttachmentRemove={onAttachmentRemove}
            accept={acceptedMediaTypes}
            attachmentsTitle={attachmentsTitle}
            addonStart={
                <>
                    {addonStart}
                    {availableModels && selectedModelId && onModelChange ? (
                        <Select value={selectedModelId} onValueChange={onModelChange} disabled={isLocked}>
                            <SelectTrigger size="sm" aria-label={{ de: 'Modell', en: 'Model' }[locale]} className="h-7 gap-1 px-2 text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {availableModels.map((model) => (
                                    <SelectItem key={model.modelId} value={model.modelId}>
                                        {model.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    ) : null}
                    {showApprovalMode ? (
                        <Select value={mode} onValueChange={(value) => setMode(value as ToolCallApprovalMode)} disabled={isLocked}>
                            <SelectTrigger size="sm" aria-label="Tool call approval mode" className="h-7 gap-1 px-2 text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="auto">Auto</SelectItem>
                                <SelectItem value="manual">Manual</SelectItem>
                            </SelectContent>
                        </Select>
                    ) : null}
                </>
            }
        />
    );
}

// Shortens a list of IANA media types into a tooltip-friendly hint —
// `application/pdf` → "PDF",
// `application/vnd.openxmlformats-officedocument.wordprocessingml.document` → "Word",
// any `image/*` collapses to "images". Used only for the paperclip tooltip;
// the actual `accept` filter still carries the full list.
function formatMediaTypeHint(mediaTypes: ReadonlyArray<string>): string {
    const labels = new Set<string>();
    for (const mediaType of mediaTypes) {
        if (mediaType.startsWith('image/')) {
            labels.add('images');
        } else if (mediaType === 'application/pdf') {
            labels.add('PDF');
        } else if (mediaType.includes('wordprocessingml') || mediaType === 'application/msword') {
            labels.add('Word');
        } else if (mediaType.includes('spreadsheetml') || mediaType === 'application/vnd.ms-excel') {
            labels.add('Excel');
        } else if (mediaType.startsWith('text/')) {
            labels.add('text');
        }
    }
    return Array.from(labels).join(', ');
}
