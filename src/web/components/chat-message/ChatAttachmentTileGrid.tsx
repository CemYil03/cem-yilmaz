import { FileIcon } from 'lucide-react';
import type { GqlCFileUpload } from '../../graphql/generated';
import { cn } from '../../utils/cn';

// Read-only attachment preview grid for a chat message. Capped at 4 tiles
// regardless of viewport — the 4th becomes a `+{N - 3} more` square when
// the message has more than 4 attachments. Predictable layout (one code
// path, no responsive break) and works as well in a 2 cm phone bubble as
// in a 600 px desktop one.
//
// Stays presentational: clicking any tile fires `onTileClick(index)` so a
// sibling component (`<ChatAttachmentPreviewDialog />`) can manage the
// open/close lifecycle. The +X tile fires `onTileClick(3)` so the rest of
// the attachments are immediately reachable via the dialog's arrow keys
// without forcing a separate "all attachments" intermediate view.

const VISIBLE_LIMIT = 4;

export function ChatAttachmentTileGrid({
    attachments,
    onTileClick,
    className,
}: {
    attachments: ReadonlyArray<GqlCFileUpload>;
    onTileClick: (index: number) => void;
    className?: string;
}) {
    if (attachments.length === 0) return null;

    // Once we exceed the 4-tile cap, the visible list shrinks to 3 and the
    // 4th cell becomes the `+{N - 3}` overflow square — N - 3 because the
    // square stands in for every attachment past the first three (the 4th
    // included), and the dialog's arrow keys reach all of them from index 3.
    const visibleAttachments =
        attachments.length > VISIBLE_LIMIT ? attachments.slice(0, VISIBLE_LIMIT - 1) : attachments.slice(0, VISIBLE_LIMIT);
    const overflowCount = Math.max(0, attachments.length - visibleAttachments.length);
    const showOverflowTile = attachments.length > VISIBLE_LIMIT;

    return (
        <div
            className={cn(
                // 2-column grid for 2+ tiles: 2 fills a row, 3-4 fill a 2x2
                // cleanly, and 5+ collapses to 3 tiles + a `+N` overflow
                // square. A single attachment uses `grid-cols-1` at a fixed
                // compact width so the bubble shrinks to fit the lone tile
                // instead of claiming full width and leaving an empty stripe
                // beside it. `max-w-full` keeps the tile from overflowing
                // narrow phone bubbles where the bubble itself is < 16rem.
                'grid gap-2',
                attachments.length === 1 ? 'w-64 max-w-full grid-cols-1' : 'w-full grid-cols-2',
                className,
            )}
        >
            {visibleAttachments.map((attachment, index) => (
                <AttachmentTileButton key={attachment.fileUploadId} attachment={attachment} onClick={() => onTileClick(index)} />
            ))}
            {showOverflowTile ? (
                <button
                    type="button"
                    aria-label={`Show ${overflowCount} more attachment${overflowCount === 1 ? '' : 's'}`}
                    onClick={() => onTileClick(VISIBLE_LIMIT - 1)}
                    className="flex aspect-square items-center justify-center rounded-md border border-primary-foreground/20 bg-background text-foreground hover:bg-accent"
                >
                    <span className="text-base font-semibold">+{overflowCount}</span>
                </button>
            ) : null}
        </div>
    );
}

function AttachmentTileButton({ attachment, onClick }: { attachment: GqlCFileUpload; onClick: () => void }) {
    const isImage = attachment.mediaType.startsWith('image/');
    return (
        <button
            type="button"
            onClick={onClick}
            title={attachment.filename}
            aria-label={`Open ${attachment.filename}`}
            className="group relative aspect-square overflow-hidden rounded-md border border-primary-foreground/20 bg-background hover:bg-accent"
        >
            {isImage ? (
                <img src={attachment.url} alt={attachment.filename} className="size-full object-cover" />
            ) : (
                <div className="flex size-full flex-col items-center justify-center gap-1 p-2 text-muted-foreground">
                    <FileIcon className="size-6" />
                    <span className="line-clamp-2 text-center text-[11px] leading-tight break-all">{attachment.filename}</span>
                </div>
            )}
        </button>
    );
}
