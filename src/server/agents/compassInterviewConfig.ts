// Compass psychological-interview constants — see `docs/features/compass.md`
// ("Psychological-interview agent").

// Cron expression for the recurring `compassInterviewWeeklyDue` job. Monday
// 09:00 server time. The handler is idempotent: if a `pending` interview
// already exists when this fires, it logs and exits without inserting a
// second one, so a missed week resumes next week rather than piling up.
export const COMPASS_INTERVIEW_CRON = '0 9 * * 1';

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
