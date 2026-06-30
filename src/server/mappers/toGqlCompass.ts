import type { Compass } from '../db/schema';
import type { GqlSAdminCompass } from '../graphql/generated';

// Three text artifacts plus the synthesis bookkeeping. Several `AdminCompass`
// fields are resolved separately by the parent's field resolvers — `observations`
// (parameterized join), `synthesisInProgress` (derived from pg-boss), and the
// `interviews` / `interview` / `interviewPending` rails (their own queries) —
// so they're all omitted from this shell mapper.
export function toGqlCompass(
    row: Compass,
): Omit<GqlSAdminCompass, 'observations' | 'synthesisInProgress' | 'interviews' | 'interview' | 'interviewPending'> {
    return {
        summary: row.summary,
        prose: row.prose,
        psychology: row.psychology,
        synthesizedAt: row.synthesizedAt,
        synthesisModelId: row.synthesisModelId,
        observationsSinceSynthesis: row.observationsSinceSynthesis,
    };
}
