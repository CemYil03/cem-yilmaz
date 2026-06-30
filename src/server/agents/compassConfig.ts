// Compass feature constants — see `docs/features/compass.md`.

// Fixed singleton key for the `Compass` row. Phase 1 has one compass total;
// Phase 2 (per-user accounts) will keep this id for "the owner's compass" and
// derive a new id per user.
export const COMPASS_SINGLETON_ID = '00000000-0000-0000-0000-000000000001';

// The synthesizer auto-runs once `Compass.observationsSinceSynthesis` reaches
// this number. Manual "Re-synthesize now" on `/workspace/compass` ignores it.
// Tuned so a typical chat session of 10–15 admin messages produces one
// synthesis pass without burning the smarter model on every turn.
export const COMPASS_SYNTHESIS_THRESHOLD = 10;
