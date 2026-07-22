# Workspace Finances

Income-stream and recurring-cost tracker for the admin: an admin editor at `/workspace/finances` with a Sankey chart that visualises where
the money goes each period. This is the first iteration — durable lists of _what comes in_ and _what leaves the account on a schedule_
(rent, insurance, subscriptions, transport, …), scaled monthly or yearly on demand. Ledger-shaped concerns (individual transactions,
holdings, trading, bank import) are out of scope until this base surface earns its keep.

## User Behavior

`/workspace/finances` is the surface. Top-down:

- **Period switch** — canonical top-of-page underlined section tabs (see [conventions.md](../conventions.md#top-of-page-sub-view-switcher)):
  **Monthly** (default) vs **Yearly**. Lives in the URL as `?period=yearly`; the default drops the key so the canonical landing URL has no
  query string. The switch scales every number on the page — summary cards, Sankey flows, per-item projections, category subtotals — nothing
  else moves.
- **Period summary** — two glass tiles directly under the period tabs, above the Sankey: **Income** (sum of active streams, period-scaled,
  with leftover / over-income subtitle) and **Payments** (sum of active recurring costs). Only the active period is shown — no parallel
  monthly + yearly pair.
- **Sankey** — aggregated income → categories → items. Wrapped in a `GlassCard`, drawn as inline SVG using `d3-sankey` for the layout math
  (no chart library shell — see below). Categories and items are ordered by volume descending (largest at the top). Each category (and its
  flows / items) gets a distinct `chart-2…5` / `chart-1` slot so adjacent bands read apart; income stays on brand `chart-1`. Hovering a flow
  shows the flow's amount as a native SVG `<title>` tooltip.
- **Income streams list** — every income stream (salary, freelance, …) as flat amount-first rows: name (+ paused badge), optional cadence
  meta (only when the stream's cadence differs from the page period), optional date range / notes, projected amount at the current period,
  edit / delete (always visible on small screens, hover on `sm+`). "Add income" in the section header.
- **Recurring costs list** — section header with "Add cost" (mirrors income), then every recurring cost grouped by category (`housing`,
  `connectivity`, `transport`, `insurance`, `subscriptionsEntertainment`, `subscriptionsWork`, `memberships`, `donations`, `household`,
  `savingsGeneral`, `savingsVacation`, `other`). Flat list rows (no nested glass cards) sorted by projected amount within each group.
  Inactive rows stay at reduced opacity with a "Paused" badge — they don't count toward totals or the Sankey. Cadence meta and the old
  per-row "monthly / yearly" period label under the amount are omitted when they would only repeat the page period tab.
- **Empty state** replaces the expense list body when there are zero cost rows, with a "Add the first cost" call to action (the section
  header button remains available too).
- **Dialogs** for new / edit income and cost. Cost fields: name (required), category, amount in EUR (required, positive), cadence (monthly /
  yearly), starts on / ends on (optional, informational — do not affect totals or the Sankey), notes, active. Income fields are the same
  minus category. Delete uses `AlertDialog` and warns that toggling `active` off is the softer alternative.

Bilingual copy is inline `{ de, en }[locale]` at the call site per [conventions.md](../conventions.md#bilingual-copy). Only `title`,
`description` (seoMeta only — not rendered as a page lead), `CATEGORY_LABELS`, `CADENCE_LABELS`, and `PERIOD_LABELS` are hoisted — reused
across `seoMeta()`, the Select options, and the tab labels.

## Options considered

- **Recurring-only vs. transactions vs. full ledger.** A ledger would answer more questions (categorised spending against real bank data,
  drift from a budget, trend lines) but requires either a bank import or manual entry of every transaction — both are heavier than the
  question actually being asked ("what am I paying every month?"). A recurring-only model with a per-cadence toggle gives a clean answer
  today and leaves room to layer transactions on top later. Chosen: **recurring-only**.
- **Singleton net income vs. income streams.** A single `monthlyNetIncomeCents` settings row was enough for the first Sankey left node, but
  real income is multiple streams (salary, freelance, …). Chosen: **full-CRUD income streams** that replace the settings singleton; the
  Sankey left node stays one aggregated Income sum.
- **Sankey shape.** Two-column (income → category) is simpler; income → category → item is one level deeper and shows _which_ subscription
  is the fat one, not just that subscriptions overall are fat. Cost is one more node column and a heavier layout — trivial with d3-sankey.
  Chosen: **income → category → item**, with volume-desc sort.
- **Period switch semantics.** Considered a month/year date picker; rejected because there is no dated data behind it in v1 — every month
  would look identical. A projection toggle (monthly ↔ yearly) is honest about what the numbers mean and free of ambiguity. Chosen: **toggle
  only**.
- **Chart lib.** Considered Recharts (higher-level, larger dep, less styling control) and hand-rolled flow bars (cheap, worse-looking).
  `d3-sankey` gives us the crossing-minimization layout and lets us stay on inline SVG — the repo's established posture, see the sparkline
  in `inventory_.$itemId.tsx`. Chosen: **d3-sankey + d3-shape**.

## Implementation Details

### Schema (in `src/server/db/schema.ts`)

Two domain tables, admin-only convention — no `*De`/`*En` pairs, no per-row `userId` (the `User.admin` / `Mutation.admin` gate authorizes):

- **`AdminFinancesRecurringCost`** — `costId`, `name`, `categoryKey` (enum: `housing` | `connectivity` | `transport` | `insurance` |
  `subscriptionsEntertainment` | `subscriptionsWork` | `memberships` | `donations` | `household` | `savingsGeneral` | `savingsVacation` |
  `other`, default `other`), `amountCents` (per-`cadence` amount), `cadence` (`monthly` | `yearly`, default `monthly`), `currency`
  (`char(3)`, default `EUR`), `notes`, `active` (default `true`), `startsOn` / `endsOn` (informational for v1), timestamps. Indexed on
  `categoryKey` (list groups by it) and `active` (the SQL totals filter by it).
- **`AdminFinancesIncomeStream`** — `incomeStreamId`, `name`, `amountCents`, `cadence`, `currency`, `notes`, `active`, `startsOn` /
  `endsOn`, timestamps. No category enum — the name is the stream identity. Indexed on `active`. Migration `0033` seeds one "Net income"
  stream from any prior `AdminFinancesSettings.monthlyNetIncomeCents`, then drops `AdminFinancesSettings`.

Enum tuples exported as `financeRecurringCostCategories` and `financeCadences`, mirrored in `schema.graphqls` as
`AdminFinancesRecurringCostCategory` / `AdminFinancesCadence`.

### GraphQL

`AdminFinancesQuery` mounted at `Admin.adminFinancesFindOne`:

- `adminFinancesRecurringCostFindMany: [AdminFinancesRecurringCost!]!` — every row, ordered by category then name.
- `adminFinancesIncomeStreamFindMany: [AdminFinancesIncomeStream!]!` — every row, ordered by name.
- `adminFinancesMonthlyIncomeCentsFindOne: Int!` / `adminFinancesYearlyIncomeCentsFindOne: Int!` — projected totals over active streams (`0`
  when none).
- `adminFinancesMonthlyExpensesCentsFindOne: Int!` / `adminFinancesYearlyExpensesCentsFindOne: Int!` — projected totals over active costs,
  computed in one SQL pass (see `adminFinancesExpensesCentsFindOne`). Yearly rows contribute `amount / 12` to the monthly total and `amount`
  to the yearly total; monthly rows do the mirror.

`AdminMutation` extensions follow the repo-wide batch + `MutationResult` conventions: `adminFinancesRecurringCostsUpsert` /
`adminFinancesRecurringCostsDelete`, `adminFinancesIncomeStreamsUpsert` / `adminFinancesIncomeStreamsDelete` — all return `MutationResult!`
(`referenceIds` echoes the row id per input in input order). Single-item edits pass a one-element array; pausing rides the same upsert with
`active` flipped. The `userUpdates` subscription re-renders the totals in all cases.

### CQRS wiring

- Commands: `adminFinancesRecurringCostsUpsert` / `Delete`, `adminFinancesIncomeStreamsUpsert` / `Delete` (two-phase batch — single
  pre-flight `inArray` existence check for update ids, per-row insert/update in the loop, one transaction). Each publishes `userUpdates` on
  success.
- Queries: `adminFinancesRecurringCostFindMany`, `adminFinancesIncomeStreamFindMany`, `adminFinancesExpensesCentsFindOne`,
  `adminFinancesIncomeCentsFindOne` (each returns `{ monthlyCents, yearlyCents }` — the period total resolvers both call them).
- Mappers: `toGqlAdminFinancesRecurringCost`, `toGqlAdminFinancesIncomeStream` — scalar 1:1.
- Resolver wiring: `Admin.adminFinancesFindOne` shell, six `AdminFinancesQuery` field resolvers, four `AdminMutation` handlers — all in
  `src/server/graphql/resolversCreate.ts`.

### Client GraphQL

`src/routes/{-$locale}/workspace/finances.graphql` follows the seed-and-subscribe posture: one `WorkspaceFinancesPageUser` fragment reused
by the loader query and the `userUpdates` subscription, plus the four mutation documents. Mutations do not `router.invalidate()` — the
subscription delivers the new state.

### Sankey chart

`src/web/components/FinancesSankey.tsx` — inline SVG at `viewBox="0 0 960 {height}"`, `preserveAspectRatio="xMidYMid meet"`, sized
responsively via `className="w-full h-auto"`. Height grows with the densest column (`max(itemCount, categoryCount) * 36px`, floor 480) so
label + amount pairs stay readable when many thin nodes pack the right column. `d3-sankey` does the layout with `nodePadding: 30` and
`nodeSort` by value descending so largest flows stay at the top; `d3-shape`'s `sankeyLinkHorizontal` draws the flow paths. The layout extent
leaves a ~180px right gutter so item labels sit outside the rightmost bars instead of sharing the middle gap with category labels (which was
the main overlap failure mode).

- Colours resolve via Tailwind chart tokens (`fill-chart-1`…`fill-chart-5`, `stroke-chart-N/35`). Income stays on brand `chart-1`;
  categories walk `chart-2…5` then `chart-1` in volume order so the largest band doesn't collide with income; items inherit their category's
  slot at slightly lower opacity. Light / dark themes both work without a per-mode branch and no hard-coded `oklch(...)` values reach the
  component.
- `role="img"` + `aria-label` on the root SVG carry a one-line summary of the period and total for screen readers. Every rectangle and path
  also carries a native SVG `<title>` for hover tooltips.
- No animation. The motion doc's guardrails call for animations that answer a question the user is already asking; a Sankey settling into
  place at page load doesn't. If the shape earns a fade-in later, wrap in `Reveal`.

Data building lives in `buildSankey()` in the route file, not the component — the route knows the period toggle and the income total. It
filters active cost rows, groups by `categoryKey`, sorts categories and items by projected amount descending, assigns a chart color per
category, and emits nodes / links in three tiers: one `income` node (labelled with the income total when > 0, or "Expenses" with the cost
total when not), one `category` node per non-empty category, one `item` node per active cost.

### Period math

`projectedCents(row, period)` is the single source of truth for scaling (shared by costs and income streams):

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
- The workspace assistant sub-agent factory (`src/server/agents/agentPersonalAssistantFinances.ts`) gains income streams and recurring costs
  from natural language via `delegateToFinances`, mirroring `agentPersonalAssistantTravel.ts`. See _Assistant integration_ below.

## Assistant integration

The workspace assistant can create, edit, pause, and delete income streams and recurring costs from natural language, so "Ich zahle für
Apple One 25,95 im Monat, bitte füge das meinen Ausgaben hinzu" lands a `subscriptionsEntertainment` / `monthly` / `amountCents: 2595` row
without opening the page. This follows the orchestrator + sub-agent recipe in
[../architecture/agent-delegation.md](../architecture/agent-delegation.md), mirroring the travel domain 1:1:

- **Sub-agent** — `src/server/agents/agentPersonalAssistantFinances.ts`. System prompt carries the persona, the cents-conversion rule
  ("25,95 im Monat" → `amountCents: 2595, cadence: "monthly"`), the "add to my expenses = recurring cost / add to my income = income stream,
  there is no dated-transaction model" rule, and the `needsMoreInfo` / `noOp` sentinel contract (asks for the amount when a new row has only
  a name).
- **Snapshot** — `src/server/agents/financesSnapshotForAgent.ts` inlines every income stream and every cost grouped by category (with ids),
  plus the current monthly/yearly income and expense totals, so the sub-agent answers "how much do I spend?" straight from its prompt.
- **Tools** — thin wrappers over the same commands/queries the resolvers use: `toolFinanceRecurringCostsUpsert` (reuses the generated,
  Gemini-safe `GqlSAdminFinancesRecurringCostInputSchema()`), `toolFinanceRecurringCostsDelete`, `toolFinanceRecurringCostsList`,
  `toolFinanceIncomeStreamsUpsert`, `toolFinanceIncomeStreamsDelete`, `toolFinanceIncomeStreamsList`. Pausing rides the upsert with
  `active: false` — the softer alternative to a hard delete.
- **Delegate** — `toolDelegateToFinances` (orchestrator-side), registered in `agentPersonalAssistant.ts`. Writes fan out `userUpdates`, so
  the open finances page re-renders the new totals + Sankey without a manual refresh.

No deep-link template exists for finances yet: `/workspace/finances` has no `focus` search param (unlike projects / media / medical), so the
assistant names costs in plain text rather than linking to them. Adding `focus` scroll/flash handling to the route would let a template land
later.

## Future work

- **Leftover / savings node.** Add a fourth-tier `leftover` node so `income → categories … + income → leftover` balances when income >
  expenses. Straightforward once income is a first-class node in the graph.
- **Multi-source Sankey left column.** Today streams collapse to one Income node; showing each stream as its own left node is a natural
  follow-up once the list earns its keep.
- **Material net worth tile.** Pull `AdminInventoryQuery.adminInventoryMaterialNetWorthCentsFindOne` into the overview strip so the finances
  page shows both the flow (recurring costs) and the stock (net worth) picture.
- **One-off transactions.** Add `FinanceTransactions` with a `date` and `amountCents`; extend the Sankey with a "This month" mode that reads
  transactions instead of projections. Preserves the current model — recurring costs stay authoritative for the "typical month" question.
- **Bank CSV import.** Once transactions exist, import them from bank statements and let a small classifier assign categories.
- **Multi-currency.** The `currency` column is written and stored; the UI is EUR-only. When it stops being EUR-only, add a settings row for
  base currency and a rate table.
