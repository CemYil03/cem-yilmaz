// Compass psychological-interview constants — see `docs/features/compass.md`
// ("Psychological-interview agent").

// Cron expression for the recurring `compassInterviewScheduledDue` job.
// This is the single source of truth for the interview cadence — change it
// here to shift the interval and nothing else needs to move (the DB /
// GraphQL `triggerReason` is deliberately cadence-neutral: `scheduled` vs
// `manual`). Currently daily at 09:00 server time.
//
// The handler is idempotent: if a `pending` (or `in_progress`) interview
// already exists when this fires, it logs and exits without inserting a
// second one, so a tick Cem doesn't complete the interview just carries
// the same row forward — pending rows never pile up.
export const COMPASS_INTERVIEW_CRON = '0 9 * * *';

// Soft guardrails surfaced in the interviewer's system prompt so it knows
// roughly how much ground to cover. The agent decides on its own when it
// has enough new signal and calls `concludeInterview`; these are anchors,
// not enforced step limits. (The hard ceiling per-turn lives in the
// agent's `stopWhen` rules.)
export const COMPASS_INTERVIEW_MIN_QUESTIONS = 4;
export const COMPASS_INTERVIEW_MAX_QUESTIONS = 8;

// How many recent non-dismissed observations the interviewer sees as
// context. Enough to know what is already covered and avoid asking the
// same thing twice; bounded so the prompt stays small.
export const COMPASS_INTERVIEW_RECENT_OBSERVATIONS_COUNT = 25;

// Interview topics — each maps to a focused system-prompt addendum that
// narrows the interviewer's question angles. 'general' is a broad check-in
// with no specific domain constraint.
export const compassInterviewTopics = ['general', 'career', 'relationships', 'fitness', 'health', 'stress'] as const;
export type CompassInterviewTopic = (typeof compassInterviewTopics)[number];

// Fallback rotation used by the cron handler when no AI-suggested hint is
// pending. 'general' appears in every other slot so broad check-ins remain
// frequent; the five domain topics fill the gaps.
export const COMPASS_INTERVIEW_TOPIC_ROTATION: CompassInterviewTopic[] = [
    'general',
    'career',
    'general',
    'relationships',
    'general',
    'fitness',
    'general',
    'health',
    'general',
    'stress',
];

// Per-topic system-prompt addendum injected into `agentCompassInterviewer`
// directly after the base instructions. Each entry is a list of lines that
// will be joined with '\n' and wrapped in a "--- Interview focus: TOPIC ---"
// header.
export const COMPASS_INTERVIEW_TOPIC_PROMPTS: Record<CompassInterviewTopic, string[]> = {
    general: ['This is a general check-in. Vary your angles freely: mood, energy, work focus, relationships, recent stressors.'],
    career: [
        'This interview is focused on career and professional life.',
        'Probe: current projects, upcoming decisions, job satisfaction, career direction, ambitions, anything stalling him.',
        'If recent observations mention an upcoming decision or transition, probe that directly.',
    ],
    relationships: [
        'This interview is focused on relationships — personal and professional.',
        'Probe: close relationships, social energy, recent friction or warmth, loneliness vs. connection, how work affects relationships.',
    ],
    fitness: [
        'This interview is focused on physical health and fitness.',
        'Probe: current routine, energy levels, sleep quality, recent changes, what he is avoiding, goals around his body.',
    ],
    health: [
        'This interview is focused on health — physical, medical, and habitual.',
        'Probe: recent health events, ongoing concerns, diet, sleep, medical follow-ups he may have mentioned.',
    ],
    stress: [
        'This interview is focused on stress and mental load.',
        'Probe: current stressors, what is weighing on him, coping mechanisms, what he is procrastinating on, what he cannot stop thinking about.',
    ],
};
