const KIB = 1024;
const MIB = KIB * 1024;
const GIB = MIB * 1024;

// Human-readable file size. Intentionally binary (KiB / MiB / GiB labelled
// as KB / MB / GB — matches what every desktop OS shows) and limited to
// three units beyond bytes; we don't expect uploads to cross the GB line
// often, but the GB branch costs nothing.
export function formatBytes(size: number): string {
    if (!Number.isFinite(size) || size < 0) return '0 B';
    if (size < KIB) return `${size} B`;
    if (size < MIB) return `${(size / KIB).toFixed(1)} KB`;
    if (size < GIB) return `${(size / MIB).toFixed(1)} MB`;
    return `${(size / GIB).toFixed(1)} GB`;
}
