import { useEffect, useRef, useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, DownloadIcon, ExternalLinkIcon, FileIcon } from 'lucide-react';
import type { GqlCFileUpload } from '../../graphql/generated';
import { cn } from '../../utils/cn';
import { Button } from '../base/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../base/dialog';
import { Spinner } from '../base/spinner';
import { AssistantMarkdown } from '../AssistantMarkdown';
import { formatBytes, previewKindFor } from '../../chat/chatAttachmentPreview';

// Controlled preview dialog for chat attachments. The caller owns both `open`
// and `index`; the dialog renders the attachment at `index` and exposes
// arrow controls + keyboard navigation that update the caller's index.
//
// Type dispatch:
// - `image/*`        → an `<img>` tag (max 70vh, object-contain).
// - `text/markdown`  → fetched + piped through `<AssistantMarkdown />` so the
//                      preview is identical to how the assistant renders the
//                      same markdown body in a reply.
// - other text-ish   → fetched + rendered in a `<pre>` block (covers
//                      `text/*`, JSON, CSV, YAML, common code MIME types).
// - everything else  → a generic info card with filename + size + mime; the
//                      footer's Open / Download buttons remain available.
//
// Text fetches are cached for the dialog's lifetime so flipping back and
// forth between attachments doesn't re-download. Caching across re-mounts
// would need a transport-level cache (URQL / SW) — overkill for files that
// are usually opened once.

interface ChatAttachmentPreviewDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    attachments: ReadonlyArray<GqlCFileUpload>;
    index: number;
    onIndexChange: (index: number) => void;
}

