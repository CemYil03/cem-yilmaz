import type { Profile } from '../db/schema';
import type { GqlSAdminProfile } from '../graphql/generated';

// Three text artifacts plus the synthesis bookkeeping. The `observations`
// and `synthesisInProgress` fields on `AdminProfile` are resolved separately
// — the parent shell returned here carries placeholders that the dedicated
// field resolvers overwrite. `observations` is omitted because it takes
// arguments and runs its own join; `synthesisInProgress` is omitted because
// it is derived from pg-boss state, not the `Profile` row.
export function toGqlProfile(row: Profile): Omit<GqlSAdminProfile, 'observations' | 'synthesisInProgress'> {
    return {
        summary: row.summary,
        prose: row.prose,
        psychProfile: row.psychProfile,
        synthesizedAt: row.synthesizedAt,
        synthesisModelId: row.synthesisModelId,
        observationsSinceSynthesis: row.observationsSinceSynthesis,
    };
}
