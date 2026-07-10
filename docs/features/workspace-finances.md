# Workspace Finances

Recurring-cost tracker for Cem: an admin editor at `/workspace/finances` with a Sankey chart that visualises where the money goes each
period. This is the first iteration — a durable list of _what leaves the account on a schedule_ (rent, insurance, subscriptions, transport,
…), scaled monthly or yearly on demand. Ledger-shaped concerns (individual transactions, holdings, trading, bank import) are out of scope
until this base surface earns its keep.

## User Behavior

`/workspace/finances` is the surface. Top-down:

- **Overview strip** — three tiles. Per-month total, per-year total, monthly net income (with an inline pencil that opens a small dialog to
  set or clear it). The income tile also shows how much is left after the recurring costs are paid ("`X leftover`" / "`X over income`", or a
  prompt to set the baseline).
- **Period switch** — canonical top-of-page underlined section tabs (see [conventions.md](../conventions.md#top-of-page-sub-view-switcher)):
  **Monthly** (default) vs **Yearly**. Lives in the URL as `?period=yearly`; the default drops the key so the canonical landing URL has no
  query string. The switch scales every number on the page — Sankey flows, per-item projections, category subtotals — nothing else moves.
- **Sankey** — income → categories → items. Wrapped in a `GlassCard`, drawn as inline SVG using `d3-sankey` for the layout math (no chart
  library shell — see below). Hovering a flow shows the flow's amount as a native SVG `<title>` tooltip.
- **Grouped list** — every recurring cost grouped by category (`housing`, `connectivity`, `transport`, `insurance`,
  `subscriptionsEntertainment`, `subscriptionsWork`, `memberships`, `donations`, `household`, `savingsGeneral`, `savingsVacation`, `other`).
  Each row shows name, the row's own amount + cadence, and the projected amount at the current period. Inline edit / delete affordances on
  hover. Inactive rows stay in the list at reduced opacity with a "Paused" badge — they don't count toward totals or the Sankey.
- **Empty state** replaces the list when there are zero rows, with a "Add the first cost" call to action.
- **Dialog** for new / edit. Fields: name (required), category, amount in EUR (required, positive), cadence (monthly / yearly), notes,
  active. Same shape as the inventory dialog. Delete uses `AlertDialog` and warns the user that toggling `active` off is the softer
  alternative.

Bilingual copy is inline `{ de, en }[locale]` at the call site per [conventions.md](../conventions.md#bilingual-copy). Only `title`,
`description`, `CATEGORY_LABELS`, `CADENCE_LABELS`, and `PERIOD_LABELS` are hoisted — reused across `seoMeta()`, the `<h1>`, the Select
options, and the tab labels.

## Options considered

- **Recurring-only vs. transactions vs. full ledger.** A ledger would answer more questions (categorised spending against real bank data,
  drift from a budget, trend lines) but requires either a bank import or manual entry of every transaction — both are heavier than the
  question actually being asked ("what am I paying every month?"). A recurring-only model with a per-cadence toggle gives a clean answer
  today and leaves room to layer transactions on top later. Chosen: **recurring-only**.
- **Sankey shape.** Two-column (income → category) is simpler; income → category → item is one level deeper and shows _which_ subscription
  is the fat one, not just that subscriptions overall are fat. Cost is one more node column and a heavier layout — trivial with d3-sankey.
  Chosen: **income → category → item**.
- **Period switch semantics.** Considered a month/year date picker; rejected because there is no dated data behind it in v1 — every month
  would look identical. A projection toggle (monthly ↔ yearly) is honest about what the numbers mean and free of ambiguity. Chosen: **toggle
  only**.
- **Chart lib.** Considered Recharts (higher-level, larger dep, less styling control) and hand-rolled flow bars (cheap, worse-looking).
  `d3-sankey` gives us the crossing-minimization layout and lets us stay on inline SVG — the repo's established posture, see the sparkline
  in `inventory_.$itemId.tsx`. Chosen: **d3-sankey + d3-shape**.

## Implementation Details

### Schema (in `src/server/db/schema.ts`)

Two tables, admin-only convention — no `*De`/`*En` pairs, no per-row `userId` (the `User.admin` / `Mutation.admin` gate authorizes):

- **`AdminFinancesRecurringCost`** — `costId`, `name`, `categoryKey` (enum: `housing` | `connectivity` | `transport` | `insurance` |
  `subscriptionsEntertainment` | `subscriptionsWork` | `memberships` | `donations` | `household` | `savingsGeneral` | `savingsVacation` |
  `other`, default `other`), `amountCents` (per-`cadence` amount), `cadence` (`monthly` | `yearly`, default `monthly`), `currency`
  (`char(3)`, default `EUR`), `notes`, `active` (default `true`), `startsOn` / `endsOn` (informational for v1), timestamps. Indexed on
  `categoryKey` (list groups by it) and `active` (the SQL totals filter by it).
- **`AdminFinancesSettings`** — per-admin config keyed by `userId` (FK to `Users` with cascade). Currently just `monthlyNetIncomeCents`
  (nullable — null = unset). Sits next to the domain table because "my income" is meaningful only per user; the recurring-cost rows are not.

Enum tuples exported as `financeRecurringCostCategories` and `financeCadences`, mirrored in `schema.graphqls` as
`AdminFinancesRecurringCostCategory` / `AdminFinancesCadence`.

### GraphQL

`AdminFinancesQuery` mounted at `Admin.adminFinancesFindOne`:

- `adminFinancesRecurringCostFindMany: [AdminFinancesRecurringCost!]!` — every row, ordered by category then name.
- `adminFinancesMonthlyNetIncomeCentsFindOne: Int` — null when unset.
- `adminFinancesMonthlyExpensesCentsFindOne: Int!` and `adminFinancesYearlyExpensesCentsFindOne: Int!` — projected totals over the active
  rows, computed in one SQL pass (see `adminFinancesExpensesCentsFindOne`). Yearly rows contribute `amount / 12` to the monthly total and
  `amount` to the yearly total; monthly rows do the mirror.

`AdminMutation` extensions follow the repo-wide batch + `MutationResult` conventions:
`adminFinancesRecurringCostsUpsert(financeRecurringCosts: [AdminFinancesRecurringCostInput!]!)`,
`adminFinancesRecurringCostsDelete(costIds: [ID!]!)` — both return `MutationResult!` (`referenceIds` echoes the row id per input in input
order). Single-item edits (the dialog, the delete alert) pass a one-element array; pausing a cost rides the same upsert with `active`
flipped. `adminFinancesMonthlyNetIncomeSet(amountCents: Int)` stays singular — it writes the one per-admin settings row, so there is nothing
to batch; a nullable `amountCents` clears the baseline and it too returns `MutationResult!`. The `userUpdates` subscription re-renders the
totals in all three cases.

### CQRS wiring

- Commands: `adminFinancesRecurringCostsUpsert` (two-phase batch — single pre-flight `inArray` existence check for update ids, per-row
  insert/update in the loop, one transaction), `adminFinancesRecurringCostsDelete` (batch hard delete — inactive rows are the soft option),
  `adminFinancesMonthlyNetIncomeSet` (`ON CONFLICT DO UPDATE` on the `userId` PK, singleton setter). Each publishes `userUpdates` on
  success.
- Queries: `adminFinancesRecurringCostFindMany`, `adminFinancesMonthlyNetIncomeCentsFindOne`, `adminFinancesExpensesCentsFindOne` (returns
  `{ monthlyCents, yearlyCents }` — the two total resolvers both call it).
- Mapper: `toGqlAdminFinancesRecurringCost` — scalar 1:1 (used by the `FindMany` query; the batch commands return `MutationResult` and no
  longer hydrate rows).
- Resolver wiring: `Admin.adminFinancesFindOne` shell, four `AdminFinancesQuery` field resolvers, three `AdminMutation` handlers (the two
  batch handlers unwrap `args.financeRecurringCosts` / `args.costIds` before calling the command) — all in
  `src/server/graphql/resolversCreate.ts`.

### Client GraphQL

`src/routes/{-$locale}/workspace/finances.graphql` follows the seed-and-subscribe posture: one `WorkspaceFinancesPageUser` fragment reused
by the loader query and the `userUpdates` subscription, plus the three mutation documents. Mutations do not `router.invalidate()` — the
subscription delivers the new state.

### Sankey chart

`src/web/components/FinancesSankey.tsx` — inline SVG at `viewBox="0 0 960 480"`, `preserveAspectRatio="xMidYMid meet"`, sized responsively
via `className="w-full h-auto"`. `d3-sankey` does the layout; `d3-shape`'s `sankeyLinkHorizontal` draws the flow paths.

- Colours resolve via Tailwind semantic classes (`fill-primary`, `fill-primary/70`, `fill-muted-foreground/60`, `stroke-primary/25`), so
  light / dark themes both work without a per-mode branch and no hard-coded `oklch(...)` values reach the component.
- `role="img"` + `aria-label` on the root SVG carry a one-line summary of the period and total for screen readers. Every rectangle and path
  also carries a native SVG `<title>` for hover tooltips.
- No animation. The motion doc's guardrails call for animations that answer a question the user is already asking; a Sankey settling into
  place at page load doesn't. If the shape earns a fade-in later, wrap in `Reveal`.

Data building lives in `buildSankey()` in the route file, not the component — the route knows the period toggle and the income baseline. It
filters active rows, groups by `categoryKey`, and emits nodes / links in three tiers: one `income` node (labelled with the net income when
set, or "Expenses" with the total when not), one `category` node per non-empty category, one `item` node per active cost.

### Period math

`projectedCents(row, period)` is the single source of truth for scaling:

- `row.cadence === period` → `row.amountCents`.
- `period === 'monthly'`, row is yearly → `Math.round(row.amountCents / 12)`.
- `period === 'yearly'`, row is monthly → `row.amountCents * 12`.

`Math.round` for the monthly-from-yearly case is intentional; the yearly-from-monthly case is exact integer multiplication.

### Route layout

Standard workspace shell — `max-w-8xl mx-auto w-full px-6 md:px-10 lg:px-16 py-12`, `noindex: true` in `seoMeta`. Loader uses
`routeLoaderGraphqlClient(WorkspaceFinancesPageDocument)`, `staleTime: 0`. `useWorkspaceFinancesLiveUser(seed)` — the seed-and-subscribe
hook, imperative URQL over `wonka`. If `user.admin` is null → `<WorkspaceUnauthorized />`.

## Cross-references

- `AdminInventoryQuery.adminInventoryMaterialNetWorthCentsFindOne` already exists and is a natural addition to the overview strip — noted in
  _Future work_.
- The workspace assistant sub-agent factory (`src/server/agents/agentPersonalAssistantFinances.ts`) gains recurring costs from natural
  language via `delegateToFinances`, mirroring `agentPersonalAssistantTravel.ts`. See _Assistant integration_ below.

## Assistant integration

The workspace assistant can create, edit, pause, and delete recurring costs — and set / clear the monthly net-income baseline — from natural
language, so "Ich zahle für Apple One 25,95 im Monat, bitte füge das meinen Ausgaben hinzu" lands a `subscriptions` / `monthly` /
`amountCents: 2595` row without opening the page. This follows the orchestrator + sub-agent recipe in
[../architecture/agent-delegation.md](../architecture/agent-delegation.md), mirroring the travel domain 1:1:

- **Sub-agent** — `src/server/agents/agentPersonalAssistantFinances.ts`. System prompt carries the persona, the cents-conversion rule
  ("25,95 im Monat" → `amountCents: 2595, cadence: "monthly"`), the "add to my expenses = recurring cost, there is no dated-transaction
  model" rule, and the `needsMoreInfo` / `noOp` sentinel contract (asks for the amount when a new cost has only a name).
- **Snapshot** — `src/server/agents/financesSnapshotForAgent.ts` inlines every cost grouped by category (with ids), the income baseline, and
  the current monthly/yearly totals, so the sub-agent answers "how much do I spend?" straight from its prompt.
- **Tools** — thin wrappers over the same commands/queries the resolvers use: `toolFinanceRecurringCostsUpsert` (reuses the generated,
  Gemini-safe `GqlSFinanceRecurringCostInputSchema()`), `toolFinanceRecurringCostsDelete`, `toolFinanceMonthlyNetIncomeSet`, and the
  read-only `toolFinanceRecurringCostsList`. Pausing rides the upsert with `active: false` — the softer alternative to a hard delete.
- **Delegate** — `toolDelegateToFinances` (orchestrator-side), registered in `agentPersonalAssistant.ts`. Writes fan out `userUpdates`, so
  the open finances page re-renders the new totals + Sankey without a manual refresh.

No deep-link template exists for finances yet: `/workspace/finances` has no `focus` search param (unlike projects / media / medical), so the
assistant names costs in plain text rather than linking to them. Adding `focus` scroll/flash handling to the route would let a template land
later.

## Future work

- **Leftover / savings node.** Add a fourth-tier `leftover` node so `income → categories … + income → leftover` balances when income >
  expenses. Straightforward once income is a first-class node in the graph.
- **Material net worth tile.** Pull `AdminInventoryQuery.adminInventoryMaterialNetWorthCentsFindOne` into the overview strip so the finances
  page shows both the flow (recurring costs) and the stock (net worth) picture.
- **One-off transactions.** Add `FinanceTransactions` with a `date` and `amountCents`; extend the Sankey with a "This month" mode that reads
  transactions instead of projections. Preserves the current model — recurring costs stay authoritative for the "typical month" question.
- **Bank CSV import.** Once transactions exist, import them from bank statements and let a small classifier assign categories.
- **Multi-currency.** The `currency` column is written and stored; the UI is EUR-only. When it stops being EUR-only, add a settings row for
  base currency and a rate table.
