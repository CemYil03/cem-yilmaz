# Content Model: DB-backed timeline + static identity

## Context

Most pages on this site come in two flavours of content:

1. **Identity facts** — name, date of birth, nationality, contact handles, the bio paragraph. These change once a decade. Editing through an
   admin UI is overhead for fields that nobody will edit.
2. **Editable timeline content** — CV entries, projects, blog posts, web-tools, watchlist entries. These grow over time and need an admin
   surface so adding a new one is 30 seconds, not a PR + redeploy.

Treating both the same way ends in pain on whichever side you compromise: a CMS table for the bio is overkill, and a static config file for
the CV is friction every time a job changes.

## Decision

Split by editing cadence:

- **Static**: typed config file under `src/web/content/`. Read directly from both server and client (it's pure data, no runtime). Edited via
  PR. Used today by `personalInfo.ts` (CV identity facts).
- **DB-backed**: Drizzle table + CQRS layer (queries, commands, mappers, resolver) + admin form on `/workspace/<thing>`. Used today by the
  CV timeline tables (`cvExperience`, `cvEducation`, `cvSkill`, `cvHobby`), the workspace projects tables (`projects`, `tasks`,
  `projectActivities`, `projectLinks`, `projectFiles`), and the media library tables (`movies`, `mediaChannels`); will be used by Phase 3's
  blog/tools.

## Conventions for DB-backed editable lists

A new editable-list domain follows the same shape every time:

1. **Schema** — uuid PK, paired `*De` / `*En` text columns for any bilingual field, an integer `position` column for ordering, `createdAt` /
   `updatedAt` timestamps. Postgres `text[]` for inline label arrays (technology chips, tags) when the labels are display-only and never
   queried by relation.
2. **GraphQL** — a `Query.<thing>` namespace with the read shape (`experience`, `education`, etc.), and one mutation triple per entity on
   `AdminMutation`: `<entity>Upsert(input)`, `<entity>Delete(<entity>Id)`, `<entity>Reorder(orderedIds)`. Bilingual columns surface as
   paired `*De` / `*En` GraphQL fields — the client picks per-locale at render time.
3. **Server** — one query file per list (`<entity>List.ts`), three command files per entity (`<entity>Upsert.ts`, `Delete.ts`,
   `Reorder.ts`), one mapper (`toGql<Entity>.ts`). All wired in `src/server/graphql/resolversCreate.ts`.
4. **Read pages** — public route loads the list query through `routeLoaderGraphqlClient`, renders with a presentational component that knows
   nothing about GraphQL.
5. **Admin page** — `/workspace/<thing>` route, `noindex`, gated server-side by `guardAdminMutation`. One inline form open at a time, single
   `useQuery` driving the list, mutations re-fetch with `requestPolicy: 'network-only'`.

### When a field is not actually bilingual

The `*De` / `*En` pair is for **translatable prose** — roles, descriptions, degree names, notes. **Proper nouns** read the same in both
locales: company names (`SAP SE`, `peopleeat`), institution names (`Duale Hochschule Baden-Württemberg Karlsruhe`), skill labels
(`TypeScript`). Those live on a single untranslated column — `cvExperience.company`, `cvEducation.institution`, `cvSkill.label`. Pairing
them would force the editor to type the same string twice and let the two halves drift. The rule: **if the German and English values would
be identical for every row you can imagine, drop the pair**.

## Conventions for static identity content

1. **Location** — `src/web/content/<name>.ts`. Under `web/` so the client can import it without going through the TanStack Start server-only
   bundle splitter; the server can still import it (server can read web, web can't read server).
2. **Shape** — single typed export, no runtime, no env reads. Bilingual fields use `{ de, en }` literals matching the inline copy pattern
   the routes already use.
3. **Public visibility** — when a static file holds fields with mixed public/private posture (the CV's phone number is private; the GitHub
   handle is public), include a `publicVisibility` record so consumers can branch on a flag instead of duplicating the literal data.

## Reorder semantics

`<entity>Reorder` takes the full id array in the desired order and rewrites every `position` in a transaction. It is not delta-based — the
client always sends the canonical order. This is simpler than tracking diffs and matches what the typical drag-reorder handler emits anyway.

A partial-write protection (transaction wrapper) means a network failure mid-reorder leaves the list in its prior order rather than with
duplicate positions. The list-read query orders by `position ASC`; ties (theoretically possible if the editor types duplicate numbers) fall
to whatever order Postgres chose, which is acceptable for the row counts here.

## When NOT to use DB-backed content

- **Stable identity facts** — see above. `src/web/content/`.
- **Generated content** — sitemaps, OG images, and so on. These come from data already in the system; a new table just adds drift.
- **Per-request derivations** — anything you'd cache for under a minute. The DB row + write surface is overhead the cache wouldn't be.

## When NOT to use static content

- **Anything Cem will edit more than twice a year**. Static content edits ship through CI, with a commit log and review. That's the right
  weight for a phone number, the wrong weight for a job entry.

## When a DB-backed list skips bilingual columns

The `*De` / `*En` column pair is the rule for surfaces visitors render — the visitor's locale picks the half they see. **Admin-only**
surfaces drop the pair. The workspace projects feature is the canonical example: `AdminProject` and `AdminProjectTask` are never rendered to
the public site (the page is `noindex` and the data feeds nothing on the visitor surface in Phase 1–2), so paired columns would cost typing
without buying anything. The schema uses single `title` / `description` / `notes` text columns; the GraphQL types do the same. The CV tables
stay bilingual because their rows feed `/cv` and `/about` directly. See [features/workspace-projects.md](../features/workspace-projects.md).

The Media (`AdminMediaMovie` / `AdminMediaShow` / `AdminMediaChannel`) and Inventory (`AdminInventoryItem` / `AdminInventoryItemValuation` /
`AdminInventoryItemServiceEntry` / `AdminInventoryItemFile`) tables follow the same admin-only, no-`*De`/`*En` posture. Inventory reuses the
shared `FileUploads` table for receipts / warranty PDFs / photos through an `AdminInventoryItemFile` join, mirroring how `AdminProjectFile`
handles project attachments — the bytes never live on the domain table, only on `FileUploads`. See
[features/workspace-inventory.md](../features/workspace-inventory.md).

## Tasks: added columns

Beyond the base task shape (title, notes, status, position, dueAt, completedAt), the `AdminProjectTask` table carries two optional enum
columns that drive the redesigned todos experience:

- `effort` (`quick` / `focused` / `deep`, nullable) — perceived weight, drives the left-edge color strip on the row card and the composer's
  default-effort picker.
- `whenBucket` (`today` / `week` / `someday` / `waiting`, nullable) — when the user intends to act, independent of any due date. Drives the
  top filter chips.

Both are nullable so pre-existing rows and rows created outside the new composer render cleanly (unclassified rows omit the effort strip and
skip the metadata chip). See [features/workspace-todos.md](../features/workspace-todos.md) for the full behaviour spec.
