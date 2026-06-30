import type { ServerRuntime } from '../domain/ServerRuntime';
import { compassSynthesize } from '../jobs/handlers/compassSynthesize';

// Live read of whether the `compass-synthesize` job is currently queued
// (created | retry | active). Surfaced on `AdminCompass.synthesisInProgress`
// so the workspace compass page can drive its spinner from real backend
// state. We deliberately do NOT persist this on the `Compass` row — pg-boss
// already owns the state, auto-expires stuck `active` rows via the job's
// `expireInSeconds`, and there is exactly one writer (the worker). See
// `docs/features/compass.md`.
export async function compassSynthesisInProgressGet(serverRuntime: ServerRuntime): Promise<boolean> {
    try {
        const active = await serverRuntime.jobs.activeCount(compassSynthesize);
        return active > 0;
    } catch (error) {
        // A pg-boss read failure must not blank out the whole compass page —
        // log it and assume "not running" so the UI stays interactive.
        serverRuntime.log.error(error, null);
        return false;
    }
}