export function ChatAttachmentPreviewDialog({ open, onOpenChange, attachments, index, onIndexChange }: ChatAttachmentPreviewDialogProps) {
    const total = attachments.length;
    // Defensive clamp — if the caller passes an out-of-range index (e.g.
    // attachments shrank under it) we fall back to 0 rather than crashing
    // on an undefined dereference.
    const safeIndex = total === 0 ? 0 : Math.max(0, Math.min(index, total - 1));
    const current = attachments[safeIndex];

    // Text body cache, keyed by fileUploadId. Lives for the dialog's
    // lifetime — re-opens after close start fresh, which matches the
    // "the file may have changed" expectation users have for downloads.
    const textCacheRef = useRef<Map<string, string>>(new Map());
    const [textState, setTextState] = useState<{ status: 'idle' | 'loading' | 'loaded' | 'error'; text: string; error?: string }>({
        status: 'idle',
        text: '',
    });

    const previewKind = current ? previewKindFor(current.mediaType) : 'other';
    const needsTextFetch = open && current !== undefined && (previewKind === 'markdown' || previewKind === 'text');

    useEffect(() => {
        // `needsTextFetch` already implies `current !== undefined`; the type
        // narrowing flows through, so we only need the one guard here.
        if (!needsTextFetch) {
            setTextState({ status: 'idle', text: '' });
            return;
        }
        const cached = textCacheRef.current.get(current.fileUploadId);
        if (cached !== undefined) {
            setTextState({ status: 'loaded', text: cached });
            return;
        }
        const controller = new AbortController();
        setTextState({ status: 'loading', text: '' });
        // Same-origin fetch — the session cookie rides automatically and the
        // download route reuses it for auth.
        void fetch(current.url, { signal: controller.signal })
            .then(async (response) => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                const text = await response.text();
                textCacheRef.current.set(current.fileUploadId, text);
                setTextState({ status: 'loaded', text });
            })
            .catch((error: unknown) => {
                if (controller.signal.aborted) return;
                const message = error instanceof Error ? error.message : 'Failed to load preview';
                setTextState({ status: 'error', text: '', error: message });
            });
        return () => controller.abort();
    }, [needsTextFetch, current]);

    // Keyboard navigation — listens on `window` while the dialog is open so
    // arrow keys work regardless of which element inside the dialog is
    // focused. Esc is already handled by Radix.
    useEffect(() => {
        if (!open || total < 2) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'ArrowLeft') {
                event.preventDefault();
                onIndexChange((safeIndex - 1 + total) % total);
            } else if (event.key === 'ArrowRight') {
                event.preventDefault();
                onIndexChange((safeIndex + 1) % total);
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [open, safeIndex, total, onIndexChange]);

    if (!current) return null;

    const goPrev = () => onIndexChange((safeIndex - 1 + total) % total);
    const goNext = () => onIndexChange((safeIndex + 1) % total);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="grid max-h-[90vh] grid-rows-[auto_1fr_auto] gap-4 sm:max-w-3xl">
                <div className="flex min-w-0 flex-col gap-1 pr-8">
                    <DialogTitle className="truncate text-base">{current.filename}</DialogTitle>
                    <DialogDescription className="text-xs">
                        {current.mediaType} · {formatBytes(current.size)}
                        {total > 1 ? ` · ${safeIndex + 1} of ${total}` : null}
                    </DialogDescription>
                </div>

                <div className="relative flex min-h-0 items-center justify-center overflow-hidden rounded-md bg-muted/40">
                    <div className="flex size-full min-h-0 items-center justify-center overflow-auto p-2">
                        <PreviewBody attachment={current} kind={previewKind} textState={textState} />
                    </div>
                    {total > 1 ? (
                        <>
                            <Button
                                type="button"
                                variant="secondary"
                                size="icon"
                                aria-label="Previous attachment"
                                onClick={goPrev}
                                className="absolute top-1/2 left-2 -translate-y-1/2 shadow-md"
                            >
                                <ChevronLeftIcon />
                            </Button>
                            <Button
                                type="button"
                                variant="secondary"
                                size="icon"
                                aria-label="Next attachment"
                                onClick={goNext}
                                className="absolute top-1/2 right-2 -translate-y-1/2 shadow-md"
                            >
                                <ChevronRightIcon />
                            </Button>
                        </>
                    ) : null}
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2">
                    <Button asChild variant="outline" size="sm">
                        <a href={current.url} target="_blank" rel="noreferrer">
                            <ExternalLinkIcon />
                            Open in new tab
                        </a>
                    </Button>
                    <Button asChild variant="default" size="sm">
                        {/* `download` triggers a save-as with the persisted
                            filename — the GET route serves
                            `Content-Disposition: inline`, so the attribute
                            is what flips the browser to "save" mode. */}
                        <a href={current.url} download={current.filename}>
                            <DownloadIcon />
                            Download
                        </a>
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function PreviewBody({
    attachment,
    kind,
    textState,
}: {
    attachment: GqlCFileUpload;
    kind: ReturnType<typeof previewKindFor>;
    textState: { status: 'idle' | 'loading' | 'loaded' | 'error'; text: string; error?: string };
}) {
    if (kind === 'image') {
        return <img src={attachment.url} alt={attachment.filename} className="max-h-[70vh] max-w-full object-contain" />;
    }

    if (kind === 'markdown' || kind === 'text') {
        if (textState.status === 'loading' || textState.status === 'idle') {
            return <Spinner className="size-5 text-muted-foreground" />;
        }
        if (textState.status === 'error') {
            return <div className="text-sm text-destructive">Could not load preview: {textState.error ?? 'unknown error'}</div>;
        }
        if (kind === 'markdown') {
            return (
                <div className="max-h-[70vh] w-full max-w-full overflow-auto px-2">
                    <AssistantMarkdown text={textState.text} />
                </div>
            );
        }
        return (
            <pre
                className={cn(
                    'max-h-[70vh] w-full max-w-full overflow-auto rounded-md bg-background p-3',
                    'font-mono text-xs leading-relaxed whitespace-pre-wrap wrap-break-word',
                )}
            >
                {textState.text}
            </pre>
        );
    }

    // Generic info card for non-previewable types (PDF, archives, etc.).
    // The user can still hit Open / Download in the footer.
    return (
        <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <FileIcon className="size-12 text-muted-foreground" />
            <div className="flex flex-col gap-1">
                <div className="text-sm font-medium break-all">{attachment.filename}</div>
                <div className="text-xs text-muted-foreground">
                    {attachment.mediaType} · {formatBytes(attachment.size)}
                </div>
                <div className="mt-2 max-w-sm text-xs text-muted-foreground">
                    No inline preview available for this file type. Use Open in new tab or Download to view it.
                </div>
            </div>
        </div>
    );
}
