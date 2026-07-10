# Workspace Tax

`/workspace/tax` organises Cem's German tax return end-to-end. A tax year (`AdminTaxYear`) is the container; under it live income sources
(one per Anlage / employer), deductible expenses (with receipt files), and a document checklist. Built for Cem's first return — **employee
(Anlage N) + self-employed (Anlage S / EÜR) + minijob** — it answers "what do I need, what have I got, what can I deduct, and when is it
due?" without being a tax calculator.

**It is an organisation tool, not a tax advisor.** No liability figure is computed, and the AI sub-agent carries an explicit "no binding
Steuerberatung" disclaimer (see [Assistant integration](#assistant-integration)).

Closest siblings: [workspace-finances.md](./workspace-finances.md) (route shell, seed-and-subscribe, batch CQRS),
[workspace-inventory.md](./workspace-inventory.md) (the `FileUploads` receipt-join), [workspace-medical.md](./workspace-medical.md) (the
documentarian sub-agent + disclaimer).

## User behavior

`/workspace/tax` is the surface. Top-down:

- **Header + "New tax year"** — creating a year opens a small dialog (year + filing deadline via shared `DateField` / `DatePicker`). On
  insert the command seeds the default document checklist (see [`taxDefaultChecklist.ts`](../../src/server/commands/taxDefaultChecklist.ts))
  so Cem starts with Anlage N / S-EÜR / minijob / Vorsorge rows to tick off.
