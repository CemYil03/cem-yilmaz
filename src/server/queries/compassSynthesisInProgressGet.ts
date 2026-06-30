import type { ServerRuntime } from '../domain/ServerRuntime';
import { profileSynthesize } from '../jobs/handlers/profileSynthesize';

// Live read of whether the `profile-synthesize` job is currently queued
// (created | retry | active). Surfaced on `AdminProfile.synthesisInProgress`
// so the workspace profile page can drive its spinner from real backend
// state. We deliberately do NOT persist this on the `Profile` row — pg-boss
// already owns the state, auto-expires stuck `active` rows via the job's
// `expireInSeconds`, and there is exactly one writer (the worker). See
// `docs/features/profile.md`.
export async function profileSynthesisInProgressGet(serverRuntime: ServerRuntime): Promise<boolean> {
    try {
        const active = await serverRuntime.jobs.activeCount(profileSynthesize);
        return active > 0;
    } catch (error) {
        // A pg-boss read failure must not blank out the whole profile page —
        // log it and assume "not running" so the UI stays interactive.
        serverRuntime.log.error(error, null);
        return false;
    }
}
