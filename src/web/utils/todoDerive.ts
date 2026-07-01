// Client-side derivations from the standalone-todos row set. All pure —
// no side effects, no network. The todos page derives:
//
//   - `todayCount` / `openCount`: numbers rendered on the momentum header
//   - `weekDots`: last-7-days completion buckets for the tiny dot row
//   - `streak`: consecutive days with ≥1 completion ending today or yesterday
//
// Everything hinges on `completedAt` being present on `done` rows. The
// server stamps it at the moment the client toggles status, so it's the
// user-intent timestamp — the right anchor for "did I complete today".

export type MomentumRow = { status: 'todo' | 'doing' | 'done'; completedAt: string | Date | null };

export type WeekDot = { date: Date; count: number; isToday: boolean };

export function todayStart(now: Date = new Date()): Date {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return start;
}

// True when the date-portion of `completedAt` equals `now`'s local day.
function isOnDay(completedAt: string | Date, day: Date): boolean {
    const d = typeof completedAt === 'string' ? new Date(completedAt) : completedAt;
    return d.getFullYear() === day.getFullYear() && d.getMonth() === day.getMonth() && d.getDate() === day.getDate();
}

export function todayCompletedCount(rows: ReadonlyArray<MomentumRow>, now: Date = new Date()): number {
    const day = todayStart(now);
    let count = 0;
    for (const r of rows) {
        if (r.status !== 'done' || !r.completedAt) continue;
        if (isOnDay(r.completedAt, day)) count += 1;
    }
    return count;
}

export function openCount(rows: ReadonlyArray<MomentumRow>): number {
    let count = 0;
    for (const r of rows) if (r.status !== 'done') count += 1;
    return count;
}

// Seven dots, oldest → newest, last one is today. Ideal for a
// GitHub-contributions-style row that fits on one line at ~12px height.
export function weekDots(rows: ReadonlyArray<MomentumRow>, now: Date = new Date()): WeekDot[] {
    const today = todayStart(now);
    const dots: WeekDot[] = [];
    for (let offset = 6; offset >= 0; offset -= 1) {
        const day = new Date(today);
        day.setDate(day.getDate() - offset);
        let count = 0;
        for (const r of rows) {
            if (r.status !== 'done' || !r.completedAt) continue;
            if (isOnDay(r.completedAt, day)) count += 1;
        }
        dots.push({ date: day, count, isToday: offset === 0 });
    }
    return dots;
}

// Consecutive-days-with-a-completion count, ending at today or yesterday.
// If the user hasn't completed anything today, we still count them at
// yesterday's streak — the day is not over yet. Once yesterday goes by
// with no completion, the streak resets.
export function completionStreak(rows: ReadonlyArray<MomentumRow>, now: Date = new Date()): number {
    const today = todayStart(now);
    const doneDays = new Set<string>();
    for (const r of rows) {
        if (r.status !== 'done' || !r.completedAt) continue;
        const d = typeof r.completedAt === 'string' ? new Date(r.completedAt) : r.completedAt;
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        doneDays.add(key);
    }

    // Start counting from today; if today has no completion, drop back to
    // yesterday and count from there. Anything older breaks the streak.
    const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
    const startedToday = doneDays.has(todayKey);
    let streak = 0;
    const cursor = new Date(today);
    if (!startedToday) cursor.setDate(cursor.getDate() - 1);
    // Walk backwards day-by-day. Bounded by `doneDays.size` — worst case
    // one iteration per unique completion day.
    for (;;) {
        const key = `${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`;
        if (!doneDays.has(key)) break;
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
}
