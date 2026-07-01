// Natural-language parser for the todos composer. Strips trailing tokens
// from the title and returns the metadata they encode. Bilingual by
// design — a user typing in either DE or EN gets the same result.
//
// Grammar (tokens can appear in any order at the end of the string;
// tokens in the middle of the title are left alone):
//   !heute / !today            → whenBucket = today, dueAt = end-of-today
//   !morgen / !tomorrow        → dueAt = end-of-tomorrow, whenBucket = today
//   !woche / !week             → whenBucket = week
//   !irgendwann / !someday     → whenBucket = someday
//   !warten / !waiting         → whenBucket = waiting
//   ~10min / ~30min / ~2h      → effort derived from duration
//   ~q / ~f / ~d               → effort = quick / focused / deep (shorthand)
//
// The rule for `~<duration>`:
//   ≤ 15 min           → quick
//   ≤ 90 min           → focused
//   > 90 min           → deep
//
// A title with no recognized tokens falls through untouched; every field
// on the returned object is optional so callers can pass only what was
// actually detected.

import type { TaskEffort, TaskWhenBucket } from '../../server/db/schema';

export type ParsedTodo = {
    title: string;
    effort?: TaskEffort;
    whenBucket?: TaskWhenBucket;
    dueAt?: Date;
};

type Rule = {
    match: RegExp;
    apply: (result: ParsedTodo, matched: RegExpMatchArray, now: Date) => void;
};

// Every rule anchors to the trailing edge of the string with `\s*$` — we
// only strip tokens that hug the tail so a title like "Frag !heute in der
// Fußgängerzone" keeps its embedded exclamation mark.
const RULES: ReadonlyArray<Rule> = [
    {
        match: /\s+!(heute|today)\s*$/i,
        apply: (r, _m, now) => {
            r.whenBucket = 'today';
            r.dueAt = endOfDay(now);
        },
    },
    {
        match: /\s+!(morgen|tomorrow)\s*$/i,
        apply: (r, _m, now) => {
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            r.dueAt = endOfDay(tomorrow);
            r.whenBucket = 'today';
        },
    },
    {
        match: /\s+!(woche|week)\s*$/i,
        apply: (r) => {
            r.whenBucket = 'week';
        },
    },
    {
        match: /\s+!(irgendwann|someday)\s*$/i,
        apply: (r) => {
            r.whenBucket = 'someday';
        },
    },
    {
        match: /\s+!(warten|waiting)\s*$/i,
        apply: (r) => {
            r.whenBucket = 'waiting';
        },
    },
    {
        match: /\s+~(\d+)\s*(min|m|h|hr|std)\s*$/i,
        apply: (r, m) => {
            const value = Number.parseInt(m[1]!, 10);
            const unit = m[2]!.toLowerCase();
            const minutes = unit === 'h' || unit === 'hr' || unit === 'std' ? value * 60 : value;
            r.effort = effortFromMinutes(minutes);
        },
    },
    {
        match: /\s+~(q|quick)\s*$/i,
        apply: (r) => {
            r.effort = 'quick';
        },
    },
    {
        match: /\s+~(f|focused)\s*$/i,
        apply: (r) => {
            r.effort = 'focused';
        },
    },
    {
        match: /\s+~(d|deep)\s*$/i,
        apply: (r) => {
            r.effort = 'deep';
        },
    },
];

export function todoParse(raw: string, now: Date = new Date()): ParsedTodo {
    const result: ParsedTodo = { title: '' };
    let working = raw;

    // Peel tokens off the tail one at a time. Order doesn't matter — each
    // rule anchors at `$`, so the loop keeps trying rules until nothing
    // matches. Bounded by the fact that every applied rule strips at least
    // one character.
    let advanced = true;
    while (advanced) {
        advanced = false;
        for (const rule of RULES) {
            const match = working.match(rule.match);
            if (match) {
                rule.apply(result, match, now);
                working = working.slice(0, match.index);
                advanced = true;
                break;
            }
        }
    }

    result.title = working.trim();
    return result;
}

function endOfDay(date: Date): Date {
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return end;
}

function effortFromMinutes(minutes: number): TaskEffort {
    if (minutes <= 15) return 'quick';
    if (minutes <= 90) return 'focused';
    return 'deep';
}
