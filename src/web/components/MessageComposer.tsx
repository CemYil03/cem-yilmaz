import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, DragEvent, ReactNode } from 'react';
import { CircleAlertIcon, FileIcon, PaperclipIcon, SendIcon, XIcon } from 'lucide-react';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupTextarea } from './base/input-group';
import { Spinner } from './base/spinner';
import { cn } from '../utils/cn';

// Generic chat-style composer surface — a textarea inside an `<InputGroup>`
// whose `block-end` addon hosts the Send button. The component is fully
// controlled and stateless: the parent owns the draft, the submit semantics,
// and any inflight/lock state. Chat-specific controls (e.g. a tool-call mode
// selector) plug into the bottom addon via the `addonStart` slot so the
// component itself stays decoupled from any one feature.
//
// Attachments are an opt-in surface: when the parent passes both
// `attachments` and `onAttachmentsChange`, the composer renders a paperclip
// button next to Send, accepts drag-and-drop file drops, and shows a
// horizontal preview row at the top of the input group. Each preview carries
// its own remove button. The component also surfaces per-tile upload state —
// `'uploading'` shows a spinner overlay, `'error'` shows an error overlay
// with a tooltip-style title — but the upload itself is the parent's job:
// the composer never reads file bytes or talks to the network.

// One attached file in the composer's list. The composer accepts `localId` as
// an opaque string the parent owns; it's not interpreted here. `fileUploadId`
// is set once the upload settles — the parent uses it as the value to pass
// through `chatMessageCreate({ fileUploadIds })` on submit.
export interface ComposerAttachment {
    /** Stable identifier the parent assigns at attach-time (e.g. crypto.randomUUID()).
     *  Drives the React key — `File` carries no id, and `(name, size, lastModified)`
     *  collides on duplicate uploads. */
    localId: string;
    file: File;
    status: 'uploading' | 'uploaded' | 'error';
    /** Set once `status === 'uploaded'`. */
    fileUploadId?: string;
    /** Free-form error text rendered as the tile's `title` for tooltip-style hover. */
    error?: string;
}

export interface MessageComposerProps {
    /** Current draft text. */
    value: string;
    /** Called on every keystroke with the next draft text. */
    onValueChange: (value: string) => void;
    /** Called when the user presses Enter or clicks Send. The parent decides
     *  what "submit" means (e.g. fire a mutation, validate, navigate). */
    onSubmit: () => void;
    /** Locks the textarea, the Send button, and any `addonStart` children
     *  (the latter only if those children read `disabled` themselves). */
    disabled?: boolean;
    /** Renders a spinner in the Send button slot instead of the send icon.
     *  Distinct from `disabled` so a parent can disable for non-busy reasons. */
    busy?: boolean;
    placeholder?: string;
    rows?: number;
    /** Optional content rendered inside the bottom addon, left of the Send
     *  button. Use this for feature-specific controls like a mode selector. */
    addonStart?: ReactNode;
    /** Visible Send button label; also used as the submit button's
     *  `aria-label` when no children would describe it otherwise. */
    sendLabel?: string;
    /** Currently-attached files. Pass together with `onAttachmentsChange` to
     *  enable the paperclip button, drop-zone behavior, and preview row. */
    attachments?: readonly ComposerAttachment[];
    /** Called whenever the parent should add new files (picker / drop). The
     *  parent assigns `localId`s, kicks off uploads, and pushes onto its
     *  state. */
    onAttachmentsAdd?: (files: File[]) => void;
    /** Called when the user clicks an X on a tile. The parent removes the
     *  matching `localId` from its state (and may cancel an in-flight upload). */
    onAttachmentRemove?: (localId: string) => void;
    /** Restricts both the file picker and accepted drops. Same syntax as
     *  `<input accept="...">`. */
    accept?: string;
    /** Whether the picker accepts multiple files at once. Defaults to true.
     *  Drops are similarly clamped to one file when this is false. */
    multipleAttachments?: boolean;
}

