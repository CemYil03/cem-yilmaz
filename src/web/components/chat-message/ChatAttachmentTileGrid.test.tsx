// @vitest-environment jsdom
import { afterEach, describe, it, expect, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { GqlCFileUpload } from '../../graphql/generated';
import { ChatAttachmentTileGrid } from './ChatAttachmentTileGrid';

// RTL's automatic cleanup only fires when a global setup file calls it; this
// project doesn't ship a vitest setup file, so we run cleanup manually so
// renders from earlier tests don't leak into later ones.
afterEach(cleanup);

function buildAttachments(count: number): GqlCFileUpload[] {
    // Mix image and non-image MIME types so both the image-tile and
    // file-icon-tile branches get exercised when count > 1.
    return Array.from({ length: count }, (_, i) => ({
        __typename: 'FileUpload',
        fileUploadId: `att-${i}`,
        filename: i % 2 === 0 ? `pic-${i}.png` : `doc-${i}.pdf`,
        mediaType: i % 2 === 0 ? 'image/png' : 'application/pdf',
        size: 1024,
        url: `/api/file-uploads/att-${i}`,
    }));
}

describe('ChatAttachmentTileGrid', () => {
    it('renders one tile per attachment when count <= 4', () => {
        // Arrange
        const attachments = buildAttachments(3);
        const onTileClick = vi.fn();

        // Act
        render(<ChatAttachmentTileGrid attachments={attachments} onTileClick={onTileClick} />);

        // Assert — three tiles rendered, no overflow square.
        const tiles = screen.getAllByRole('button');
        expect(tiles).toHaveLength(3);
        expect(screen.queryByText(/^\+/)).toBeNull();
    });

    it('uses a single-column compact-width grid for 1 attachment so the bubble shrinks to fit the tile', () => {
        // Arrange — a lone attachment used to render in a 2-column grid,
        // leaving the right cell visibly empty. The grid wrapper should
        // collapse to one column at a fixed compact width so the bubble
        // sizes to the tile instead of stretching past it.
        const attachments = buildAttachments(1);
        const onTileClick = vi.fn();

        // Act
        const { container } = render(<ChatAttachmentTileGrid attachments={attachments} onTileClick={onTileClick} />);

        // Assert — exactly one tile, no overflow square, and the wrapper
        // is `grid-cols-1 w-64 max-w-full`.
        expect(screen.getAllByRole('button')).toHaveLength(1);
        expect(screen.queryByText(/^\+/)).toBeNull();
        const wrapper = container.firstChild as HTMLElement;
        expect(wrapper.className).toMatch(/grid-cols-1/);
        expect(wrapper.className).toMatch(/w-64/);
        expect(wrapper.className).toMatch(/max-w-full/);
    });

    it('caps at 4 tiles exactly when count == 4', () => {
        // Arrange
        const attachments = buildAttachments(4);
        const onTileClick = vi.fn();

        // Act
        render(<ChatAttachmentTileGrid attachments={attachments} onTileClick={onTileClick} />);

        // Assert — all four tiles, still no `+` square.
        expect(screen.getAllByRole('button')).toHaveLength(4);
        expect(screen.queryByText(/^\+/)).toBeNull();
    });

    it('shows 3 attachment tiles + a `+X` overflow square when count > 4', () => {
        // Arrange
        const attachments = buildAttachments(7);
        const onTileClick = vi.fn();

        // Act
        render(<ChatAttachmentTileGrid attachments={attachments} onTileClick={onTileClick} />);

        // Assert — exactly 4 buttons total: 3 tiles + 1 overflow.
        expect(screen.getAllByRole('button')).toHaveLength(4);
        // The overflow count is `total - 3` since 3 visible attachment
        // tiles remain when overflow kicks in. `screen.getByText` already
        // throws when the node is missing, so reaching the assert means
        // the element exists.
        expect(screen.getByText('+4')).toBeTruthy();
    });

    it('clicking the +X tile fires onTileClick with index 3 so the dialog opens at the 4th attachment', () => {
        // Arrange
        const attachments = buildAttachments(5);
        const onTileClick = vi.fn();

        // Act
        render(<ChatAttachmentTileGrid attachments={attachments} onTileClick={onTileClick} />);
        fireEvent.click(screen.getByRole('button', { name: /Show 2 more attachments/ }));

        // Assert
        expect(onTileClick).toHaveBeenCalledWith(3);
    });

    it('clicking a regular tile fires onTileClick with that tile index', () => {
        // Arrange
        const attachments = buildAttachments(2);
        const onTileClick = vi.fn();

        // Act
        render(<ChatAttachmentTileGrid attachments={attachments} onTileClick={onTileClick} />);
        fireEvent.click(screen.getByRole('button', { name: /Open doc-1.pdf/ }));

        // Assert
        expect(onTileClick).toHaveBeenCalledWith(1);
    });

    it('renders nothing when there are no attachments', () => {
        // Arrange — empty list. The component should bail out so the
        // bubble doesn't get an empty grid container.
        const onTileClick = vi.fn();

        // Act
        const { container } = render(<ChatAttachmentTileGrid attachments={[]} onTileClick={onTileClick} />);

        // Assert
        expect(container.firstChild).toBeNull();
    });
});
