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
