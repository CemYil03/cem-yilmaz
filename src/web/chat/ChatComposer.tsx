import { useCallback, useRef, useState } from 'react';
import type { Locale } from '../utils/locale';
import type { ReactNode } from 'react';
import type { TypedDocumentNode } from 'urql';
import { useMutation } from 'urql';
import { uploadFile } from './fileUpload';
import { MessageComposer } from '../components/MessageComposer';
import type { ComposerAttachment } from '../components/MessageComposer';

// Shared chat-composer base. Owns the per-turn machinery every audience-
// specific composer needs:
//
// - Draft state (`value` / `onValueChange`).
// - Attachment lifecycle: each picked / dropped file is uploaded
//   immediately through `uploadFile()`, the per-tile UI reflects
//   `uploading` / `uploaded` / `error`, and only `uploaded` ids ride the
//   eventual `chatMessageCreate` mutation. Errored tiles stay on screen so
//   the user can decide whether to remove-and-retry.
// - Submit gating (text OR at least one resolved upload) and the
//   `beginTurn` → mutation → `endTurn`-on-failure handshake. The mutation
//   itself is plugged in via `sendMutation`; how to pull `{ chatId }` out
//   of the result is plugged in via `extractResult`.
// - Draft restoration on transport failure.
//
// `ChatComposer` is audience-agnostic — admin vs visitor lives in the
// thin wrappers (`WorkspaceChatComposer.tsx`, `VisitorChatComposer.tsx`)
// that pre-wire the right mutation + extractor and inject their own
// surface controls through `addonStart`. The base only knows how to send.

interface ChatComposerProps {
    locale: Locale;
    /** Optional — undefined means "first send creates a new chat". */
    chatId?: string;
    /** Called with the chatId returned by the mutation. For an existing chat
     *  this is just `chatId`; for a new one it's the freshly-allocated id. */
    onMessageSent?: (chatId: string) => void;
    /** True when a turn for this composer's chat is in flight. Locks the
     *  composer so two generations don't race on the same chat. From the
     *  parent's `live.isGenerating(chatId)`. */
    isLocked: boolean;
    /** Allocate a `generationId` and mount the live-updates listener BEFORE
     *  the mutation fires. Pass the current chatId (undefined on a fresh
     *  send — the generation stays unbound until `bindTurn`). From
     *  `useChatLiveUpdates`. */
    beginTurn: (chatId?: string) => string;
    /** Attach the just-started generation to the chatId the mutation
     *  allocated. Called on send success. From `useChatLiveUpdates`. */
    bindTurn: (generationId: string, chatId: string) => void;
    /** Tear down the generation if the mutation errors before the server
     *  could publish anything. From `useChatLiveUpdates`. */
    endTurn: (generationId: string) => void;
    /** Which `chatMessageCreate` mutation to send. Audience wrappers
     *  inject this — visitor passes `ChatMessageCreateDocument`, admin
     *  passes `WorkspaceChatMessageCreateDocument`. */
    sendMutation: TypedDocumentNode<unknown, ChatMessageCreateVariables>;
    /** Pulls `{ chatId }` out of the mutation result. Audience wrappers
     *  inject this — visitor reads `data.chatMessageCreate`, admin reads
     *  `data.admin.chatMessageCreate`. Returning `null` is treated as a
     *  transport failure (draft restored, turn cleared). */
    extractResult: (data: unknown) => { chatId: string } | null;
    placeholder: string;
    /** Focus the composer on mount. Use on landing surfaces where the
     *  composer is the primary affordance. */
    autoFocus?: boolean;
    /** Forwarded to the `chatMessageCreate` mutation. Admin surfaces set
     *  this from the approval-mode dropdown; visitor surfaces leave it
     *  unset (server treats `undefined` as `false`). */
    requireToolCallApprovals?: boolean;
    /** Optional explicit model id for this send. Admin surfaces forward
     *  the provider's selected model; visitor surfaces leave it
     *  unset and the server uses the configured visitor model. */
    modelId?: string;
    /** When `availableModels` is passed the composer uses the active
     *  model's `supportedMediaTypes` as the file picker's `accept`
     *  filter and shows a tooltip-friendly hint on the paperclip. Only
     *  admin wrappers pass this; visitor surfaces stay on the
     *  permissive default. */
    availableModels?: ReadonlyArray<{
        modelId: string;
        label: string;
        supportedMediaTypes: ReadonlyArray<string>;
        /** Optional — admin catalog only. Used by the workspace composer
         *  for the context-window headroom chip; ignored here. */
        contextWindowTokens?: number;
    }>;
    /** Content rendered in the bottom-left addon slot — wrappers use
     *  this for surface-specific controls (model dropdown, approval-mode
     *  selector, "new chat" button, quota status, …). */
    addonStart?: ReactNode;
    /** Pathname of the route the user was on when they hit Send (e.g.
     *  `/projects`, `/en/cv`, `/workspace/projects/abc`). Forwarded to
     *  the server with each `chatMessageCreate` so the agent's system
     *  prompt can anchor the turn to what the user was probably just
     *  looking at. Wrappers read this from `useLocation().pathname` at
     *  the surface that mounts them. Optional — when undefined the
     *  server omits the page-context line entirely. */
    currentPagePath?: string;
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
    currentPagePath?: string | null;
}

