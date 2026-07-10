# Workspace Inventory

Track material belongings — what Cem owns, what each item is worth today, how it's been serviced, and how its value moves over time. This is
the material-assets counterpart to `workspace-finances` (which is instruments / accounts / trading), split into its own focus area because
the two have different data shapes and very different update cadences: finances is checked weekly, inventory is touched when something is
acquired, sold, gifted, damaged, repriced, or serviced.

## Why a separate category

Considered — and rejected — folding this into `workspace-finances`:

- **Different data shape.** Finances is accounts, holdings, and running totals. Inventory is per-item rows with purchase date, warranty
  expiry, serial number, condition, photos, and depreciation.
- **Different update cadence.** A stocks portfolio is checked frequently; a coffee machine's warranty is looked at once every two years.
  Cramming both into one page would push either into the noise.
- **Different reasons to open it.** Insurance claims, resale, gifting, moving house — none of those benefit from being next to trading P&L.

Considered — and rejected — renaming `finances` to `assets`:

- The umbrella reads clean on paper (stocks + material things = "assets") but breaks daily use: it forces two very different rhythms into
  one surface.

The category is called **Inventory** (not `belongings` / `assets` / `possessions`) because that's the noun Cem will type into the address
bar when he needs it.

## User Behavior

- `/workspace/inventory` lists every tracked item, grouped by category (Electronics, Appliance, Kitchen, Furniture, Vehicle, Clothing, Tool,
  Sports, Other). Each category header shows the item count and the sum of current values in that section.
- **Overview strip** at the top of the page: material net worth (sum of `currentValueCents` across owned items), owned-item count, and up to
  three upcoming warranty expirations (within 60 days) with links straight to their detail page.
- **Item card** on the list carries name + brand/model, a warranty badge (green ≥90d out, amber <90d, red past), an optional condition pill,
  purchase date, and current value. Click → item detail. Hover reveals inline edit / delete buttons.
