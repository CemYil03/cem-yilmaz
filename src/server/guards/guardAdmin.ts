import type { GqlSAdmin, GqlSSession } from '../graphql/generated';

// Gates the workspace read namespace (`Query.admin`).
//
// Phase 1: permissive. The workspace surface is `noindex`, unlinked from the
// public site, and reachable only by typing `/workspace`. The hub now hosts
// the personal-assistant composer (see `docs/features/workspace-hub.md`), so
// the admin namespace must be reachable in Phase 1 — gating it on a guard
// that always throws would block Cem's own access.
//
// The empty-object cast is correct because every field on `Admin` has its
// own resolver in `resolversCreate.ts` that ignores `_parent`; the namespace
// is purely a routing label.
//
// TODO(phase-2): replace this permissive return with a real check against
// the OAuth-derived GitHub login on `requestingSession`, sourced from
// `WORKSPACE_GITHUB_LOGINS`. See `docs/architecture/multi-agent-chat.md`.
export function guardAdmin(_requestingSession: GqlSSession): GqlSAdmin {
    return {} as GqlSAdmin;
}
