import { describe, it, expect } from 'vitest';
import { formatBytes, previewKindFor } from './chatAttachmentPreview';

describe('previewKindFor', () => {
    it('classifies image MIME types as image', () => {
        // Arrange — nothing
        // Act / Assert
        expect(previewKindFor('image/png')).toBe('image');
        expect(previewKindFor('image/jpeg')).toBe('image');
        expect(previewKindFor('image/svg+xml')).toBe('image');
        // Mixed-case media types still classify — browsers don't normalize.
        expect(previewKindFor('Image/PNG')).toBe('image');
    });

    it('classifies markdown variants as markdown', () => {
        // Arrange — nothing
        // Act / Assert
        expect(previewKindFor('text/markdown')).toBe('markdown');
        expect(previewKindFor('text/x-markdown')).toBe('markdown');
    });

    it('classifies plain and code-ish MIME types as text', () => {
        // Arrange — nothing
        // Act / Assert
        expect(previewKindFor('text/plain')).toBe('text');
        expect(previewKindFor('text/csv')).toBe('text');
        expect(previewKindFor('application/json')).toBe('text');
        expect(previewKindFor('application/yaml')).toBe('text');
        expect(previewKindFor('application/javascript')).toBe('text');
        // Unknown text/* still routes to text — safe default since the
        // dialog renders it in a `<pre>` block.
        expect(previewKindFor('text/x-anything')).toBe('text');
    });

    it('falls back to other for binary or unknown types', () => {
        // Arrange — nothing
        // Act / Assert
        expect(previewKindFor('application/pdf')).toBe('other');
        expect(previewKindFor('application/zip')).toBe('other');
        expect(previewKindFor('application/octet-stream')).toBe('other');
        expect(previewKindFor('')).toBe('other');
    });
});

describe('formatBytes', () => {
    it('formats sizes with the right unit', () => {
        // Arrange — nothing
        // Act / Assert
        expect(formatBytes(0)).toBe('0 B');
        expect(formatBytes(512)).toBe('512 B');
        expect(formatBytes(1024)).toBe('1.0 KB');
        expect(formatBytes(1536)).toBe('1.5 KB');
        expect(formatBytes(1024 * 1024)).toBe('1.0 MB');
        expect(formatBytes(Math.round(1.5 * 1024 * 1024))).toBe('1.5 MB');
        expect(formatBytes(Math.round(2.3 * 1024 * 1024 * 1024))).toBe('2.3 GB');
    });

    it('handles invalid inputs without throwing', () => {
        // Arrange — nothing
        // Act / Assert
        expect(formatBytes(NaN)).toBe('0 B');
        expect(formatBytes(-100)).toBe('0 B');
        expect(formatBytes(Number.POSITIVE_INFINITY)).toBe('0 B');
    });
});
