import { describe, expect, it } from 'vitest';
import { todoParse } from './todoParse';

// Anchor "now" so end-of-today assertions are deterministic. The parser
// takes `now` as an argument for exactly this reason.
const NOW = new Date('2026-03-15T10:00:00Z');

describe('todoParse', () => {
    it('returns the title unchanged when there are no tokens', () => {
        // Arrange
        const raw = 'Milch kaufen';
        // Act
        const result = todoParse(raw, NOW);
        // Assert
        expect(result).toEqual({ title: 'Milch kaufen' });
    });

    it('parses German today token', () => {
        // Arrange
        const raw = 'Milch kaufen !heute';
        // Act
        const result = todoParse(raw, NOW);
        // Assert
        expect(result.title).toBe('Milch kaufen');
        expect(result.whenBucket).toBe('today');
        expect(result.dueAt?.toISOString().slice(0, 10)).toBe('2026-03-15');
    });

    it('parses English today token', () => {
        const result = todoParse('Buy milk !today', NOW);
        expect(result.title).toBe('Buy milk');
        expect(result.whenBucket).toBe('today');
    });

    it('parses tomorrow token in both languages', () => {
        expect(todoParse('X !morgen', NOW).dueAt?.toISOString().slice(0, 10)).toBe('2026-03-16');
        expect(todoParse('X !tomorrow', NOW).dueAt?.toISOString().slice(0, 10)).toBe('2026-03-16');
    });

    it('parses week and someday and waiting tokens', () => {
        expect(todoParse('X !woche', NOW).whenBucket).toBe('week');
        expect(todoParse('X !week', NOW).whenBucket).toBe('week');
        expect(todoParse('X !irgendwann', NOW).whenBucket).toBe('someday');
        expect(todoParse('X !someday', NOW).whenBucket).toBe('someday');
        expect(todoParse('X !warten', NOW).whenBucket).toBe('waiting');
        expect(todoParse('X !waiting', NOW).whenBucket).toBe('waiting');
    });

    it('parses effort shorthand', () => {
        expect(todoParse('X ~q', NOW).effort).toBe('quick');
        expect(todoParse('X ~f', NOW).effort).toBe('focused');
        expect(todoParse('X ~d', NOW).effort).toBe('deep');
        expect(todoParse('X ~quick', NOW).effort).toBe('quick');
    });

    it('derives effort from a duration in minutes', () => {
        expect(todoParse('X ~10min', NOW).effort).toBe('quick');
        expect(todoParse('X ~15min', NOW).effort).toBe('quick');
        expect(todoParse('X ~30min', NOW).effort).toBe('focused');
        expect(todoParse('X ~90min', NOW).effort).toBe('focused');
        expect(todoParse('X ~120min', NOW).effort).toBe('deep');
    });

    it('derives effort from a duration in hours', () => {
        expect(todoParse('X ~2h', NOW).effort).toBe('deep');
        expect(todoParse('X ~1h', NOW).effort).toBe('focused');
    });

    it('parses multiple tokens in any order', () => {
        // Arrange
        const raw = 'Fahrrad kaufen !heute ~30min';
        // Act
        const result = todoParse(raw, NOW);
        // Assert
        expect(result.title).toBe('Fahrrad kaufen');
        expect(result.whenBucket).toBe('today');
        expect(result.effort).toBe('focused');
        expect(result.dueAt).toBeDefined();
    });

    it('does not strip tokens from the middle of the title', () => {
        // Arrange — the exclamation mark is part of the actual title.
        const raw = 'Frag !heute in der Fußgängerzone';
        // Act
        const result = todoParse(raw, NOW);
        // Assert
        expect(result.title).toBe('Frag !heute in der Fußgängerzone');
        expect(result.whenBucket).toBeUndefined();
    });

    it('handles an empty string', () => {
        expect(todoParse('', NOW)).toEqual({ title: '' });
    });

    it('handles trailing whitespace between title and tokens', () => {
        const result = todoParse('X  !heute   ~q', NOW);
        expect(result.title).toBe('X');
        expect(result.whenBucket).toBe('today');
        expect(result.effort).toBe('quick');
    });
});