- **Disposal-state tabs**: `Owned` (default), `All`, `Sold`, `Gifted`, `Lost`, `Disposed`. Rendered as the workspace's canonical top-of-page
  underlined section tabs (see [conventions.md](../conventions.md#top-of-page-sub-view-switcher)). Active tab lives in the URL as
  `?filter=…` (the default `owned` is dropped so the canonical landing URL has no query string), so a bookmark to "show me disposed items"
  round-trips.
- **Item detail** (`/workspace/inventory/{itemId}`) is the busy surface:
  - Header with name + brand/model + disposalState pill + "Change status" button.
  - Facts grid: purchase date, purchase price, current value (with inline "Reprice"), serial number, warranty end + provider + notes,
    long-form notes.
  - **Valuations**: a small SVG sparkline of value over time plus a chronological table. Each repricing is journaled — the cached
    `currentValueCents` on the item is the single source of truth for the list view, so the sparkline reads from the journal without
    touching the cache.
  - **Service history**: repair / service / replacement / other events with date, vendor, cost, notes, and an optional `nextDueAt` that
    surfaces as a "next service due" line on the entry.
  - **Files**: receipts, warranty PDFs, invoices, photos, manuals. Upload via the existing `POST /api/file-uploads` → `itemFilesAttach`
    two-step; each file carries a `kind` and can be pinned (the pin toggle goes through `itemFilesUpsert`). Files can be attached at the
    item level or to a specific service entry (invoices, typically) — the entry card shows the invoice inline, and the item-level Files
    section shows the same file too.
- **Disposal**: setting an item to sold / gifted / lost / disposed keeps the row (so material net worth is reconcilable and the history
  survives), stamps `disposedAt` (defaults to now), and drops the row from the default list. Reverting to `owned` clears the stamp. This is
  a field-set on `itemsUpsert` — the "Change status" action carries the existing row with the disposal fields overridden.

## Cross-references

- `/workspace/finances` will eventually display a "material net worth" tile that reads `admin.inventory.materialNetWorthCents` — the field
  is already exposed; the tile lands when the finances page is next touched.
- `/workspace/tax` may consume inventory data later (depreciation on business equipment) — no dependency yet.

## Design decisions

### Why a hard-coded category enum

`itemCategories` is a `const` array in `src/server/db/schema.ts` mirrored as `ItemCategory` in the GraphQL schema. The alternative — a
user-editable `ItemCategories` table — was rejected for v1: the taxonomy is stable ("electronics", "appliance", "kitchen", …), the UI
autocomplete never needs to grow one-off values, and a new category is a one-line change plus a codegen run. Elevate to a table only if the
list starts churning weekly.

### Why a separate `ItemFiles` join table

The alternative — a `fileUploadId` array on the item row — was rejected. `ItemFiles` carries its own metadata (kind, pin, optional
service-entry link) and the same pattern already works on `ProjectFiles`. Reusing `FileUploads` for the raw bytes means the upload flow, the
`/api/file-uploads/:id` download route, and the byte-storage strategy stay identical to chat attachments and project files. Cascade
semantics: deleting an item removes the join rows but preserves the underlying uploads (they belong to the user); deleting a service entry
sets the join's `serviceEntryId` to null so the invoice stays visible on the item.

### Why cache `currentValueCents` on the item

Every list read and the material-net-worth aggregate could compute the "latest by valuedAt" from `ItemValuations` — but at the cost of a
correlated subquery per row. Caching the latest valuation on the item lets the list surface hit one indexed table and read the cached column
directly. The `itemsReprice` command is the single writer: it inserts the journal row and updates the cache in one transaction, so they
can't drift.

### Why `itemsReprice` is a separate mutation (and disposal is not)

Repricing has a coupled side-effect: it appends an `ItemValuations` journal row **and** updates the cached `currentValueCents` in one
transaction. Folding it into `itemsUpsert` would let a naive edit silently overwrite the cache without a matching journal row, so it stays a
separate batch mutation (`itemsReprice`) that owns `currentValueCents`.

Disposal, by contrast, is a pure field-set (`disposalState` + `disposedAt`), so it **collapsed into `itemsUpsert`** — there is no separate
`itemDispose` mutation. The upsert applies the rule `disposedAt = 'owned' ? null : (disposedAt ?? now)`, so entering a disposal state stamps
the date and reverting to `owned` clears it. The edit dialog and the "Change status" action both go through `itemsUpsert` carrying the
existing row (from the subscription payload) with the disposal fields set, so a plain field edit preserves the current state.

## Implementation Details

### Route

- `src/routes/{-$locale}/workspace/inventory.tsx` — list page. Overview strip + disposal-state tabs + grouped list + create/edit dialog +
  delete alert.
- `src/routes/{-$locale}/workspace/inventory_.$itemId.tsx` — detail page. Header, facts grid, valuations (sparkline + journal), service
  history, files.
- `src/routes/{-$locale}/workspace/inventory.graphql` and `.../inventory_.$itemId.graphql` — co-located operations. The list uses the
  `WorkspaceInventoryPageUser` fragment (items + `materialNetWorthCents` + `upcomingWarrantyExpirations`) for seed-and-subscribe; the detail
  uses `WorkspaceInventoryDetailUser` for the singular `item(id)` fetch with valuations, service entries, and files.

### State synchronization

Same seed-and-subscribe posture as `/workspace/media` — mutations don't call `router.invalidate()`. Every command publishes on the
`userUpdates` channel, and the page reconciles by swapping its `useState` with the incoming subscription payload. See
[docs/architecture/state-synchronization.md](../architecture/state-synchronization.md).

### Schema

Four tables in `src/server/db/schema.ts` under a `--- Inventory ---` section:

- `Items` — one row per possession, plus a cached `currentValueCents` snapshot and a `disposalState` (owned / sold / gifted / lost /
  disposed).
- `ItemValuations` — repricing journal, `(itemId, valuedAt DESC)` indexed.
- `ItemServiceEntries` — service events with optional `nextDueAt`.
- `ItemFiles` — join between items and `FileUploads`, with optional `serviceEntryId` for invoices tied to specific events.

Enums (`itemCategories`, `itemConditions`, `itemDisposalStates`, `itemServiceKinds`, `itemFileKinds`) are const arrays exported alongside
the tables, mirrored as GraphQL enums.

### GraphQL

- Read: `AdminInventoryQuery` mounted on `extend type Admin`. Fields: `items(includeDisposed)`, `item(itemId)`, `materialNetWorthCents`,
  `upcomingWarrantyExpirations(withinDays)`.
- Write: 8 batch mutations under `extend type AdminMutation`, all returning `MutationResult { success, referenceId, referenceIds }` — the
  hydrated entity is never returned; the `userUpdates` subscription is the single source of truth. Every entity mutation is a batch (single
  edits pass a one-element array): `itemsUpsert`, `itemsDelete`, `itemsReprice`, `itemServiceEntriesUpsert`, `itemServiceEntriesDelete`,
  `itemFilesAttach`, `itemFilesDelete`, `itemFilesUpsert`. `referenceIds` echoes the row id per input in input order.
  - **Disposal collapsed into `itemsUpsert`.** `ItemInput` carries optional `disposalState` + `disposedAt`; there is no `itemDispose`
    mutation.
  - **Pin toggle collapsed into `itemFilesUpsert`.** `itemFilesUpsert` is edit-only (`ItemFileUpsert { itemFileId, label, pinned }`, every
    input requires `itemFileId` — it never creates rows); the UI toggles a pin by passing the existing row's id with the flipped `pinned`.
    There is no `itemFileTogglePin` mutation. Creating a file join is still `itemFilesAttach`.
  - **`itemsReprice` stays separate** because it appends a valuation journal row and updates the cached `currentValueCents` in one
    transaction (a side-effect beyond a field-set).
- Gated once at `Mutation.admin → guardAdminMutation`; child resolvers assume they're guarded (same posture as Media / Projects).

### CQRS wiring

- `src/server/commands/item*.ts` — one file per batch mutation (`itemsUpsert`, `itemsDelete`, `itemsReprice`, `itemServiceEntriesUpsert`,
  `itemServiceEntriesDelete`, `itemFilesAttach`, `itemFilesDelete`, `itemFilesUpsert`), each following the `moviesUpsert` /
  `adminTravelTripsUpsert` batch template.
- `src/server/queries/{adminInventoryItemFindMany,adminInventoryItemFindOne,adminInventoryMaterialNetWorthCentsFindOne,adminInventoryItemUpcomingWarrantyFindMany}.ts`.
- `src/server/mappers/{toGqlItem,toGqlItemValuation,toGqlItemServiceEntry,toGqlItemFile}.ts`.
- Wired in `src/server/graphql/resolversCreate.ts` — the single entry point.

### Breadcrumb

`WORKSPACE_TITLES` and `WORKSPACE_ICONS` already carry the `inventory` segment (icon: `PackageIcon`). The detail route registers a
`TRAILING_LABEL_SELECTORS` entry in `WorkspaceHeader.tsx` so the trailing crumb shows the item's name instead of its UUID — same shape the
project detail already uses.

### SEO

`noindex: true` on both routes, not in `SITEMAP_PATHS` — same posture as the rest of `/workspace/*`.

## Assistant integration

The workspace assistant can add and edit items, reprice them, log service events, dispose of things, and tidy attached files from natural
language, so "Ich habe mein MacBook Pro für 2500 € gekauft, bitte trag das ein" lands an `electronics` item with its current value seeded
from the purchase price — without opening the page. This follows the orchestrator + sub-agent recipe in
[../architecture/agent-delegation.md](../architecture/agent-delegation.md), mirroring the finances / travel domains:

- **Sub-agent** — `src/server/agents/agentPersonalAssistantInventory.ts`. System prompt carries the persona, the cents-conversion rule
  ("2.500 €" → `250000`), the "reprice ≠ edit" rule (current value is owned by `inventoryItemsReprice`, which journals a valuation — the
  upsert cannot touch it), the "dispose, don't delete" rule (set `disposalState` so net-worth math stays reconcilable), the file-upload
  limitation (see below), and the `needsMoreInfo` / `noOp` sentinel contract.
- **Snapshot** — `src/server/agents/inventorySnapshotForAgent.ts` inlines material net worth, the owned-item count, warranties expiring
  within 60 days, and every owned item grouped by category (with ids), so the sub-agent answers "how much are my things worth?" and "which
  warranties are lapsing?" straight from its prompt. Disposed rows are omitted from the snapshot; the agent reaches them via
  `inventoryItemsList` with `includeDisposed: true`.
- **Tools** — thin wrappers over the same commands/queries the resolvers use: `toolInventoryItemsUpsert`, `toolInventoryItemsDelete`,
  `toolInventoryItemsReprice`, `toolInventoryServiceEntriesUpsert`, `toolInventoryServiceEntriesDelete`, `toolInventoryFilesUpsert`,
  `toolInventoryFilesDelete`, and the read-only `toolInventoryItemsList`. `toolInventoryItemsUpsert` and `toolInventoryItemsReprice` are
  hand-built Zod (their `disposedAt` / `valuedAt` fields are `DateTime` scalars — see
  [agent-delegation.md](../architecture/agent-delegation.md#tool-input-schemas)); `toolInventoryServiceEntriesUpsert` and
  `toolInventoryFilesUpsert` reuse the generated `GqlSItemServiceEntryInputSchema()` / `GqlSItemFileUpsertSchema()` verbatim.
- **Delegate** — `toolDelegateToInventory` (orchestrator-side), registered in `agentPersonalAssistant.ts`. Writes fan out `userUpdates`, so
  the open inventory page re-renders the new item / value / net worth without a manual refresh. The orchestrator's route-map block links
  every mentioned item as `[<name>](/workspace/inventory/<itemId>)` using the ids the delegate returns in its `mutations` array.

**File upload is deliberately not wrapped.** `itemFilesAttach` needs bytes uploaded via `POST /api/file-uploads` first — a two-step flow a
chat sub-agent has no way to perform. So the assistant gets `itemFilesUpsert` (rename / pin an already-attached file) and `itemFilesDelete`
(detach), but not attach; the sub-agent's prompt tells it to point Cem at the item's Files section when he wants to add a new file. This
mirrors why travel / finances / nutrition / fitness ship no file tools at all.

## Open TODOs

- **Finances tile.** Once `/workspace/finances` graduates from stub, add a "material net worth" tile reading
  `admin.inventory.materialNetWorthCents` and link to `/workspace/inventory`. Schema side is ready.
- **Category taxonomy.** The hard-coded enum is fine today. If ad-hoc categories start showing up in notes, promote to an `ItemCategories`
  table (with a user-editable list + default seed).
- **Bulk actions.** Multi-select on the list for "mark as sold" / "export" would be nice but out of scope for v1.
- **Reminders.** `nextDueAt` on service entries and `warrantyEndsAt` on items don't fire anything yet. A job that pushes into
  `/workspace/todos` (or a personal-assistant nudge) is a natural follow-up.
