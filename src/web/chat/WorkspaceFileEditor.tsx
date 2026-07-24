import { DownloadIcon, XIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useMutation, useQuery } from 'urql';
import { AssistantMarkdown } from '../components/AssistantMarkdown';
import { Button } from '../components/base/button';
import { Spinner } from '../components/base/spinner';
import { Textarea } from '../components/base/textarea';
import { WorkspaceFileDocument, WorkspaceFileUpdateDocument } from '../graphql/generated';
import { cn } from '../utils/cn';
import type { Locale } from '../utils/locale';

// The workspace document editor — the half-screen panel body that opens when
// Cem clicks a file attachment on an assistant message. Fetches the file by id,
// toggles between a rendered markdown preview and a raw-text editor, and saves
// edits back via `adminWorkspaceFileUpdate` (which rewrites the underlying
// upload's bytes in place). See `docs/features/workspace-files.md`.
//
// Surface-agnostic: the full-page route renders it in a resizable split column,
// the sidebar/sheet renders it inside a `Sheet`. `onClose` clears whatever open
// state the host owns (the `?doc` search param on the full page).

const copy = {
    preview: { de: 'Vorschau', en: 'Preview' },
    edit: { de: 'Bearbeiten', en: 'Edit' },
    save: { de: 'Speichern', en: 'Save' },
    saving: { de: 'Speichern…', en: 'Saving…' },
    saved: { de: 'Gespeichert', en: 'Saved' },
    saveFailed: { de: 'Speichern fehlgeschlagen', en: 'Save failed' },
    downloadPdf: { de: 'Als PDF herunterladen', en: 'Download PDF' },
    close: { de: 'Schließen', en: 'Close' },
    notFound: { de: 'Dokument nicht gefunden.', en: 'Document not found.' },
    editPlaceholder: { de: 'Markdown eingeben…', en: 'Write markdown…' },
} as const;

type Mode = 'preview' | 'edit';

export function WorkspaceFileEditor({
    workspaceFileId,
    onClose,
    locale,
    className,
}: {
    workspaceFileId: string;
    onClose: () => void;
    locale: Locale;
    className?: string;
}) {
    const [{ data, fetching, error }, refetch] = useQuery({
        query: WorkspaceFileDocument,
        variables: { workspaceFileId },
        requestPolicy: 'cache-and-network',
    });
    const [, save] = useMutation(WorkspaceFileUpdateDocument);

    const file = data?.sessionFindOne.user?.admin?.adminWorkspaceFileFindOne ?? null;
    const [mode, setMode] = useState<Mode>('preview');
    const [draft, setDraft] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    // Seed the draft from the loaded content and re-seed whenever the file id
    // or the server content changes (e.g. the assistant rewrote it) — but only
    // while we're not mid-edit with unsaved changes, so a background refetch
    // can't clobber what Cem is typing.
    useEffect(() => {
        if (file && draft === null) setDraft(file.content);
    }, [file, draft]);
    useEffect(() => {
        // Reset the draft when switching to a different document.
        setDraft(null);
        setMode('preview');
    }, [workspaceFileId]);

    const title = file?.label ?? file?.filename ?? '';
    const isDirty = file !== null && draft !== null && draft !== file.content;

    // Download the server-rendered PDF. It's generated from the persisted
    // document, so the button is disabled while there are unsaved edits (mirrors
    // the Save-when-dirty gate). A hidden anchor with `download` triggers the
    // browser's own download of the same-origin, cookie-authenticated route.
    const onDownloadPdf = () => {
        if (!file || isDirty) return;
        const anchor = document.createElement('a');
        anchor.href = `/api/workspace-files/${workspaceFileId}/pdf`;
        anchor.download = '';
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
    };

    const onSave = async () => {
        if (!file || draft === null || !isDirty) return;
        setSaving(true);
        try {
            const result = await save({ workspaceFileId, content: draft, label: null });
            if (result.error || !result.data?.admin.adminWorkspaceFileUpdate.success) {
                throw result.error ?? new Error('save failed');
            }
            toast.success(copy.saved[locale]);
            refetch({ requestPolicy: 'network-only' });
        } catch {
            toast.error(copy.saveFailed[locale]);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className={cn('flex h-full min-h-0 min-w-0 flex-col', className)}>
            <header className="flex items-center gap-2 border-b px-3 py-2">
                <span className="min-w-0 flex-1 truncate text-sm font-medium" title={file?.filename}>
                    {title}
                </span>
                <div className="flex items-center gap-1 rounded-md border p-0.5">
                    <ModeButton active={mode === 'preview'} onClick={() => setMode('preview')} label={copy.preview[locale]} />
                    <ModeButton active={mode === 'edit'} onClick={() => setMode('edit')} label={copy.edit[locale]} />
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onDownloadPdf}
                    disabled={!file || isDirty || saving}
                    title={copy.downloadPdf[locale]}
                >
                    <DownloadIcon />
                    <span className="hidden sm:inline">PDF</span>
                </Button>
                <Button size="sm" onClick={onSave} disabled={!isDirty || saving}>
                    {saving ? <Spinner className="size-4" /> : null}
                    {saving ? copy.saving[locale] : copy.save[locale]}
                </Button>
                <Button variant="ghost" size="icon-xs" onClick={onClose} aria-label={copy.close[locale]}>
                    <XIcon />
                </Button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto">
                {fetching && !file ? (
                    <div className="grid h-full place-items-center">
                        <Spinner className="size-5" />
                    </div>
                ) : error || !file ? (
                    <p className="p-4 text-sm text-muted-foreground">{copy.notFound[locale]}</p>
                ) : mode === 'preview' ? (
                    <div className="p-4">
                        <AssistantMarkdown text={draft ?? file.content} />
                    </div>
                ) : (
                    <Textarea
                        value={draft ?? ''}
                        onChange={(event) => setDraft(event.target.value)}
                        placeholder={copy.editPlaceholder[locale]}
                        spellCheck={false}
                        className="h-full min-h-full resize-none rounded-none border-0 font-mono text-sm focus-visible:ring-0"
                    />
                )}
            </div>
        </div>
    );
}

function ModeButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className={cn(
                'rounded px-2 py-1 text-xs transition-colors',
                active ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
        >
            {label}
        </button>
    );
}
