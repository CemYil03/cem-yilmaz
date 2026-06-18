import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from './button';

describe('Button', () => {
    it('renders children inside a native <button> by default', () => {
        // Arrange — nothing

        // Act
        render(<Button>Click me</Button>);

        // Assert
        const button = screen.getByRole('button', { name: 'Click me' });
        expect(button.tagName).toBe('BUTTON');
        expect(button.dataset.slot).toBe('button');
        expect(button.dataset.variant).toBe('default');
        expect(button.dataset.size).toBe('default');
    });

    it('reflects the variant and size props on data attributes', () => {
        // Arrange — nothing

        // Act
        render(
            <Button variant="destructive" size="lg">
                Delete
            </Button>,
        );

        // Assert
        const button = screen.getByRole('button', { name: 'Delete' });
        expect(button.dataset.variant).toBe('destructive');
        expect(button.dataset.size).toBe('lg');
    });

    it('forwards click events to the onClick handler', () => {
        // Arrange
        const onClick = vi.fn();
        render(<Button onClick={onClick}>Submit</Button>);
        const button = screen.getByRole('button', { name: 'Submit' });

        // Act
        button.click();

        // Assert
        expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('renders the child element instead of a <button> when asChild is set', () => {
        // Arrange — nothing

        // Act
        render(
            <Button asChild>
                <a href="/somewhere">Go</a>
            </Button>,
        );

        // Assert — the rendered element is the anchor, with Button's classes merged onto it
        const link = screen.getByRole('link', { name: 'Go' });
        expect(link.tagName).toBe('A');
        expect(link.getAttribute('href')).toBe('/somewhere');
        expect(link.dataset.slot).toBe('button');
    });
});
