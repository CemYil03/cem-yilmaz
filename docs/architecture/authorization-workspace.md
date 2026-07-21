# Workspace Access

## Context

The site has two surfaces:

- **Public** — portfolio landing, projects, CV, and the visitor AI chat (Q&A about Cem + OTP-verified project requests). Open to everyone.
- **Workspace** (`/workspace/*`) — personal-assistant chat, content editors, compass, and focus areas for users with `isAdmin = true`. Must
  not be reachable by non-admins.

Both surfaces share the same GraphQL schema. The workspace **read** namespace hangs off `Session.user.admin`; the **write** namespace lives
at `Mutation.admin`. Something has to stop non-admin callers from resolving fields under those namespaces.

## Decision

Add `isAdmin: boolean` to the `Users` table. Access is simply: the current session has a `userId`, and that user's row has `isAdmin = true`.

- **Reads.** `User.admin: Admin` is nullable. The `User.admin` resolver returns the empty `Admin` shell only when the requesting session
  owns the parent user row AND that row has `isAdmin = true`; in every other case it returns `null`. Because the field is nullable a
  non-admin caller gets `sessionFindOne.user.admin = null` instead of an exception — every public page (landing, `/about`, `/cv`,
  `/projects`) composes this probe in its route loader and passes the boolean into `<Header showWorkspaceLink=… />`, so the "Workspace" icon
  button surfaces on every public surface an admin might arrive on. Workspace pages use the same field to render an inline "no access"
  surface when they encounter null.
- **Writes.** `Mutation.admin: AdminMutation!` is non-nullable and gated by `guardAdminMutation`, which still throws on non-admins. Writes
  are not composable from the public surface, so the throw-on-mismatch contract is correct there. The guard also stamps the admin's `userId`
  onto the returned `AdminMutation` shell, so every admin-mutation resolver has it on the parent — each command ends with
  `serverRuntime.publish.userUpdates({ userId })`, fanning out a single notification per admin write so any `User`-bound subscription
  re-resolves regardless of which mutation moved. Visitor (public-scope) sends of the chat mutations remain quiet — they own no `User` row
  to refresh.

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
// src/server/graphql/resolversCreate.ts — User.admin resolver
User: {
  async admin(parentUser, _, requestingSession) {
    if (!requestingSession.userId || requestingSession.userId !== parentUser.userId) return null;
    const [row] = await serverRuntime.db
      .select({ isAdmin: users.isAdmin })
      .from(users)
      .where(eq(users.userId, parentUser.userId))
      .limit(1);
    return row?.isAdmin ? ({} as GqlSAdmin) : null;
  },
},
```

`Users.isAdmin` defaults to `false`, so every newly-created user starts non-admin. The flag is set manually with
`UPDATE "Users" SET "isAdmin" = true WHERE …` for the admin accounts in use. How that flag gets set in the future (manual SQL, an auth
callback, etc.) is out of scope for the gate itself — the gate only reads the column.

### Why a boolean column

- One row per user, one column per fact. The migration is a single `ALTER TABLE`.
- Reads cost one indexed lookup (`userId` is the primary key) per resolved `User.admin` / `Mutation.admin`, which fires at most once per
  GraphQL request.
- The resolver already needs to load by `userId` to be meaningful — adding the column is cheaper than introducing a join.

### Why the read side returns null instead of throwing

The earlier design exposed `Query.admin: Admin!` (non-null) gated by a `guardAdmin` helper that threw on non-admins. That made it impossible
to ask "is the visitor an admin?" from the public landing page without catching a GraphQL error. Moving the field under `User.admin` and
making it nullable turns admin-ness into a regular query that anyone can compose; the workspace pages still gate on the field being non-null
and render the `<WorkspaceUnauthorized />` surface when it's null.

### Why not a dedicated `Admins` table

A separate table makes sense once admin membership grows fields (roles, scopes, granted-by, granted-at). Today there is one fact — "is this
row an admin?" — and a handful of user rows. The boolean column is the right altitude. When the second field appears, moving to an `Admins`
table is a mechanical migration: copy `userId` for every `isAdmin = true` row into the new table, drop the column.

### Anonymous sessions

`GqlSSession.userId` is `string | null | undefined` — sessions don't always have an associated user, and most visitors never do. Anonymous
sessions resolve `sessionFindOne.user = null`, so `sessionFindOne.user?.admin` short-circuits to `undefined` and never reaches the
`User.admin` resolver at all.

## Alternatives Considered

- **Permissive guard + obscurity** (rely on `noindex` + unlinked + URL-obscurity). Rejected: this was the previous stance while the
  workspace was empty, but the surface now hosts a real personal assistant; "anyone who types the URL" is too wide.
- **Top-level `Query.admin: Admin!` gated by `guardAdmin`.** Was the original shape; replaced because the non-null + throw contract was
  incompatible with composing the field on the public landing page. The single read-side guard helper went away with it; the policy is now
  inlined as the `User.admin` resolver.
- **Dedicated `Admins` table from day one.** Rejected: premature. One fact, few users — see above.

## Consequences

- Adding a new admin is a manual `UPDATE` against the production DB. Acceptable while admin count is single-digit.
- Forgetting to set `isAdmin` on a fresh device locks that session's user out of the workspace until the row is updated. Recovery is a DB
  write, not a code change.
- The `User.admin` resolver does a DB read per request that selects the field. Cost is negligible (PK lookup) and fires at most once per
  request.

## Key Files

- `src/server/db/schema.ts` — `users.isAdmin` column
- `src/server/graphql/resolversCreate.ts` — `User.admin` resolver (read side) and `Mutation.admin` guard call site
- `src/server/guards/guardAdminMutation.ts` — write namespace gate
- `src/web/components/WorkspaceUnauthorized.tsx` — shared "no access" surface rendered by workspace pages whose loader saw a null `admin`
- `drizzle/0009_high_human_cannonball.sql` — migration adding the column