- **Year switcher** — pill row of every year; the selected year lives in the URL as `?year=2025` (default = newest, dropped from the URL).
- **Overview strip** — three `GlassCard` tiles: filing deadline (with a live countdown; red **overdue** border when the deadline has passed
  and the year isn't submitted), total income (Σ gross across sources), total deductible (Σ deductible expenses).
- **Tabs** — canonical top-of-page underlined section tabs (see [conventions.md](../conventions.md#top-of-page-sub-view-switcher)) via
  `?tab=overview|income|expenses|documents` (default `overview`, dropped). `?focus=<id>` scrolls the matching card/row into view and flashes
  it — the assistant's deep-links use this (`@keyframes focus-flash` already exists).
  - **Overview** — status chips (open → collecting → filing → submitted → closed, click to set), and the checklist with an X/Y received
    counter.
  - **Income** — sources grouped by `kind`; add/edit dialog + delete alert.
  - **Expenses** — grouped by `categoryKey` with a per-category deductible subtotal; each card shows description, amount, date, and receipt
    chips (links to `/api/file-uploads/:id`). The edit dialog uploads receipts via `uploadFile()` → `adminTaxFilesAttach` (two-step, same
    wire as inventory / medical). On a new expense the upload id is staged and attached after the row is created.
  - **Documents** — the checklist as a flat list; a one-click circle toggles `needed` ↔ `received` (one-element upsert), a paperclip
    attaches a scan, the pencil opens the editor.
- **Empty state** replaces everything when there are zero years, with a "Create a tax year" CTA that names the auto-seeded checklist.

Bilingual copy is inline `{ de, en }[locale]`. Enum labels (`INCOME_KIND_LABELS`, `EXPENSE_CATEGORY_LABELS`, `DOCUMENT_KIND_LABELS`,
`DOCUMENT_STATUS_LABELS`, `YEAR_STATUS_LABELS`) are hoisted per the media / inventory convention.

## Options considered

- **Collect-and-deduct + income vs. a full calculator.** A calculator (liability estimate, ELSTER-shaped output) is a much larger,
  higher-stakes surface and drifts toward giving tax advice. The question actually being asked is organisational — what to gather, what's
  deductible, when it's due. Chosen: **collect + deduct + structured income**, no computed liability. Calculator/ELSTER export is future
  work.
- **One `AdminTaxFile` join with optional `expenseId` + `documentId` vs. per-owner join tables.** A single join into `FileUploads` carrying
  `taxYearId` (always) plus optional `expenseId` / `documentId` covers year-level, receipt, and scan attachments with one table and one
  attach command. On expense/document delete the secondary link nulls (the file stays on the year); on upload delete the join cascades.
  Mirrors `AdminInventoryItemFile`. Chosen: **one join table**.
- **Pre-seeded checklist vs. empty start.** Cem's Anlagen are known; seeding Anlage N / S-EÜR / minijob / Vorsorge on year insert means he
  ticks off instead of typing. Chosen: **seed on insert** (a plain const list, easy to extend).
- **Documentarian sub-agent with disclaimer vs. no advice at all vs. full advice.** Full tax advice is out of scope and risky; a silent
  documentarian reads as unhelpful. Chosen: **documentarian + disclaimer** — records everything, notes the common category, and reminds Cem
  to confirm uncertain deductibility with a Steuerberater. Unlike medical's red-flag block, there is no "refuse to call any tool" case — tax
  isn't safety-critical, so the disclaimer just rides along with the answer.

## Implementation details

### Schema (`src/server/db/schema.ts`, `--- Tax ---` section)

Five tables, admin-only convention (no per-row `userId`; `guardAdminMutation` gates the namespace). Enums are `const` arrays exported
alongside the tables, mirrored as GraphQL enums.

- **`AdminTaxYear`** (`taxYears`) — `taxYearId`, `year` (unique index), `status` (`taxYearStatuses`), `filingDeadline` (date), `submittedAt`
  (stamped server-side when `status` reaches `submitted`), `notes`, timestamps.
- **`AdminTaxIncomeSource`** (`taxIncomeSources`) — `incomeSourceId`, `taxYearId` FK cascade, `kind` (`taxIncomeKinds`), `label`,
  `grossAmountCents` (nullable), `notes`. Indexed on `(taxYearId)`, `(kind)`.
- **`AdminTaxExpense`** (`taxExpenses`) — `expenseId`, `taxYearId` FK cascade, `incomeSourceId` FK **set null**, `categoryKey`
  (`taxExpenseCategories`), `description`, `amountCents`, `incurredOn` (date), `deductible` (default true), `notes`. Indexed on
  `(taxYearId)`, `(categoryKey)`, `(incomeSourceId)`.
- **`AdminTaxDocument`** (`taxDocuments`) — `documentId`, `taxYearId` FK cascade, `kind` (`taxDocumentKinds`), `title`, `status`
  (`taxDocumentStatuses`, default `needed`), `notes`. Indexed on `(taxYearId)`, `(status)`.
- **`AdminTaxFile`** (`taxFiles`) — join into `FileUploads`. `taxFileId`, `taxYearId` FK cascade (always set), `expenseId` FK **set null**,
  `documentId` FK **set null**, `fileUploadId` FK **cascade** (the upload is the anchor), `label`, `kind` (`taxFileKinds`), `pinned`.
  Indexed on `(taxYearId)`, `(expenseId)`, `(documentId)`, `(fileUploadId)`.

Migration: `drizzle/0029_high_prowler.sql`.

### GraphQL (`src/server/graphql/schema.graphqls`, `--- Tax ---` section)

Read namespace `AdminTaxQuery` mounted via `extend type Admin { adminTaxFindOne: AdminTaxQuery! }` (gated once at `Query.admin`). Its one
field `adminTaxYearFindMany` returns fully-hydrated years (children pre-joined + `totalIncomeCents` / `totalDeductibleCents` computed) — the
whole set is small, so the client fetches all years and filters by the URL year. `AdminTaxFile` exposes a nested `fileUpload: FileUpload!`
(with `url`) exactly like the inventory/medical file types.

Write mutations on `AdminMutation`, all batch, all returning `MutationResult { success, referenceId, referenceIds }` — the hydrated entity
is never returned; the `userUpdates` subscription is the source of truth. `referenceIds` echoes the row id per input in input order. Single
edits pass a one-element array. Input types use a nullable id (`taxYearId` / `expenseId` / …) to signal insert-vs-update.

- `adminTaxYearsUpsert` / `adminTaxYearsDelete`
- `adminTaxIncomeSourcesUpsert` / `adminTaxIncomeSourcesDelete`
- `adminTaxExpensesUpsert` / `adminTaxExpensesDelete`
- `adminTaxDocumentsUpsert` / `adminTaxDocumentsDelete`
- `adminTaxFilesAttach` (up-front `fileUploadId` ownership check) / `adminTaxFilesUpsert` (edit-only: label/pin) / `adminTaxFilesDelete`

Run `npm run graphql:generate` after any schema change.

### CQRS wiring

- Commands (`src/server/commands/adminTax*.ts`, one per mutation): two-phase batch template from `adminInventoryItemsUpsert` /
  `adminInventoryItemFilesAttach` — Phase 1 builds payloads (mint UUID → insert; else update), Phase 2 opens one `db.transaction` with a
  bundled `inArray` existence check, then publishes `userUpdates`. `adminTaxYearsUpsert` additionally seeds
  [`TAX_DEFAULT_CHECKLIST`](../../src/server/commands/taxDefaultChecklist.ts) rows for each newly-inserted year in the same transaction, and
  stamps `submittedAt` when `status === 'submitted'`.
- Query (`src/server/queries/adminTaxYearFindMany.ts`): loads years + all children + paired uploads with a per-relation fan-out (the
  `adminMedicalRecordFindMany` pattern), groups files by expense/document, and computes the two totals in memory.
- Mappers (`src/server/mappers/toGqlAdminTax*.ts`): scalar 1:1; the year/expense/document mappers take pre-mapped children.
- Resolver wiring (`src/server/graphql/resolversCreate.ts`): `Admin.adminTaxFindOne` shell, `AdminTaxQuery.adminTaxYearFindMany`, 11
  `AdminMutation` handlers. No nested field resolvers — the query hydrates everything.

### Route (`src/routes/{-$locale}/workspace/tax.tsx` + `tax.graphql`)

Standard workspace shell — `max-w-8xl … py-12`, `noindex: true`, `WorkspaceUnauthorized` when `user.admin` is null. Loader uses
`routeLoaderGraphqlClient(WorkspaceTaxPageDocument)`, `staleTime: 0`. `useWorkspaceTaxLiveUser(seed)` is the seed-and-subscribe hook
(imperative URQL over wonka, mirroring `useWorkspaceFinancesLiveUser`). Mutations never `router.invalidate()` — every command publishes
`userUpdates` and the page swaps its state from the incoming payload.

`tax.graphql` holds one `WorkspaceTaxPageUser` fragment (reused by the loader query and the `WorkspaceTaxPageUpdates` subscription), a
shared `WorkspaceTaxFile` fragment, and the mutation documents.

Search params are strings/enums only (`year` is a string, parsed in the component) — `z.coerce.number()` breaks TanStack's search-reducer
type inference, and numeric params are not used elsewhere in the repo. `Route.useNavigate()` (not the bare `useNavigate()`) scopes the
`focus`-clearing reducers to the tax search type.

The `tax` segment was already registered in the hub grid (`workspace/index.tsx`) and `WorkspaceHeader.tsx` (`WORKSPACE_TITLES` /
`WORKSPACE_ICONS`, icon `ReceiptTextIcon`) before this feature — no nav change was needed. No id-based detail route, so no
`TRAILING_LABEL_SELECTORS` entry. Not in `SITEMAP_PATHS` (excluded by omission + `noindex`).

## Assistant integration

The workspace assistant can record income sources, log deductible expenses, add/tick-off checklist documents, and create tax years from
natural language — so "Hab n Laptop für 899€ gekauft, geschäftlich" lands a `businessExpense` of `amountCents: 89900` on the current year.
Follows the orchestrator + sub-agent recipe in [../architecture/agent-delegation.md](../architecture/agent-delegation.md), mirroring
finances / inventory:

- **Sub-agent** — `src/server/agents/agentPersonalAssistantTax.ts`. `ToolLoopAgent`, `stopWhen: [isStepCount(10)]`, model
  `ADMIN_CHAT_MODEL_FALLBACK_ID`. System prompt carries: the ROLE (documentarian, not advisor), the **"no binding Steuerberatung"
  disclaimer** (record uncertain items anyway + a short reminder to confirm with a Steuerberater / Finanzamt — no tool-refusal, unlike
  medical's red-flag block), the cents/date-conversion rules, the "can't upload files → point Cem at the page" rule, and the `needsMoreInfo`
  / `noOp` JSON sentinel contract.
- **Snapshot** — `src/server/agents/taxSnapshotForAgent.ts`: per-year markdown with deadline + overdue context, income sources, expenses
  (with ids and file counts), and checklist status, so the sub-agent answers straight from its prompt.
- **Tools** — thin wrappers over the same commands: `toolTaxYearsList` (read), `toolTaxYearsUpsert`, `toolTaxIncomeSourcesUpsert`,
  `toolTaxExpensesUpsert`, `toolTaxDocumentsUpsert`. All reuse the generated `GqlSAdminTax*InputSchema()` verbatim — every date field on
  those inputs is a `Date` scalar (`z.string()`), not `DateTime`, so no hand-built duplicate is needed (see
  [agent-delegation.md#tool-input-schemas](../architecture/agent-delegation.md#tool-input-schemas)). Each write pushes a `TaxAgentMutation`
  into the shared log.
- **No file-attach tool** — `adminTaxFilesAttach` needs a browser byte-upload first, which a chat sub-agent can't do; the prompt points Cem
  at the Expenses / Documents section. Same posture as inventory / medical.
- **Delegate** — `src/server/agents/toolDelegateToTax.ts` (orchestrator-side), registered as `delegateToTax` in `agentPersonalAssistant.ts`.
  Pre-writes its `chatMessagesToolCall` row, threads a child `onStepEnd`, parses the sentinels, synthesizes `failed` on a throw. The
  orchestrator's route-map block links mentioned entities as `/workspace/tax?tab=…&focus=<id>` using the ids the delegate returns.

## Future work

- **Receipt thumbnails** — expenses currently show a filename chip; render an inline thumbnail for image receipts (the media/medical grid
  pattern).
- **Liability estimate** — a rough "expected refund / owed" number from income − deductions once the model proves out. Explicitly out of v1
  to avoid drifting into tax advice.
- **ELSTER export** — map the collected data to the ELSTER form fields / a printable summary.
- **Carry-forward** — "copy last year's income sources into the new year" on year create.
- **Deadline reminder job** — a `pg-boss` job that nudges the assistant as the filing deadline approaches (same shape as the deferred
  inventory/medical reminders).
