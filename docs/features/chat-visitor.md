# Visitor chat

## User behavior

The visitor chat is the "Ask me anything" surface mounted on the public site. The assistant persona is named **Eida** (see `agentVisitor`).
It answers questions about Cem from a live CV summary **and** runs the contact / project-request tools (OTP-gated briefs land in
`AdminProjectRequest`). It's a right-side **Sheet** hosted at the root layout so any public page can open it — the landing-page hero
composer, suggestion chips, and the chat icon in the site header all funnel into the same component.

See also:

- [styles/chat.md](../styles/chat.md) — desired chat experience (scroll, composer, transcript composition, link behaviour).
- [architecture/chat.md](../architecture/chat.md) — shared message model; how this feature plugs in via `scope: 'public'`.
- [architecture/chat-persistence.md](../architecture/chat-persistence.md) — storage, replay, attachments.
- [architecture/file-storage.md#read-aloud-tts-cache](../architecture/file-storage.md#read-aloud-tts-cache) — read-aloud / TTS cache.
- [features/chat-workspace.md](./chat-workspace.md) — the parallel personal-assistant chat for the workspace.
- [features/chat-web-search.md](./chat-web-search.md) — Google Search grounding, intentionally only on the admin assistant (not on this
  visitor agent).
- [features/chat-email-tools.md](./chat-email-tools.md) — the visitor agent's three email-shaped tools (contact, project request, OTP
  verify).
- [features/project-requests.md](./project-requests.md) — the OTP-gated project-request flow.
- [features/chat.md](./chat.md) — thin index of chat docs (not a third product).

## Options considered

| Option                    | Notes                                                                       |
| ------------------------- | --------------------------------------------------------------------------- |
| Modal dialog              | Forces dismiss to keep browsing — rejected for "ask while reading the page" |
| Dedicated `/chat` route   | Breaks the landing-page hero flow and loses ambient context                 |
| Right-side Sheet (chosen) | Stays open while scrolling; same entry from hero, chips, and header         |

## Option chosen

