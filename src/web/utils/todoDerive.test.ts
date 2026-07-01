import { describe, expect, it } from 'vitest';
import { completionStreak, openCount, todayCompletedCount, weekDots } from './todoDerive';

// Fixed "now" — Sunday, 15 March 2026, 10:00 local.
const NOW = new Date(2026, 2, 15, 10, 0, 0);

function done(daysAgo: number): { status: 'done'; completedAt: Date } {
    const d = new Date(NOW);
    d.setDate(d.getDate() - daysAgo);
    d.setHours(14, 0, 0, 0);
    return { status: 'done', completedAt: d };
}

describe('todayCompletedCount', () => {
    it('counts only rows completed today', () => {
        // Arrange
        const rows = [done(0), done(0), done(1), { status: 'todo' as const, completedAt: null }];
        // Act & Assert
        expect(todayCompletedCount(rows, NOW)).toBe(2);
    });

    it('returns 0 when no rows completed today', () => {
        expect(todayCompletedCount([done(3)], NOW)).toBe(0);
    });
});

describe('openCount', () => {
    it('counts todo and doing statuses', () => {
        const rows = [{ status: 'todo' as const, completedAt: null }, { status: 'doing' as const, completedAt: null }, done(0)];
        expect(openCount(rows)).toBe(2);
    });
});

describe('weekDots', () => {
    it('returns 7 dots with today last', () => {
        const dots = weekDots([], NOW);
        expect(dots).toHaveLength(7);
        expect(dots[6]!.isToday).toBe(true);
        expect(dots[0]!.isToday).toBe(false);
    });

    it('buckets completions per day', () => {
        const rows = [done(0), done(0), done(1), done(6)];
        const dots = weekDots(rows, NOW);
        expect(dots[6]!.count).toBe(2);
        expect(dots[5]!.count).toBe(1);
        expect(dots[0]!.count).toBe(1);
        expect(dots[2]!.count).toBe(0);
    });
});

describe('completionStreak', () => {
    it('is 0 when nothing has been completed', () => {
        expect(completionStreak([], NOW)).toBe(0);
    });

    it('counts consecutive days starting today', () => {
        // Arrange — completed today, yesterday, day-before.
        const rows = [done(0), done(1), done(2)];
        // Act & Assert
        expect(completionStreak(rows, NOW)).toBe(3);
    });

    it('still counts a streak when today is empty but yesterday has a completion', () => {
        // Rationale: the day is not over yet, so a user with a run
        // ending yesterday should still see their streak.
        const rows = [done(1), done(2), done(3)];
        expect(completionStreak(rows, NOW)).toBe(3);
    });

    it('breaks when yesterday is empty', () => {
        const rows = [done(0), done(2)];
        expect(completionStreak(rows, NOW)).toBe(1);
    });
});
