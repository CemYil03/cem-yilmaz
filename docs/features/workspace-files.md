# Workspace Files

Assistant-authored markdown documents that the admin opens, previews, and edits inside the workspace assistant sidebar. The assistant drafts
a document from chat; the `workspaceFileCreate` tool row shows its usual pill **plus** a clickable document attachment card; clicking the
card switches the sidebar into a **file-display state** with a preview/edit/save editor. The admin's edits save back to the DB, and the
assistant can re-fetch the latest version and overwrite it on request.

## Context

The workspace assistant could already write durable domain rows (projects, trips, …) and produce inline chat markdown, but there was no
first-class "here's a document I drafted — open it and edit it" surface. Long drafts (notes, plans, letters, specs) either bloated the
transcript or lived nowhere durable. This feature adds a standalone document that is editable both by the assistant (from chat) and by the
admin (in the sidebar), with a single stable identity.

## User Behavior

- The admin asks the assistant to draft something ("write up a plan for X", "draft a letter to the landlord"). The assistant calls
  `workspaceFileCreate` and replies normally in chat (a short "drafted X — open it to review" sentence, like any other tool call). The
  tool-call row keeps its normal pill **and** grows a **document attachment card** beneath it (filename + title, file icon).
- Clicking the card switches the assistant **sidebar** into its **file-display state**: the same shadcn `<Sidebar>` that hosts the chat
  browser and the transcript now shows the document editor instead (it takes precedence over the transcript; the composer footer is hidden
  because a file view isn't a chat turn). The editor has a **Preview** (rendered markdown) / **Edit** (raw textarea) toggle, a **Save**
  button (enabled only when dirty), and a close button that returns the sidebar to the transcript.
- The card works from any assistant surface — the docked sidebar transcript **and** the full-page `/workspace/assistant/<chatId>` route.
  Because the sidebar is mounted once at the workspace layout and present on every workspace route, opening a file just flips the shared
  provider state (`openFileId`) and expands the sidebar if it was collapsed — no navigation, no separate panel.
- **Save** rewrites the document. The assistant can `workspaceFileGet` to read the admin's latest edits and `workspaceFileUpdate` to
  overwrite the body on request.
- **Download PDF** renders the document to a clean, A4 print layout (like [markdowntopdf.com](https://www.markdowntopdf.com/)) and downloads
  it. The button sits next to **Save** and is **disabled while there are unsaved edits** — the PDF is generated server-side from the
  persisted document, so the admin saves first, then downloads (the disabled state mirrors the Save-when-dirty gate; no confirm dialog).
- Asking the assistant a **question** about a document ("what did you write in X?", "summarize the plan") makes it `workspaceFileGet` the
  latest body and answer in the **same turn**. The tool description and the orchestrator system prompt both spell out that reading a file is
  a step toward a written reply, not the end of the turn. `workspaceFileUpdate` is only chained when the admin actually asked to change the
  document. (The tool result must be JSON-safe for the same-turn answer to happen at all — see the `toolWorkspaceFileGet` trimming note
  under **Server**.)

## Options Considered

**How the attachment reaches the client.**

- _Add an `attachments` field to `ChatMessageAssistantText`_ (mirroring the user-side attachments) + a message↔file link table. Rejected —
  more schema, a new join table, and a second delivery path.
- **Render off the existing `workspaceFileCreate` tool-call row (chosen).** The tool result carries `{ workspaceFileId, filename, label }`
  and already streams to the client as `ChatMessageToolCall.toolResult`. The UI renders the card beneath that tool's normal pill. No schema
  change, no linking table. (The result is deliberately trimmed to those three fields — the full `content` is not echoed back, so it doesn't
  bloat the turn or replay into the model's context next turn.)

**Where the editor lives.**

- _A custom resizable side panel + a full-page split view addressed by a `?doc` search param._ Built first, then rejected — it hand-rolled a
  second resizable surface and a navigation/confirm hand-off from the sidebar, duplicating what the existing shadcn `<Sidebar>` already
  does.
- **A third content state of the existing assistant sidebar (chosen).** The sidebar already switches between chat-browser and transcript on
  provider state; file-display is a third state on the same primitive. One surface, one width control, no `?doc`, no navigation, no confirm
  dialog. Clicking a card anywhere (sidebar or full-page transcript) opens the file in the sidebar.

**How edits persist.**

- _Create a new `fileUploads` row per save._ Rejected — the download URL (`/api/file-uploads/:id`) would change every edit, breaking any
  held reference.
- **Rewrite the existing upload's bytes in place (chosen).** `adminWorkspaceFileUpdate` updates `fileUploads.bytes`/`size` on the same row
  inside a transaction, so `fileUploadId` and the URL stay stable.

**Where the tool lives.**

- _A dedicated `documents` delegate sub-agent._ Rejected for v1 — creating a doc is a single write; a delegation hop adds latency and
  scaffolding for no isolation benefit.
- **Directly on the orchestrator `agentPersonalAssistant` (chosen).**

**Scope.** Chat-only for v1 — no dedicated `/workspace/files` browser page, and markdown only (docx deferred — see the closing note). Files
are reachable via the chat attachment cards. A browser can be added later without reworking the model.

## Implementation

### Data model

- `WorkspaceFile` table (`src/server/db/schema.ts`): `workspaceFileId` PK, `userId` FK → `Users` (cascade), `fileUploadId` FK →
  `FileUploads` (cascade), `filename`, nullable `label`, `createdAt`/`updatedAt`. Standalone (not tied to a project) with direct ownership.
  Markdown bytes live on the shared `FileUploads` table with `mediaType: 'text/markdown'` — no `kind` column (markdown only). Migration
  `drizzle/0030_*.sql`.

### GraphQL

- `type WorkspaceFile` exposes scalar fields, a decoded `content: String!` (UTF-8 of the upload bytes), and `fileUpload: FileUpload!`.
- Read: `Admin.adminWorkspaceFileFindOne(workspaceFileId)`. Write:
  `AdminMutation.adminWorkspaceFileUpdate(workspaceFileId, content, label)`. Both auto-gated by `guardAdminMutation` / the `User.admin`
  chain — no per-resolver re-guard. Wired in `resolversCreate.ts`.

### Server

- `src/server/commands/workspaceFileCreateFromMarkdown.ts` — create-from-markdown command **and** the three co-located agent tools
  (`toolWorkspaceFileCreate` / `toolWorkspaceFileGet` / `toolWorkspaceFileUpdate`). Modeled on `projectFileCreateFromMarkdown.ts`. The
  create tool trims its result to `{ workspaceFileId, filename, label }`. **`toolWorkspaceFileGet` must trim too**: it wraps
  `adminWorkspaceFileFindOne`, which returns the full `GqlSWorkspaceFile` whose `createdAt` / `updatedAt` are JS `Date` objects. A `Date` is
  not a valid `JSONValue`, and the AI SDK validates each tool result against `jsonValueSchema` before feeding it into the next model step —
  so returning the raw shape throws _after_ the tool-call row is persisted but _before_ any assistant text, and the user sees the read
  happen with no answer (asking a second time "worked" only because the replayed result comes back through JSONB with the dates already
  stringified). The tool therefore returns `{ workspaceFileId, filename, label, content }` — JSON-safe and all the agent needs to answer or
  revise.
- `src/server/commands/adminWorkspaceFileUpdate.ts` — in-place byte rewrite in a transaction, ownership-checked; used by both the editor
  Save mutation and the agent's update tool.
- `src/server/queries/adminWorkspaceFileFindOne.ts` — joins the row + its upload, decodes bytes to `content`, ownership-scoped.
- `src/server/mappers/toGqlWorkspaceFile.ts` — `(row, fileUpload, content) → GqlSWorkspaceFile`.
- Tools registered on `agentPersonalAssistant.ts` (`{ serverRuntime, session }`); a system-prompt paragraph tells the agent to draft a
  document (vs. reply inline) and to still write a normal short reply after creating it. Tool-call persistence is automatic via
  `chatPersistStep`.

### Client

- `src/web/chat/WorkspaceFile.graphql` — `WorkspaceFile` query + `WorkspaceFileUpdate` mutation.
- `src/web/chat/WorkspaceAssistantChatProvider.tsx` — owns `openFileId` + `openFile(id)` / `closeFile()`. Single source of truth for the
  sidebar's file-display state; the sidebar frame reads it.
- `src/web/chat/DocumentPanelProvider.tsx` — a React context (mirroring `ExternalLinkConfirmationProvider`) exposing `openDocument(id)` +
  `canOpen`. Both the sidebar transcript and the full-page transcript mount it wired to the provider's `openFile`; where no provider is
  mounted (visitor sheet) the card renders inert.
- `src/web/components/chat-message/ChatMessageToolCall.tsx` — renders the `Attachment` card (`WorkspaceFileAttachment`) beneath the normal
  pill for `workspaceFileCreate`, wired to `openDocument`.
- `src/web/chat/WorkspaceFileEditor.tsx` — the editor body (fetch, preview/edit toggle, dirty-guarded save, close, **Download PDF**).
- `src/web/chat/WorkspaceAssistantChatSidebar.tsx` — the file-display content state: renders `WorkspaceFileEditor` in place of the
  transcript when `openFileId` is set (and self-expands the sidebar so a card clicked from the full-page route is visible).
- `src/web/chat/toolDisplay.ts` — labels + `FileTextIcon` for the three tools.

### PDF export

The **Download PDF** button renders the document to a clean A4 PDF using the template's server-side rendering pipeline (see
`docs/architecture/server-side-rendering.md`) — this is that pipeline's **first consumer** (`/server/*` had no route until now).

- `src/server/utils/browserCapture.ts` — `browserCapturePdf()` sits beside `browserCapture()`, reusing the same singleton headless Chromium
  but calling `page.pdf()` (`format: 'A4'`, `printBackground: true`, 15 mm margins, `print` media emulation) instead of `page.screenshot()`.
  Exposed as `serverRuntime.browser.capturePdf`.
- `src/routes/server.workspace-file-pdf.$workspaceFileId.tsx` — the `/server/*` print surface Chromium navigates to. Authenticates by the
  short-lived HMAC `token` search param (bound to the file id, minted by the download route), **not** a session cookie. Renders the same
  `AssistantMarkdown` component as the on-screen preview inside a forced-light, A4-oriented sheet with no app chrome; a `[data-pdf-ready]`
  hook is what the capture waits for. Invalid/expired token → 404.
- `src/server/queries/workspaceFilePdfContentLoad.ts` — server-only loader for that route: verifies the token, loads the row + upload bytes.
  Not `userId`-scoped (there's no session on the headless request) — the token is proof the owner-checked download route minted it.
- `src/routes/api/workspace-files_.$workspaceFileId.pdf.ts` — `GET /api/workspace-files/:id/pdf`. Session-cookie auth + ownership-scoped
  lookup (guessed/foreign id → 404, mirroring the file-uploads route), mints `createServerToken(id)`, calls `browser.capturePdf` against the
  `/server/*` route, and streams the bytes back as `application/pdf` with a `.pdf`-suffixed `attachment` filename.
- Client: the editor's **Download PDF** button is disabled while `isDirty || saving || !file` (the PDF comes from the persisted document),
  and triggers the browser download via a hidden `<a download>` at `/api/workspace-files/:id/pdf` — same-origin, cookie rides automatically,
  no GraphQL.

## Deferred: docx

Claude also supports `.docx`. It's out of scope for v1 because it needs more than markdown does: `.docx` is zipped XML, so previewing needs
a converter (e.g. `mammoth` docx→HTML), and **editing** faithfully needs a rich-text editor plus a lossy-conversion policy (a
docx→markdown→docx round-trip drops tables/styles/images). A sensible future split: (A) read-only docx preview + download (moderate), then
(B) full editable docx with a rich-text editor (large, its own project). The `WorkspaceFile` model already stores arbitrary uploads via
`fileUploads.mediaType`, so adding docx is additive — a new `mediaType` branch in the editor, not a schema change.
