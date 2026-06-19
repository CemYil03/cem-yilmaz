import type { GqlSAdminMutation, GqlSSession } from '../graphql/generated';

// Gates the workspace write namespace (`Mutation.admin`).
//
// Phase 1: permissive. Mirrors `guardAdmin` for the read namespace — see
// `guardAdmin.ts` for the rationale. Split into a dedicated guard so the
// Phase 2 OAuth check can layer in different policy on writes if needed
// (e.g. CSRF posture, narrower allowlist) without dragging the read path
// along.
//
// TODO(phase-2): replace this permissive return with a real check against
// the OAuth-derived GitHub login on `requestingSession`, sourced from
// `WORKSPACE_GITHUB_LOGINS`. See `docs/architecture/multi-agent-chat.md`.
export function guardAdminMutation(_requestingSession: GqlSSession): GqlSAdminMutation {
    return {} as GqlSAdminMutation;
}
