# Workspace Access

## Context

The site has two surfaces:

- **Public** — portfolio landing, projects, CV, blog, web-tools, and the visitor AI chat. Open to everyone.
- **Workspace** (`/workspace/*`) — Cem's personal hub: personal-assistant chat, content editors, profile, future calendar/notes/tasks. Must
  be reachable only by Cem.

Both surfaces share the same GraphQL schema. Workspace operations live on dedicated `Admin` / `AdminMutation` namespaces. Something has to
stop anyone other than Cem from resolving fields under those namespaces.

## Decision

Add `isAdmin: boolean` to the `Users` table. `guardAdmin` and `guardAdminMutation` look the requesting session's user up by `userId` and
allow the operation only when the row exists and `isAdmin = true`.

```ts
// src/server/db/schema.ts
export const users = pgTable('Users', {
  userId: uuid().primaryKey(),
  name: varchar().notNull(),
  isAdmin: boolean().notNull().default(false),
  createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
});
```

```ts
// src/server/guards/guardAdmin.ts (guardAdminMutation is identical with a different return type)
export async function guardAdmin(requestingSession: GqlSSession, serverRuntime: ServerRuntime): Promise<GqlSAdmin> {
  if (!requestingSession.userId) throw new Error('Unauthorized');
  const [row] = await serverRuntime.db
    .select({ isAdmin: users.isAdmin })
    .from(users)
    .where(eq(users.userId, requestingSession.userId))
    .limit(1);
  if (!row?.isAdmin) throw new Error('Unauthorized');
  return {} as GqlSAdmin;
}
```

`Users.isAdmin` defaults to `false`, so every newly-created user — including any future signup path — starts non-admin. The flag is set
manually with `UPDATE "Users" SET "isAdmin" = true WHERE …` for the few accounts that belong to Cem.

### Why a boolean column

- One row per user, one column per fact. The migration is a single `ALTER TABLE`.
- Reads cost one indexed lookup (`userId` is the primary key) per resolved `Query.admin` / `Mutation.admin`, which fires at most once per
  GraphQL request.
- The guard already needs to load by `userId` to be meaningful — adding the column is cheaper than introducing a join.

### Why not the OAuth allowlist (`WORKSPACE_GITHUB_LOGINS`) directly

That env var is documented for the Phase 2 OAuth login but doesn't exist on the session today — most workspace sessions are pre-OAuth,
authenticated only by the cookie-bound `Users` row. Gating on a GitHub login that isn't on the session yet would mean blocking the workspace
entirely until OAuth lands. The boolean is the smallest thing that gates correctly _today_ and survives the OAuth migration: once OAuth is
live, the callback can reconcile `isAdmin` from `WORKSPACE_GITHUB_LOGINS` instead of being hand-set.

### Why not a dedicated `Admins` table

A separate table makes sense once admin membership grows fields (roles, scopes, granted-by, granted-at). Today there is one fact — "is this
row Cem?" — and one user. The boolean column is the right altitude. When the second field appears, moving to an `Admins` table is a
mechanical migration: copy `userId` for every `isAdmin = true` row into the new table, drop the column.

### Anonymous sessions

`GqlSSession.userId` is `string | null | undefined` — sessions don't always have an associated user, and most visitors never do. The guards'
first check rejects any session without a `userId`, so anonymous sessions never reach the DB lookup.

## Alternatives Considered

- **Env-var allowlist at guard time** (no DB column, check `requestingSession.githubLogin` against `WORKSPACE_GITHUB_LOGINS`). Rejected:
  there is no `githubLogin` on the session yet — that field only exists once OAuth lands. Adoption is forced to wait for OAuth.
- **Permissive guard + obscurity** (rely on `noindex` + unlinked + URL-obscurity). Rejected: this was the previous Phase-1 stance. It worked
  while the workspace was empty, but the surface now hosts a real personal assistant; "anyone who types the URL" is too wide.
- **Dedicated `Admins` table from day one.** Rejected: premature. One fact, one user — see above.

## Consequences

- Adding a new admin is a manual `UPDATE` against the production DB. Acceptable while admin count is single-digit.
- Forgetting to set `isAdmin` on a fresh device locks Cem out of the workspace until the row is updated. Recovery is a DB write, not a code
  change.
- The guards now do a DB read per `Query.admin` / `Mutation.admin` resolution. Cost is negligible (PK lookup) and fires at most once per
  request.
- Phase 2 OAuth integrates by writing `isAdmin = true` for every user whose GitHub login is in `WORKSPACE_GITHUB_LOGINS` at callback time.
  The guards do not change.

## Key Files

- `src/server/db/schema.ts` — `users.isAdmin` column
- `src/server/guards/guardAdmin.ts` — read namespace gate
- `src/server/guards/guardAdminMutation.ts` — write namespace gate
- `src/server/graphql/resolversCreate.ts` — guard call sites on `Query.admin` and `Mutation.admin`
- `drizzle/0009_high_human_cannonball.sql` — migration adding the column
