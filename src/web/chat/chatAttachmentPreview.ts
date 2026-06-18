// Pure helpers for the attachment preview dialog. The dispatch table here
// decides which non-image MIME types we render inline (markdown via Streamdown,
// plain/code text via `<pre>`) and which fall back to a generic info card with
// just Open / Download.
//
// Kept pure (no React, no fetch) so it can be unit-tested without DOM and
// reused by future surfaces that need the same classification.

export type AttachmentPreviewKind = 'image' | 'markdown' | 'text' | 'other';

// MIME types we treat as inline-renderable text. Includes the common
// configuration / data formats users actually attach (`.json`, `.csv`,
// `.yaml`) plus a small set of code-ish types for `.ts` / `.js` / `.html`
// /etc. Browsers don't always emit a stable mime for these — the `text/*`
// fallback below catches the long tail.
const TEXT_LIKE_MEDIA_TYPES = new Set<string>([
    'application/json',
    'application/ld+json',
    'application/xml',
    'application/yaml',
    'application/x-yaml',
    'application/javascript',
    'application/typescript',
    'application/x-sh',
    'application/sql',
    'text/yaml',
    'text/x-yaml',
    'text/csv',
    'text/tab-separated-values',
]);

export function previewKindFor(mediaType: string): AttachmentPreviewKind {
    const normalized = mediaType.toLowerCase();
    if (normalized.startsWith('image/')) return 'image';
    // Markdown gets its own branch so the dialog can pipe it through
    // `<AssistantMarkdown />` for headings / lists / fenced code instead of
    // dumping the raw `#`s into a `<pre>`.
    if (normalized === 'text/markdown' || normalized === 'text/x-markdown') return 'markdown';
    if (normalized.startsWith('text/')) return 'text';
    if (TEXT_LIKE_MEDIA_TYPES.has(normalized)) return 'text';
    return 'other';
}

const KIB = 1024;
const MIB = KIB * 1024;
const GIB = MIB * 1024;

// Human-readable file size. Intentionally binary (KiB / MiB / GiB labelled
// as KB / MB / GB — matches what every desktop OS shows) and limited to
// three units; we don't expect chat attachments to ever cross the GB line
// (the upload route caps at 10 MB), but the GB branch costs nothing.
export function formatBytes(size: number): string {
    if (!Number.isFinite(size) || size < 0) return '0 B';
    if (size < KIB) return `${size} B`;
    if (size < MIB) return `${(size / KIB).toFixed(1)} KB`;
    if (size < GIB) return `${(size / MIB).toFixed(1)} MB`;
    return `${(size / GIB).toFixed(1)} GB`;
}