export function MessageComposer({
    value,
    onValueChange,
    onSubmit,
    disabled = false,
    busy = false,
    placeholder,
    rows = 2,
    addonStart,
    sendLabel = 'Send',
    attachments,
    onAttachmentsAdd,
    onAttachmentRemove,
    accept,
    multipleAttachments = true,
}: MessageComposerProps) {
    const attachmentsEnabled = onAttachmentsAdd !== undefined && onAttachmentRemove !== undefined;
    const currentAttachments = attachments ?? [];
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [isDragOver, setIsDragOver] = useState(false);

    // After a send, the parent flips `busy` back to false once the turn is
    // accepted (or instantly on a new chat after navigation). Pull focus
    // straight back to the textarea so the user can keep typing without
    // reaching for the mouse — the textarea was disabled mid-turn, which
    // moves focus to <body>, so this is a real refocus, not a no-op.
    const wasBusyRef = useRef(busy);
    useEffect(() => {
        if (wasBusyRef.current && !busy) textareaRef.current?.focus();
        wasBusyRef.current = busy;
    }, [busy]);
    // dragenter/dragleave fire for every child crossing — counting depth is
    // the standard way to keep the highlight stable across the textarea,
    // addon, and preview tiles inside the form.
    const dragDepthRef = useRef(0);

    const hasAttachments = currentAttachments.length > 0;
    // Send is gated on (text or at-least-one-attachment) AND no in-flight
    // uploads. Uploads-in-flight blocks send because we'd lose the
    // `fileUploadId` — the parent has nothing to pass to the mutation yet.
    const anyUploading = currentAttachments.some((a) => a.status === 'uploading');
    const canSubmit = !disabled && !busy && !anyUploading && (value.trim().length > 0 || hasAttachments);
    const inputsLocked = disabled || busy;

    const submit = () => {
        if (!canSubmit) return;
        onSubmit();
    };

    const acceptFiles = (incoming: FileList | File[]) => {
        if (!attachmentsEnabled || inputsLocked) return;
        const next = Array.from(incoming);
        if (next.length === 0) return;
        const clamped = multipleAttachments ? next : next.slice(0, 1);
        onAttachmentsAdd(clamped);
    };

    const onPickerChange = (event: ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) acceptFiles(event.target.files);
        // Reset so picking the same file twice in a row still fires `change`.
        event.target.value = '';
    };

    const isFileDrag = (event: DragEvent) => event.dataTransfer.types.includes('Files');

    const onDragEnter = (event: DragEvent<HTMLFormElement>) => {
        if (!attachmentsEnabled || inputsLocked || !isFileDrag(event)) return;
        event.preventDefault();
        dragDepthRef.current += 1;
        setIsDragOver(true);
    };

    const onDragOver = (event: DragEvent<HTMLFormElement>) => {
        if (!attachmentsEnabled || inputsLocked || !isFileDrag(event)) return;
        // preventDefault on dragover is required for the drop event to fire.
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
    };

    const onDragLeave = () => {
        if (!attachmentsEnabled) return;
        dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
        if (dragDepthRef.current === 0) setIsDragOver(false);
    };

    const onDrop = (event: DragEvent<HTMLFormElement>) => {
        if (!attachmentsEnabled || inputsLocked || !isFileDrag(event)) return;
        event.preventDefault();
        dragDepthRef.current = 0;
        setIsDragOver(false);
        if (event.dataTransfer.files.length > 0) acceptFiles(event.dataTransfer.files);
    };

    return (
        <form
            onSubmit={(event) => {
                event.preventDefault();
                submit();
            }}
            onDragEnter={onDragEnter}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
        >
            <InputGroup className={cn(isDragOver && 'border-ring ring-[3px] ring-ring/50')}>
                {attachmentsEnabled && hasAttachments ? (
                    <InputGroupAddon align="block-start" className="flex-wrap gap-2">
                        {currentAttachments.map((attachment) => (
                            <AttachmentPreview
                                key={attachment.localId}
                                attachment={attachment}
                                disabled={inputsLocked}
                                onRemove={() => onAttachmentRemove(attachment.localId)}
                            />
                        ))}
                    </InputGroupAddon>
                ) : null}

                <InputGroupTextarea
                    ref={textareaRef}
                    value={value}
                    onChange={(event) => onValueChange(event.target.value)}
                    onKeyDown={(event) => {
                        // Enter sends, shift+enter inserts a newline — the
                        // expected chat shortcut on every comparable surface.
                        if (event.key === 'Enter' && !event.shiftKey) {
                            event.preventDefault();
                            submit();
                        }
                    }}
                    placeholder={placeholder}
                    disabled={inputsLocked}
                    rows={rows}
                />

                <InputGroupAddon align="block-end">
                    {addonStart}
                    {attachmentsEnabled ? (
                        <>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept={accept}
                                multiple={multipleAttachments}
                                className="hidden"
                                onChange={onPickerChange}
                            />
                            <InputGroupButton
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                // ml-auto on the first of the right-group so addonStart
                                // children stay left-aligned regardless of how many.
                                className="ml-auto"
                                disabled={inputsLocked}
                                aria-label="Attach files"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <PaperclipIcon />
                            </InputGroupButton>
                        </>
                    ) : null}
                    <InputGroupButton
                        type="submit"
                        variant="default"
                        size="sm"
                        className={attachmentsEnabled ? undefined : 'ml-auto'}
                        disabled={!canSubmit}
                        aria-label={sendLabel}
                    >
                        {busy ? <Spinner /> : <SendIcon />}
                        {sendLabel}
                    </InputGroupButton>
                </InputGroupAddon>
            </InputGroup>
        </form>
    );
}

