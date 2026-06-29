# Visitor chat

The visitor chat is the "Ask me anything" surface mounted on the public site. It's a right-side **Sheet** hosted at the root layout so any
public page can open it — the landing-page hero composer (seeded question), suggestion chips (seeded question), and the chat icon in the
site header (empty state) all funnel into the same component.

See also:

- [features/chat.md](./chat.md) — the chat surface itself (transcript, composer, live updates).
- [features/chat-workspace.md](./chat-workspace.md) — the parallel personal-assistant chat for the workspace.
- [features/chat-email-tools.md](./chat-email-tools.md) — the visitor agent's three email-shaped tools (contact, project request, OTP
  verify).
- [features/project-requests.md](./project-requests.md) — the OTP-gated project-request flow.
- [architecture/multi-agent-chat.md](../architecture/multi-agent-chat.md) — how visitor and admin chats split at the GraphQL namespace level
  and which agent each one dispatches to.

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

| Entry point                        | How it opens the sheet                   | Initial state                                                                                                    |
| ---------------------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Landing-page hero composer / chips | `useVisitorChat().openWithMessage(text)` | Seeded — fires the typed question on mount and lands on the loaded transcript when the server returns the chatId |
| Site header `MessageCircle` button | `useVisitorChat().openEmpty()`           | Empty — shows previous chats list + composer; no seeded send                                                     |
| Empty state "Previous chats" entry | `useVisitorChat().loadChat(chatId)`      | Loaded — opens directly at a specific chat without re-sending                                                    |

The provider's state machine is the `VisitorChatIntent` discriminated union in `src/web/chat/VisitorChatProvider.tsx`. The sheet itself is
mounted once in `src/routes/__root.tsx`, so every public route inherits it without duplicating the tree.

## Composer

Two visitor-specific deviations from the shared `<ChatComposer />`:

- **No approval-mode selector.** Page visitors never need to gate tool calls — `showApprovalMode={false}` hides the Auto / Manual select in
  the composer's bottom-left addon. The shared composer keeps it on by default for the workspace assistant surface.
- **"New chat" button on the loaded transcript.** Inside the loaded view the composer's bottom-left addon slot hosts a "Neuer Chat" / "New
  chat" button (plus icon). Clicking it resets the sheet's internal `chatId` back to `undefined`, which drops `ChatSurface` into
  `ChatEmptyState` — the previous-chats list + composer overview. The button is disabled while a turn is generating; the empty state's own
  composer creates a fresh chat on first send, just like opening the sheet from the header.

Both deviations are wired by passing `showApprovalMode={false}` and an `addonStart` ReactNode into `<ChatComposer />` — props the shared
composer exposes so surface-specific controls can plug into the same bottom-left slot.

## Anonymous authoring

Visitors are not logged in. The server identifies a visitor by the session cookie alone — there is no `User` row and `sessions.userId` stays
null. That has two consequences in the chat data path:

- `ChatMessageUser.author` and `ChatMessageUserInput.author` are nullable in the GraphQL schema. Visitor messages always come back with
  `author: null`; admin messages always have one populated. The sheet renders "Du" / "You" when `author` is null.
- `chatMessages.authorUserId` is nullable in the DB. The mapper (`src/server/mappers/toGqlChatMessage.ts`) skips the `need(row.author, …)`
  check for the two user-authored variants and returns `null` when no user row is attached.

Visitor chats are linked to their owning session via the new `chats.sessionId` column. This is what powers the "Previous chats" list in the
sheet's empty state — `Session.visitorChats` selects from this column. Admin chats leave `sessionId` null; they're owned by the logged-in
user (read via `scope = 'admin'`).

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

The mutation returns `null` to the client when the cap is exceeded — the sheet's quota row already shows the "Daily limit reached" message,
so the mutation failure becomes a silent no-op rather than a transport error.

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

### `Session.visitorChatQuota` GraphQL field

```graphql
type VisitorChatQuota {
  used: Int!
  limit: Int!
  resetsAt: DateTime
}
```

`resetsAt` is the moment the oldest in-window message ages out — null when `used = 0`. The sheet's quota row formats it with
`formatDistanceToNow` so it reads "resets in 18 hours" / "Tageslimit erreicht — neue Nachricht in 18 Std. möglich".

## Previous chats list

`Session.visitorChats` returns up to 50 chats owned by the requester's session (newest first), via `chatsFindBySession`. Empty `messages` —
fetch a single transcript through `Query.chat(chatId)` when the visitor actually picks one.

The list is rendered in the sheet's empty state. Clicking a row calls the parent provider's `loadChat(chatId)` and the sheet drops into the
loaded view without re-sending anything.

## Admin review

`/workspace/visitor-chats` shows every visitor chat across all sessions, newest first, with read-only transcript view. Backed by:

- `admin.publicChats: [Chat!]!` — list
- `admin.publicChat(chatId: ID!): Chat!` — detail

Both gated by the parent `Admin.*` guard (`guardAdmin`). The page itself is `noindex` and lives in the workspace hub. Read-only means: no
composer, no live subscription mounted, and the `ChatMessage` component gets `isInteractiveCollection={false}` plus no approval handler, so
input collections and approval requests render as static records.

## Cleanup paths

- A visitor's session row is purgeable any time — `chats.sessionId` is `ON DELETE SET NULL`, so the historical chat survives but its owning
  session goes away. The admin review surface still finds the chat through `scope = 'public'`.
- `sessions.ipHash` is rotated whenever the request IP changes (e.g. mobile → wifi transition); the limiter still buckets correctly because
  the session arm of the OR'd predicate never depends on `ipHash`.
- Rotating `VISITOR_IP_HASH_SALT` invalidates the IP bucket for all in-flight 24h windows. Session buckets are unaffected. Treat the salt as
  a secret — do not rotate it casually.
