import type { Profile } from '../db/schema';
import type { GqlSAdminProfile } from '../graphql/generated';

// Three text artifacts plus the synthesis bookkeeping. The `observations`
// field on `AdminProfile` is resolved separately — the parent shell returned
// here carries an empty array that the dedicated field resolver overwrites.
export function toGqlProfile(row: Profile): Omit<GqlSAdminProfile, 'observations'> {
    return {
        summary: row.summary,
        prose: row.prose,
        psychProfile: row.psychProfile,
        synthesizedAt: row.synthesizedAt,
        synthesisModelId: row.synthesisModelId,
        observationsSinceSynthesis: row.observationsSinceSynthesis,
    };
}