export function ChatComposer({
    chatId,
    onMessageSent,
    isLocked,
    beginTurn,
    bindTurn,
    endTurn,
    sendMutation,
    extractResult,
    placeholder,
    autoFocus = false,
    requireToolCallApprovals = false,
    modelId,
    availableModels,
    addonStart,
    locale,
    currentPagePath,
}: ChatComposerProps) {
    const [draft, setDraft] = useState('');
    // Guards the mutation `await` window. For a fresh send `chatId` is
    // undefined, so `isLocked` (derived from the parent's per-chat
    // `isGenerating`) doesn't yet cover this composer between `beginTurn()`
    // and `bindTurn()` — this ref stops a double-submit landing in that gap
    // and minting a second unbound generation.
    const sendingRef = useRef(false);
    // Each composer attachment carries its upload lifecycle. Files are
    // uploaded as soon as they're attached so the eventual send is fast and
    // the per-tile UI shows real progress instead of a deceptive spinner on
    // the Send button.
    const [attachments, setAttachments] = useState<ComposerAttachment[]>([]);
    const [, sendMessage] = useMutation(sendMutation);

    // The active model gates which file types the picker accepts. Only the
    // admin wrapper passes `availableModels`; visitor surfaces leave this
    // undefined so the picker stays permissive (no `accept` filter).
    const activeModel = availableModels?.find((model) => model.modelId === modelId) ?? null;
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
        // `isLocked` gates a same-chat re-send once a turn is in flight, but
        // on a FRESH send the chat has no id yet so `isLocked` can't cover the
        // `beginTurn`→`bindTurn` gap — `sendingRef` closes it.
        if (sendingRef.current) return;
        const hasUploaded = attachments.some((a) => a.status === 'uploaded');
        if (!message && !hasUploaded) return;

        sendingRef.current = true;
        // Lift the generationId BEFORE firing the mutation so the listener
        // mounts and subscribes before any server-side publish can happen. The
        // generation starts unbound when `chatId` is undefined (fresh chat);
        // `bindTurn` attaches it to the allocated id on success. The mutation
        // returns as soon as the user-side row is durable; the assistant turn
        // runs detached and its `TurnEnded` event ends the generation (which
        // unlocks the composer for that chat).
        const generationId = beginTurn(chatId);
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
            requireToolCallApprovals,
            modelId: modelId ?? null,
            currentPagePath: currentPagePath ?? null,
        });

        sendingRef.current = false;
        const created = result.data ? extractResult(result.data) : null;
        if (result.error || !created) {
            // Restore the draft so the user doesn't lose their text on a
            // transport failure. We restore the attachment tiles too — they
            // already point at server-side rows (the upload succeeded), so
            // resending after a transport blip is "press Send again", not a
            // re-upload. Drop the generation since no turn is actually running.
            setDraft(message);
            setAttachments(sentAttachments);
            endTurn(generationId);
            return;
        }
        // Bind the generation to the allocated chatId so the surface can read
        // its live rows by chat. Don't end it — the turn is still running
        // detached on the server; its `TurnEnded` event ends it.
        bindTurn(generationId, created.chatId);
        onMessageSent?.(created.chatId);
    }, [
        attachments,
        chatId,
        draft,
        onMessageSent,
        sendMessage,
        beginTurn,
        bindTurn,
        endTurn,
        extractResult,
        requireToolCallApprovals,
        modelId,
        currentPagePath,
    ]);

    return (
        <MessageComposer
            value={draft}
            onValueChange={setDraft}
            onSubmit={() => void submit()}
            disabled={isLocked}
            busy={isLocked}
            placeholder={placeholder}
            autoFocus={autoFocus}
            attachments={attachments}
            onAttachmentsAdd={onAttachmentsAdd}
            onAttachmentRemove={onAttachmentRemove}
            accept={acceptedMediaTypes}
            attachmentsTitle={attachmentsTitle}
            addonStart={addonStart}
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