Right-side Sheet at the root layout — see [Why a sheet, not a dialog](#why-a-sheet-not-a-dialog) below.

## Implementation

### Agent and GraphQL access

Visitor sends go through the **top-level** `Mutation` namespace (cookie session, no registered user required):

- `chatMessageCreate` / `chatInputCollectionRespond` / `chatToolApprovalRespond`
- Resolver stamps `scope: 'public'` and dispatches to `agentVisitor` — the agent is chosen by the access path, not a client enum.
- Resolved chats must have `scope = 'public'`; mismatches return null (logged).
- Reads: `Session.visitorChatFindMany` / `Session.visitorChatFindOne(chatId)` — the latter also requires
  `chats.sessionId = sessionFindOne.sessionId` so a stolen chatId cannot cross visitor sessions.

`agentVisitor` (`src/server/agents/agentVisitor.ts`) carries the visitor system prompt, three transactional email-shaped tools
(`sendEmailToCem`, `submitProjectRequest`, `verifyProjectRequestOtp`) plus `promptUserForInput`. No approval gating — side effects are
bounded by the visitor rate-limit + OTP firewall. Shared scaffolding (provider bindings, `currentDateForAgent()`, `stopWhen`, `onStepEnd`)
lives in `agentScaffolding.ts` — a tiny helper, not a base class.

Optional `currentPagePath` on `chatMessageCreate` is forwarded into the factory for that turn only (not persisted) — see
[Page context](#page-context).

## Why a sheet, not a dialog

A chat is an ongoing side conversation, not a modal decision the user has to resolve. Sheets read as "a panel that slides in alongside what
I was doing"; dialogs read as "stop and answer this." The sheet also makes mobile correct by default — full-bleed with no card padding —
where the previous `Dialog` rendered an 85vh card that still had visible page chrome around it on phones. The component file is
`src/web/chat/WebsiteVisitorAssistantChatSheet.tsx`.

Three concrete deviations the sheet adds on top of the old dialog:

- **Mobile is full-bleed.** No `sm:max-w-2xl` cap on phones; the sheet takes the whole viewport.
- **Desktop has an expand toggle.** A `Maximize2 ↔ Minimize2` glyph in the top-right corner widens the sheet from `sm:max-w-2xl` to the full
  viewport. The inner column is capped to `max-w-3xl` so prose stays at a comfortable reading width while the sheet chrome (header border,
  background) still spans the viewport.
- **iOS keyboard fit.** The sheet drives its `height` and `top` off `window.visualViewport` (via `useVisualViewport`) while open on mobile,
  so the header stays pinned at the top of the visible area and the composer parks just above the soft keyboard instead of being pushed out
  of view by iOS Safari's auto-scroll-into-view behaviour.

## Surfaces

| Entry point                        | How it opens the sheet                                          | Initial state                                                                                                                                                                                                                                                                  |
| ---------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Landing-page hero composer         | Hero fires `chatMessageCreate`, then `setChatIdFromHero + open` | The same `<VisitorChatComposer />` the sheet uses is mounted in the hero. It fires the mutation from the landing page so the visitor sees the busy / sent micro-states on the input they typed in, then hands the freshly-allocated chatId to the provider and pops the sheet. |
| Landing-page chips / `?ask=…` link | `useVisitorChat().openWithMessage(text)`                        | Provider fires `chatMessageCreate` itself with the chip / search-param text, captures the chatId, opens the sheet.                                                                                                                                                             |
| Site header `MessageCircle` button | `useVisitorChat().openEmpty()`                                  | Empty — shows previous chats list + composer; no seeded send                                                                                                                                                                                                                   |
| Empty state "Previous chats" entry | `useVisitorChat().loadChat(chatId)`                             | Loaded — opens directly at a specific chat without re-sending                                                                                                                                                                                                                  |

The provider (`src/web/chat/VisitorChatProvider.tsx`) owns the chatId, the live-updates handle, and the open/close state — same shape as
`WorkspaceAssistantChatProvider`. The sheet itself is mounted once in `src/routes/__root.tsx`, so every public route inherits it without
duplicating the tree.

## Composer

The visitor side uses `<VisitorChatComposer />` (`src/web/chat/VisitorChatComposer.tsx`), a thin wrapper around the shared
`<ChatComposer />` base. It is used on **two surfaces** — the landing-page hero (so the visitor's first input directly fires the mutation
and they see the busy / sent micro-states on the input they actually typed in) and inside the sheet (empty + loaded views). The wrapper:

- Pre-wires the visitor `ChatMessageCreate` mutation and its result extractor (`data.chatMessageCreate`), so the server dispatches to
  `agentVisitor`.
- **Renders the rate-limit quota chip in the bottom-left addon slot, always visible.** The composer runs its own `VisitorChatQuota` query
  (`cache-and-network`) so every visitor surface that mounts it sees the current allowance — even on the first send of the day. The visible
  chip is the bare ratio (`5 / 10`); hovering on desktop or tapping on mobile pops a `HoverCard` with the full sentence ("5 of 10 messages
  used today. Resets in 18 hours."). The chip flips to a destructive style at the limit so the visitor sees the composer is locked without
  opening the card. The long sentence used to live as a wrapping `<p>` under the textarea, but on narrow viewports it pushed past the Send
  button — the HoverCard keeps the addon row short while still surfacing the detail on demand.
- Carries **none** of the admin-only chrome — no model dropdown, no approval-mode selector, no file attachments. Those live in the parallel
  `<WorkspaceChatComposer />` wrapper. The shared `<ChatComposer />` base is audience-agnostic; admin-only controls are added by the
  workspace wrapper, never by the visitor wrapper.

Surface-specific extras still plug into the wrapper's `addonStart` slot — the loaded view of the sheet uses it for the "Neuer Chat" / "New
chat" button (plus icon) that calls `resetChat()` on the provider and drops the sheet back into its empty state. The button is disabled
while a turn is generating; the empty state's own composer creates a fresh chat on first send, just like opening the sheet from the header.

## Site map

The agent's system prompt carries a **site map** — the list of public pages it can point visitors to — built in `agentVisitor.ts`
(`siteMapBlock`). The paths are iterated from `SITEMAP_PATHS` (`src/web/seo/sitemapRoutes.ts`), the same source of truth `/sitemap.xml`
uses, so the two can't drift: add an indexable route there and the agent learns about it automatically. A per-path description lives in a
small `PAGE_DESCRIPTIONS` record beside the builder; a path with no description still gets listed by its bare path.

The block also tells the agent, once, that its replies render as full Markdown — clickable links (relative, e.g. `[Lebenslauf](/cv)`),
tables, lists — and to only link to the listed paths. It is deliberately informational, not a script of "when asked X, answer Y".

This fixes the failure where the agent, never having been told the routes exist, insisted it "cannot provide links or has no access to URLs"
when a visitor asked where the CV was. Internal links the agent emits (`/cv`, `/projects`, …) navigate in-app — same tab, no interstitial,
and locale-prefixed to the route the visitor is on (`/cv` becomes `/en/cv` on an English page). That behaviour lives in the shared markdown
anchor; see [styles/chat.md — Internal vs external links](../styles/chat.md#internal-vs-external-links).

## Page context

Every `chatMessageCreate` carries a `currentPagePath` argument — the route the visitor was on when they hit Send (`/`, `/projects`,
`/en/cv`, `/about`, …). The sheet reads it once with `useLocation().pathname` and threads it down through `<VisitorChatComposer />` →
`<ChatComposer />`, where it rides the mutation alongside the message body. Server-side, `chatMessageCreate` forwards the value into
`chatAssistantTurnRunDetached({ …, currentPagePath })` and the agent factory inlines it into `agentVisitor`'s system prompt for that turn
only. Nothing is persisted — the path is a per-turn signal.

The motivating behaviour is "the visitor just scrolled through my projects page and asks 'tell me more'." Without the path, the agent has to
guess; with it, the agent can anchor the answer to the route the visitor was probably reading on. The prompt explicitly tells the agent that
the path itself is the only signal — it has no rendered DOM, no list of what's on the page — so it must not invent contents it hasn't been
given elsewhere in the prompt.

Cadence notes:

- The pathname is captured at submit time, not at sheet open. A visitor who opens the chat on the landing page, navigates to `/projects`,
  and asks a follow-up sees the agent pick up the new path. The sheet stays mounted across SPA navigation, so the same component reads the
  fresh `useLocation()` on each render.
- The locale prefix is forwarded verbatim (`/en/projects`, not stripped). The agent still answers in the visitor's chosen language; the
  prefix is informative ("English projects page").
- `chatInputCollectionRespond` and `chatToolApprovalRespond` pass `currentPagePath: null` — those mutations resume an existing turn from a
  form submit or approval card already inside the chat surface; there's no fresh user prose to anchor.

## Anonymous authoring

Visitors are not logged in. The server identifies a visitor by the session cookie alone — there is no `User` row and `sessions.userId` stays
null. That has two consequences in the chat data path:

- `ChatMessageUser.author` and `ChatMessageUserInput.author` are nullable in the GraphQL schema. Visitor messages always come back with
  `author: null`; admin messages always have one populated. The sheet renders "Du" / "You" when `author` is null.
- `chatMessages.authorUserId` is nullable in the DB. The mapper (`src/server/mappers/toGqlChatMessage.ts`) skips the `need(row.author, …)`
  check for the two user-authored variants and returns `null` when no user row is attached.

Visitor chats are linked to their owning session via the new `chats.sessionId` column. This is what powers the "Previous chats" list in the
sheet's empty state — `Session.visitorChatFindMany` selects from this column. Admin chats leave `sessionId` null; they're owned by the
logged-in user (read via `scope = 'admin'`).

## Rate limiting

| Constant                   | Value               | Where it's defined                     |
| -------------------------- | ------------------- | -------------------------------------- |
| `VISITOR_CHAT_DAILY_LIMIT` | 10                  | `src/server/chat/visitorChatLimits.ts` |
| `VISITOR_CHAT_WINDOW_MS`   | 24 × 60 × 60 × 1000 | `src/server/chat/visitorChatLimits.ts` |

Enforcement is in `chatMessageCreate` (visitor branch only — admin chats skip the gate because the workspace is already login-gated and is
not a public abuse surface). The check fires before any DB write:

```ts
if (dispatch.scope === 'public') {
  const quota = await visitorChatQuotaFindOne(requestingSession, serverRuntime);
  if (quota.used >= quota.limit) return null;
}
```

The mutation returns `null` to the client when the cap is exceeded — the composer's always-visible quota line already shows the "Daily limit
reached" message, so the mutation failure becomes a silent no-op rather than a transport error.

### Bucket key

The quota query (`src/server/queries/visitorChatQuotaFindOne.ts`) counts user messages on `scope = 'public'` chats whose owning session
matches **either** the requester's `sessionId` **or** another session that shares the same `ipHash`. The OR'd predicate means clearing the
session cookie does not reset the daily count — a visitor's bucket follows their IP across cookie clears. Local development / unproxied
requests have no resolvable IP, so `ipHash` is `null` and the bucket collapses to the session arm; the limiter still works, just without the
IP carry-over.

### IP hashing

`Sessions.ipHash` stores `SHA256(VISITOR_IP_HASH_SALT + ":" + clientIp)`. Computed in `sessionUpsert` on every GraphQL POST (the four API
routes that upsert the session — `/api/graphql`, `/api/stream`, `/api/file-uploads`, `/api/file-uploads/:id` — all pass
`clientIpFromRequest(request)` through).

The salt is a required env var (`VISITOR_IP_HASH_SALT`) — fails at boot if missing. Two properties this gives us:

- **DB leak resistance.** Without the salt, an IP hash is just a SHA-256; with a per-deploy 256-bit salt, brute-forcing the IP space is
  infeasible.
- **No cross-deploy correlation.** Two deploys can't link visitors by comparing hashes because their salts differ.

`clientIpFromRequest` (`src/server/utils/clientIpFromRequest.ts`) reads `x-forwarded-for` first-hop, falls back to `x-real-ip`, else returns
null. Coolify sets both in production.

### Quota query shape

```
SELECT chatMessages.createdAt
FROM chatMessages
JOIN chats ON chats.chatId = chatMessages.chatId
JOIN sessions ON sessions.sessionId = chats.sessionId
WHERE chats.scope = 'public'
  AND chatMessages.kind = 'user'
  AND chatMessages.createdAt >= NOW() - INTERVAL '24 hours'
  AND (
      sessions.sessionId = :requesterSessionId
      OR (sessions.ipHash IS NOT NULL AND sessions.ipHash = :requesterIpHash)
  )
ORDER BY chatMessages.createdAt ASC
LIMIT 11
```

The query probes `limit + 1` so the caller can distinguish "exactly at the limit" from "over". `toGqlVisitorChatQuota` clamps `used` at the
limit so the sheet reads `10 / 10` even if more rows existed pre-clamp.

### `Session.visitorChatQuotaFindOne` GraphQL field

```graphql
type VisitorChatQuota {
  used: Int!
  limit: Int!
  resetsAt: DateTime
}
```

`resetsAt` is the moment the oldest in-window message ages out — null when `used = 0`. `<VisitorChatComposer />` formats it with
`formatDistanceToNow` so it reads "resets in 18 hours" / "Tageslimit erreicht — neue Nachricht in 18 Std. möglich".

## Previous chats list

`Session.visitorChatFindMany` returns up to 50 chats owned by the requester's session (newest first), via `visitorChatFindMany`. Empty
`messages` — fetch a single transcript through `Session.visitorChatFindOne(chatId)` when the visitor actually picks one. The single-chat
resolver rejects any read whose `chats.sessionId` doesn't match the requester's session, so a stolen chatId can't cross into another
visitor's history.

The list is rendered in the sheet's empty state. Clicking a row calls the parent provider's `loadChat(chatId)` and the sheet drops into the
loaded view without re-sending anything.

## Admin review

`/workspace/visitor-chats` shows every visitor chat across all sessions, newest first, with read-only transcript view. Backed by:

- `admin.publicChats: [Chat!]!` — list
- `admin.publicChat(chatId: ID!): Chat!` — detail

Both gated by the parent `User.admin` resolver chain. The page itself is `noindex` and lives in the workspace hub. Read-only means: no
composer, no live subscription mounted, and the `ChatMessage` component gets `isInteractiveCollection={false}` plus no approval handler, so
input collections and approval requests render as static records.

## Cleanup paths

- A visitor's session row is purgeable any time — `chats.sessionId` is `ON DELETE SET NULL`, so the historical chat survives but its owning
  session goes away. The admin review surface still finds the chat through `scope = 'public'`.
- `sessions.ipHash` is rotated whenever the request IP changes (e.g. mobile → wifi transition); the limiter still buckets correctly because
  the session arm of the OR'd predicate never depends on `ipHash`.
- Rotating `VISITOR_IP_HASH_SALT` invalidates the IP bucket for all in-flight 24h windows. Session buckets are unaffected. Treat the salt as
  a secret — do not rotate it casually.
