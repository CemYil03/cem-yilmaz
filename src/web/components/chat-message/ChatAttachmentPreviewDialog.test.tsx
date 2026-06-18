// @vitest-environment jsdom
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { GqlCFileUpload } from '../../graphql/generated';
import { ChatAttachmentPreviewDialog } from './ChatAttachmentPreviewDialog';

afterEach(cleanup);

// Streamdown brings in heavy plugins we don't need to verify here — stub the
// shared markdown component to a recognizable wrapper so we can assert the
// markdown branch ran without parsing remark/rehype on every test.
vi.mock('../AssistantMarkdown', () => ({
    AssistantMarkdown: ({ text }: { text: string }) => <div data-testid="markdown">{text}</div>,
}));

const imageAttachment: GqlCFileUpload = {
    __typename: 'FileUpload',
    fileUploadId: 'a-img',
    filename: 'pic.png',
    mediaType: 'image/png',
    size: 1024,
    url: '/api/file-uploads/a-img',
};

const markdownAttachment: GqlCFileUpload = {
    __typename: 'FileUpload',
    fileUploadId: 'a-md',
    filename: 'note.md',
    mediaType: 'text/markdown',
    size: 64,
    url: '/api/file-uploads/a-md',
};

const pdfAttachment: GqlCFileUpload = {
    __typename: 'FileUpload',
    fileUploadId: 'a-pdf',
    filename: 'doc.pdf',
    mediaType: 'application/pdf',
    size: 2048,
    url: '/api/file-uploads/a-pdf',
};

// Lightweight controller that mirrors the prop shape the dialog expects.
// Lets each test assert against the live rendered state after a click /
// key press without re-implementing the open/index reducer in every case.
function ControlledDialog({
    attachments,
    initialIndex = 0,
    initialOpen = true,
}: {
    attachments: GqlCFileUpload[];
    initialIndex?: number;
    initialOpen?: boolean;
}) {
    const [open, setOpen] = useState(initialOpen);
    const [index, setIndex] = useState(initialIndex);
    return (
        <ChatAttachmentPreviewDialog open={open} onOpenChange={setOpen} attachments={attachments} index={index} onIndexChange={setIndex} />
    );
}

describe('ChatAttachmentPreviewDialog', () => {
    let originalFetch: typeof globalThis.fetch;

    beforeEach(() => {
        originalFetch = globalThis.fetch;
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
    });

    it('renders an <img> for an image attachment with the persisted url', () => {
        // Arrange / Act
        render(<ControlledDialog attachments={[imageAttachment]} />);

        // Assert — the alt text comes from the filename so we can target the img
        // by its accessible name without leaking implementation details.
        const img = screen.getByRole('img', { name: 'pic.png' });
        expect(img.getAttribute('src')).toBe('/api/file-uploads/a-img');
    });

    it('fetches and renders markdown text via AssistantMarkdown', async () => {
        // Arrange
        globalThis.fetch = vi.fn(
            async () => new Response('# hi', { status: 200, headers: { 'Content-Type': 'text/markdown' } }),
        ) as unknown as typeof globalThis.fetch;

        // Act
        render(<ControlledDialog attachments={[markdownAttachment]} />);

        // Assert — the `data-testid="markdown"` from the mocked component
        // appears once the fetch settles.
        await waitFor(() => {
            expect(screen.getByTestId('markdown').textContent).toBe('# hi');
        });
        expect(globalThis.fetch).toHaveBeenCalledWith('/api/file-uploads/a-md', expect.anything());
    });

    it('shows the generic info card for non-previewable types and skips the fetch', () => {
        // Arrange
        const fetchSpy = vi.fn();
        globalThis.fetch = fetchSpy as unknown as typeof globalThis.fetch;

        // Act
        render(<ControlledDialog attachments={[pdfAttachment]} />);

        // Assert — generic copy is present and we never reached out for bytes.
        expect(screen.getByText(/No inline preview available/i)).toBeTruthy();
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('cycles to the next attachment on ArrowRight and wraps at the end', async () => {
        // Arrange — three attachments, mocked fetch for the markdown body.
        globalThis.fetch = vi.fn(
            async () => new Response('# hi', { status: 200, headers: { 'Content-Type': 'text/markdown' } }),
        ) as unknown as typeof globalThis.fetch;
        render(<ControlledDialog attachments={[imageAttachment, markdownAttachment, pdfAttachment]} initialIndex={0} />);

        // Initially on the image — header shows "1 of 3".
        expect(screen.getByText(/1 of 3/)).toBeTruthy();

        // Act — ArrowRight twice then once more to wrap.
        await act(async () => {
            fireEvent.keyDown(window, { key: 'ArrowRight' });
        });
        expect(screen.getByText(/2 of 3/)).toBeTruthy();

        await act(async () => {
            fireEvent.keyDown(window, { key: 'ArrowRight' });
        });
        expect(screen.getByText(/3 of 3/)).toBeTruthy();

        await act(async () => {
            fireEvent.keyDown(window, { key: 'ArrowRight' });
        });

        // Assert — wrapped back to the image.
        expect(screen.getByText(/1 of 3/)).toBeTruthy();
    });

    it('renders Open in new tab and Download links pointing at the attachment url', () => {
        // Arrange / Act
        render(<ControlledDialog attachments={[pdfAttachment]} />);

        // Assert — each footer button is rendered as an <a> via Button asChild.
        const openLink = screen.getByRole('link', { name: /Open in new tab/i });
        const downloadLink = screen.getByRole('link', { name: /Download/i });
        expect(openLink.getAttribute('href')).toBe('/api/file-uploads/a-pdf');
        expect(openLink.getAttribute('target')).toBe('_blank');
        expect(downloadLink.getAttribute('href')).toBe('/api/file-uploads/a-pdf');
        expect(downloadLink.getAttribute('download')).toBe('doc.pdf');
    });

    it('hides the prev/next arrow buttons when there is only one attachment', () => {
        // Arrange / Act
        render(<ControlledDialog attachments={[imageAttachment]} />);

        // Assert
        expect(screen.queryByRole('button', { name: /Previous attachment/i })).toBeNull();
        expect(screen.queryByRole('button', { name: /Next attachment/i })).toBeNull();
    });
});
