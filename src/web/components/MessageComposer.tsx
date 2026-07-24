import { ArrowUpIcon, CheckIcon, FileIcon, PaperclipIcon, XIcon } from 'lucide-react';
import type { ChangeEvent, DragEvent, ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { formatBytes } from '../../shared';
import { useIsMobile } from '../hooks/use-mobile';
import { useLocale } from '../hooks/useLocale';
import { cn } from '../utils/cn';
import {
    Attachment,
    AttachmentAction,
    AttachmentActions,
    AttachmentContent,
    AttachmentDescription,
    AttachmentGroup,
    AttachmentMedia,
    AttachmentTitle,
} from './base/attachment';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupTextarea } from './base/input-group';
import { Spinner } from './base/spinner';
import { Tooltip, TooltipContent, TooltipTrigger } from './base/tooltip';

// Generic chat-style composer surface — a textarea inside an `<InputGroup>`
// whose `block-end` addon hosts the Send button. The component is fully
// controlled and stateless: the parent owns the draft, the submit semantics,
// and any inflight/lock state. Chat-specific controls (e.g. a tool-call mode
// selector) plug into the bottom addon via the `addonStart` slot so the
// component itself stays decoupled from any one feature.
//
// Visual identity (see docs/styles/motion.md, "Composer states"):
// - Focus: brand-tinted ring on the wrapper (`--brand`), the same hue as the
//   ambient backdrop orb and links — ties the composer into the site's
//   visual system rather than the neutral `--ring` default.
// - Draft-ready: the Send button lifts (−1px translate) and fades from
//   muted to full opacity the instant the draft is non-empty, answering
//   "I noticed you typed something."
// - Submitting: SendIcon crossfades to a Spinner.
// - Just landed: a CheckIcon flashes for ~700ms after a send completes
//   (busy → !busy transition), confirming the message went out.
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
    /** Called when the user clicks Send (or presses Enter on desktop). The
     *  parent decides what "submit" means (e.g. fire a mutation, validate,
     *  navigate). On mobile, Enter inserts a newline and only Send submits. */
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
    /** Optional tooltip / aria-label on the paperclip button — useful for callers that
     *  want to surface "PDF, Word, images" alongside the icon so the user knows
     *  what types the active model accepts before they open the picker. Falls
     *  back to a bilingual "Attach files" label when unset. */
    attachmentsTitle?: string;
    /** Whether the picker accepts multiple files at once. Defaults to true.
     *  Drops are similarly clamped to one file when this is false. */
    multipleAttachments?: boolean;
    /** `name` attribute on the underlying textarea. Set so browsers (and
     *  accessibility tooling) can identify the field — without it Chrome
     *  logs "A form field element should have an id or name attribute".
     *  Defaults to `'message'`. */
    name?: string;
    /** Focus the textarea on mount. Use on landing pages where the composer
     *  is the page's primary affordance (e.g. the workspace hub) so the user
     *  can start typing without clicking. */
    autoFocus?: boolean;
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
    attachments,
    onAttachmentsAdd,
    onAttachmentRemove,
    accept,
    attachmentsTitle,
    multipleAttachments = true,
    name = 'message',
    autoFocus = false,
}: MessageComposerProps) {
    const locale = useLocale();
    const isMobile = useIsMobile();
    const sendLabel = { de: 'Senden', en: 'Send' }[locale];
    const attachLabel = attachmentsTitle ?? { de: 'Anhängen', en: 'Attach files' }[locale];
    const attachmentsEnabled = onAttachmentsAdd !== undefined && onAttachmentRemove !== undefined;
    const currentAttachments = attachments ?? [];
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    // Brief CheckIcon after a send lands ("did it hear me?"). Driven by the
    // same busy→!busy edge as the focus refocus, kept up for 700ms — long
    // enough to register, short enough to clear before the next keystroke.
    const [showSent, setShowSent] = useState(false);

    // After a send, the parent flips `busy` back to false once the turn is
    // accepted (or instantly on a new chat after navigation). Pull focus
    // straight back to the textarea so the user can keep typing without
    // reaching for the mouse — the textarea was disabled mid-turn, which
    // moves focus to <body>, so this is a real refocus, not a no-op. The
    // same edge also fires the "sent" check flash.
    const wasBusyRef = useRef(busy);
    useEffect(() => {
        if (wasBusyRef.current && !busy) {
            textareaRef.current?.focus();
            setShowSent(true);
            const timeout = window.setTimeout(() => setShowSent(false), 700);
            wasBusyRef.current = busy;
            return () => window.clearTimeout(timeout);
        }
        wasBusyRef.current = busy;
    }, [busy]);
    // Initial autoFocus — opt-in via prop. Runs once on mount so the
    // composer can be the landing affordance on pages like the workspace
    // hub. We use an effect rather than the textarea's native `autoFocus`
    // attribute because the latter is a no-op on hydration when the input
    // mounts already disabled (the busy/disabled flags can flicker on
    // mount), and it doesn't compose with the post-turn refocus above.
    useEffect(() => {
        if (autoFocus) textareaRef.current?.focus();
        // Mount-only: changing `autoFocus` later shouldn't yank focus from
        // wherever the user currently is.
    }, []);
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
            <InputGroup
                className={cn(
                    'bg-white dark:bg-black transition-[box-shadow,border-color] duration-200',
                    // Focus ring uses --brand so the composer ties into the
                    // ambient backdrop orb and link colour. Overrides the
                    // neutral default from the base InputGroup primitive.
                    'has-[[data-slot=input-group-control]:focus-visible]:border-brand has-[[data-slot=input-group-control]:focus-visible]:ring-[3px] has-[[data-slot=input-group-control]:focus-visible]:ring-brand/30',
                    {
                        'border-brand ring-[3px] ring-brand/30': isDragOver,
                    },
                    'rounded-2xl',
                )}
            >
                {attachmentsEnabled && hasAttachments ? (
                    <InputGroupAddon align="block-start" className="gap-0 py-1">
                        {/* AttachmentGroup lays the tiles in a horizontally
                            scrollable row with scroll-fade-x on the edges,
                            so a long list stays browsable without wrapping
                            the composer. */}
                        <AttachmentGroup>
                            {currentAttachments.map((attachment) => (
                                <AttachmentPreview
                                    key={attachment.localId}
                                    attachment={attachment}
                                    disabled={inputsLocked}
                                    onRemove={() => onAttachmentRemove(attachment.localId)}
                                />
                            ))}
                        </AttachmentGroup>
                    </InputGroupAddon>
                ) : null}

                <InputGroupTextarea
                    ref={textareaRef}
                    name={name}
                    value={value}
                    onChange={(event) => onValueChange(event.target.value)}
                    onKeyDown={(event) => {
                        // Desktop: Enter sends, Shift+Enter inserts a
                        // newline — the expected chat shortcut on every
                        // comparable surface. Mobile soft keyboards: Enter
                        // must insert a newline; only the Send button
                        // submits. Intercepting Enter on mobile made the
                        // return key fire form submit with no way to
                        // multi-line.
                        if (isMobile) return;
                        if (event.key === 'Enter' && !event.shiftKey) {
                            event.preventDefault();
                            submit();
                        }
                    }}
                    // Soft keyboards label the return key from this hint.
                    // `enter` keeps the newline glyph on mobile; `send`
                    // is fine on desktop where Enter already submits.
                    enterKeyHint={isMobile ? 'enter' : 'send'}
                    placeholder={placeholder}
                    disabled={inputsLocked}
                    rows={rows}
                    // `field-sizing: content` lets the textarea grow with
                    // its content (capped via max-h) the way Gemini's
                    // composer does. `rows` sets the minimum; the cap
                    // keeps a runaway paste from pushing the page.
                    className="field-sizing-content max-h-[40vh]"
                />

                <InputGroupAddon align="block-end" className="min-w-0 gap-1.5">
                    {/* Left cluster can shrink/truncate; attach + send stay
                        pinned and never get shoved past the composer edge
                        (narrow workspace sidebar packs model + mode + ring). */}
                    {addonStart ? <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">{addonStart}</div> : null}
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
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <InputGroupButton
                                        type="button"
                                        variant="ghost"
                                        size="icon-xs"
                                        // ml-auto only when there is no left cluster —
                                        // otherwise the flex-1 wrapper already pushes
                                        // this group to the trailing edge.
                                        className={addonStart ? 'shrink-0' : 'ml-auto shrink-0'}
                                        disabled={inputsLocked}
                                        aria-label={attachLabel}
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <PaperclipIcon />
                                    </InputGroupButton>
                                </TooltipTrigger>
                                <TooltipContent side="top">{attachLabel}</TooltipContent>
                            </Tooltip>
                        </>
                    ) : null}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <InputGroupButton
                                type="submit"
                                variant="default"
                                size="icon-xs"
                                className={cn(
                                    // Lift + colour-shift the instant the draft is
                                    // non-empty — answers "I noticed you typed
                                    // something." Tailwind's `disabled:` already
                                    // dims the button via opacity-50, so this just
                                    // adds a tiny rise on the ready state.
                                    'shrink-0 transition-all duration-200',
                                    'enabled:-translate-y-px',
                                    'motion-reduce:enabled:translate-y-0',
                                    attachmentsEnabled || addonStart ? undefined : 'ml-auto',
                                )}
                                disabled={!canSubmit}
                                aria-label={sendLabel}
                            >
                                {/* Icon stack — exactly one visible at a time,
                                    crossfaded so the swap reads as a state
                                    change rather than a pop. */}
                                <span className="relative grid place-items-center">
                                    <ArrowUpIcon
                                        aria-hidden
                                        className={cn('transition-opacity duration-150', busy || showSent ? 'opacity-0' : 'opacity-100')}
                                    />
                                    <Spinner
                                        aria-hidden
                                        className={cn(
                                            'absolute inset-0 transition-opacity duration-150',
                                            busy ? 'opacity-100' : 'opacity-0',
                                        )}
                                    />
                                    <CheckIcon
                                        aria-hidden
                                        className={cn(
                                            'absolute inset-0 transition-opacity duration-150',
                                            !busy && showSent ? 'opacity-100' : 'opacity-0',
                                        )}
                                    />
                                </span>
                            </InputGroupButton>
                        </TooltipTrigger>
                        <TooltipContent side="top">{sendLabel}</TooltipContent>
                    </Tooltip>
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

    // Map the composer's tri-state upload lifecycle onto the shadcn
    // `Attachment` state prop. The primitive drives the visual treatment —
    // dashed border for idle, shimmer on the title while uploading,
    // destructive tint on error, solid on done — so we don't have to
    // hand-roll overlays for each state. `orientation="vertical"` gives us
    // the stacked-image tile the previous inline preview was building by
    // hand.
    const attachmentState = status === 'uploading' ? 'uploading' : status === 'error' ? 'error' : 'done';
    const description = status === 'error' ? error : formatBytes(file.size);

    return (
        <Attachment size="sm" orientation="vertical" state={attachmentState} title={status === 'error' ? error : undefined}>
            <AttachmentMedia variant={isImage && objectUrl ? 'image' : 'icon'}>
                {isImage && objectUrl ? <img src={objectUrl} alt={file.name} /> : <FileIcon aria-hidden />}
            </AttachmentMedia>
            <AttachmentContent>
                <AttachmentTitle>{file.name}</AttachmentTitle>
                {description ? <AttachmentDescription>{description}</AttachmentDescription> : null}
            </AttachmentContent>
            <AttachmentActions>
                <AttachmentAction type="button" disabled={disabled} onClick={onRemove} aria-label={`Remove ${file.name}`}>
                    <XIcon aria-hidden />
                </AttachmentAction>
            </AttachmentActions>
        </Attachment>
    );
}
