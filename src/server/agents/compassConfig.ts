// Profile feature constants — see `docs/features/profile.md`.

// Fixed singleton key for the `Profile` row. Phase 1 has one profile total;
// Phase 2 (per-user accounts) will keep this id for "the owner's profile" and
// derive a new id per user.
export const PROFILE_SINGLETON_ID = '00000000-0000-0000-0000-000000000001';

// The synthesizer auto-runs once `Profile.observationsSinceSynthesis` reaches
// this number. Manual "Re-synthesize now" on `/workspace/profile` ignores it.
// Tuned so a typical chat session of 10–15 admin messages produces one
// synthesis pass without burning the smarter model on every turn.
export const PROFILE_SYNTHESIS_THRESHOLD = 10;