function AttachmentPreview({
    attachment,
    disabled = false,
    onRemove,
}: {
    attachment: ComposerAttachment;
    disabled?: boolean;
    onRemove: () => void;
}) {
    const { file, status, error } = attachment;
    const isImage = file.type.startsWith('image/');
    const [objectUrl, setObjectUrl] = useState<string | null>(null);

    useEffect(() => {
        if (!isImage) return;
        const url = URL.createObjectURL(file);
        setObjectUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [file, isImage]);

    return (
        <div className="relative size-16 shrink-0" title={status === 'error' ? error : undefined}>
            {/* The clip lives on an inner wrapper so the absolutely-positioned
                X button can sit outside the tile without being cut off. */}
            <div className="relative flex size-full items-center justify-center overflow-hidden rounded-md border border-input bg-background">
                {isImage && objectUrl ? (
                    <img src={objectUrl} alt={file.name} className="size-full object-cover" />
                ) : (
                    <div className="flex flex-col items-center justify-center gap-1 p-1 text-[10px] text-muted-foreground">
                        <FileIcon className="size-5" />
                        <span className="line-clamp-2 text-center leading-tight break-all">{file.name}</span>
                    </div>
                )}
                {status === 'uploading' ? (
                    // Translucent overlay so the file preview stays visible
                    // beneath — gives the user a sense the upload is on top of
                    // their file rather than blocking it out.
                    <div className="absolute inset-0 grid place-items-center bg-background/70">
                        <Spinner className="size-4 text-muted-foreground" />
                    </div>
                ) : null}
                {status === 'error' ? (
                    <div className="absolute inset-0 grid place-items-center bg-destructive/20 text-destructive">
                        <CircleAlertIcon className="size-5" />
                    </div>
                ) : null}
            </div>
            <button
                type="button"
                aria-label={`Remove ${file.name}`}
                disabled={disabled}
                onClick={onRemove}
                className="absolute -top-1.5 -right-1.5 grid size-4 place-items-center rounded-full bg-foreground text-background shadow-sm hover:bg-foreground/90 disabled:opacity-50 cursor-pointer"
            >
                <XIcon className="size-3" />
            </button>
        </div>
    );
}
