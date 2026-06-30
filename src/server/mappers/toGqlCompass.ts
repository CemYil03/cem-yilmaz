import type { Compass } from '../db/schema';
import type { GqlSAdminCompass } from '../graphql/generated';

// Three text artifacts plus the synthesis bookkeeping. The `observations`
// and `synthesisInProgress` fields on `AdminCompass` are resolved separately
// — the parent shell returned here carries placeholders that the dedicated
// field resolvers overwrite. `observations` is omitted because it takes
// arguments and runs its own join; `synthesisInProgress` is omitted because
// it is derived from pg-boss state, not the `Compass` row.
export function toGqlCompass(row: Compass): Omit<GqlSAdminCompass, 'observations' | 'synthesisInProgress'> {
    return {
        summary: row.summary,
        prose: row.prose,
        psychology: row.psychology,
        synthesizedAt: row.synthesizedAt,
        synthesisModelId: row.synthesisModelId,
        observationsSinceSynthesis: row.observationsSinceSynthesis,
    };
}
