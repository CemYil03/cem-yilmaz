# Workspace Finances

Cashflow tracker and wealth ledger for the admin: an admin editor at `/workspace/finances` with three tabs — **Overview** (net worth),
**Cashflow** (income streams + recurring costs + Sankey), and **Wealth** (asset-first positions with a location label). Cashflow answers
"what comes in and what leaves on a schedule"; Wealth answers "what do I own and where does it sit?". Ledger-shaped concerns (individual
transactions, broker APIs, live price feeds) stay out of scope until this base surface earns its keep — holdings already store `isin` /
`symbol` for a later price job.

## User Behavior

`/workspace/finances` is the surface. Top-level tabs live in the URL as `?tab=cashflow|wealth` (default **Overview** drops the key).
Canonical underlined section tabs — see [conventions.md](../conventions.md#top-of-page-sub-view-switcher).

### Overview

Net-worth strip: **Total** (financial + material), **Liquid cash**, **Investments**, **Bauspar**, **Inventory** (reads
`adminInventoryMaterialNetWorthCentsFindOne`). Below: a monthly cashflow leftover line with deep-links into Cashflow and Inventory.

### Cashflow

- **Period switch** — **Monthly** (default) vs **Quarterly** vs **Yearly** via `?period=`. Scales every number on the tab — summary cards,
  Sankey flows, per-item projections, category subtotals.
- **Period summary** — Income and Payments glass tiles.
- **Sankey** — aggregated income → categories → items (`d3-sankey` + inline SVG).
- **Income streams** / **Recurring costs** lists with add / edit / delete / pause (`active`).

### Wealth

Asset-first list grouped by kind (**Liquid cash** / **Investments** / **Bauspar**). Each row shows name, optional symbol, **location badge**
(TradeRepublic, Chase, LBS, … — a label, not a parent), shares (securities), current value. Actions: reprice, edit, delete. Empty state CTA
to add the first asset.

Dialogs: kind, name, location (text + datalist of known locations), shares/symbol/isin for securities, current value on create only. Later
value changes go through **Reprice** (writes a valuation journal).

Bilingual copy is inline `{ de, en }[locale]` at the call site. Hoisted: `title`, `description`, `CATEGORY_LABELS`, `CADENCE_LABELS`,
`PERIOD_LABELS`, `TAB_LABELS`, `ASSET_KIND_LABELS`.

## Options considered

- **Institution → accounts → holdings vs asset-first + location label.** Broker-first nesting matched how accounts are opened, but the daily
  question is "what do I own?", not "what's at TradeRepublic?". Chosen: **flat assets with a `location` string label** — moving Tagesgeld
  Chase → TradeRepublic is an edit, not a re-parent.
- **Recurring-only vs. transactions vs. full ledger** (cashflow). Chosen: **recurring-only** for the Cashflow tab; Wealth is separate stock.
- **Balances-only vs positions vs full trade journal** (wealth). Chosen: **positions** — `shares` + `currentValueCents` for securities;
  cash/bauspar use value only. Cost basis / dividends / broker sync are future work.
- **Fold inventory into finances.** Rejected — different shape and cadence; Overview only **reads** material net worth. See
  [workspace-inventory.md](./workspace-inventory.md).

## Implementation Details

### Schema (in `src/server/db/schema.ts`)

Admin-only convention — no `*De`/`*En` pairs, no per-row `userId`:

- **`AdminFinancesRecurringCost`** / **`AdminFinancesIncomeStream`** — unchanged cashflow tables.
- **`AdminFinancesAsset`** — `assetId`, `kind` (`cash` | `security` | `bauspar`), `name`, **`location`** (required label),
  **`currentValueCents`** (cached), `shares` (`numeric(18,8)`, securities only), `symbol` / `isin`, `currency`, `notes`, `active`,
  timestamps. Indexed on `kind`, `active`, `location`.
- **`AdminFinancesAssetValuation`** — reprice journal (`valueCents`, optional `shares` snapshot, `valuedAt`, `note`). Cascade on asset
  delete.

Enum tuples: `financeRecurringCostCategories`, `financeCadences`, `financeAssetKinds`.

### GraphQL

`AdminFinancesQuery` mounted at `Admin.adminFinancesFindOne`:

- Existing cashflow list + period totals.
- `adminFinancesAssetFindMany`, `adminFinancesLiquidCentsFindOne`, `adminFinancesInvestedCentsFindOne`, `adminFinancesBausparCentsFindOne`,
  `adminFinancesFinancialNetWorthCentsFindOne` (Σ active assets).

Mutations (batch + `MutationResult`): existing cashflow upserts/deletes, plus `adminFinancesAssetsUpsert` / `adminFinancesAssetsDelete` /
`adminFinancesAssetsReprice`. Upsert seeds `currentValueCents` on create only; reprice owns subsequent value writes (journal + cache in one
transaction).

### CQRS wiring

- Commands: `adminFinancesAssetsUpsert` / `Delete` / `Reprice` (+ existing cashflow commands).
- Queries: `adminFinancesAssetFindMany`, `adminFinancesAssetCentsFindOne` (kind filter optional).
- Mapper: `toGqlAdminFinancesAsset`.
- Resolver wiring in `src/server/graphql/resolversCreate.ts`.

### Client GraphQL

`src/routes/{-$locale}/workspace/finances.graphql` — `WorkspaceFinancesPageUser` fragment includes finances aggregates/assets and
`adminInventoryFindOne.adminInventoryMaterialNetWorthCentsFindOne`. Seed-and-subscribe; mutations do not `router.invalidate()`.

### Route layout

Standard workspace shell. `?tab=` for Overview / Cashflow / Wealth; `?period=` only meaningful on Cashflow. `noindex: true`.

## Assistant integration

`agentPersonalAssistantFinances` handles cashflow **and** wealth. Snapshot inlines income/costs plus assets grouped by kind (with location +
ids) and net-worth totals. Tools: existing cashflow tools plus `financeAssetsList` / `Upsert` / `Delete` / `Reprice`. Prompt rules:
asset-first + location label; reprice ≠ edit; cents conversion.

## Future work

- **Leftover / savings Sankey node** on Cashflow.
- **Multi-source Sankey left column** (per income stream).
- **Price job** — fetch by `isin`/`symbol`, reprice securities automatically.
- **One-off transactions** / bank CSV import.
- **Cost basis / realized P&L** / dividends.
- **Multi-currency** FX (column exists; UI is EUR-only).
