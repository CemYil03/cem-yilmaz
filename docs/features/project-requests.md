# Project requests

A verified contact channel for the visitor AI chat. When a visitor describes a project (freelance gig, paid work, business enquiry), the
assistant offers to submit a structured brief. The brief is recorded in `AdminProjectRequest` in state `pendingOtp` and gated behind a
one-time-password verification: nothing reaches Cem's inbox until the visitor proves they own the email address they gave.

See also:

- [features/chat-email-tools.md](./chat-email-tools.md) — the three chat tools that drive this flow (`submitProjectRequest`,
  `verifyProjectRequestOtp`, plus the unrelated `sendEmailToCem`).
- [features/chat-visitor.md](./chat-visitor.md) — the visitor chat surface that hosts the agent.

## Why an OTP, not "send + filter"

The cheapest place to filter spam and impersonation is **before** the email lands in Cem's inbox. Three options were on the table:

1. **Send first, filter Cem's inbox.** Trivial to implement. Cem becomes the filter. Every spammer with an email field gets through; every
   typo creates a notification Cem can't reply to. Rejected — the entire point of the contact pipeline is to keep noise out of Cem's day.
2. **Magic-link verification.** Email a click-through link the visitor opens to confirm. Better than nothing, but breaks the in-chat flow:
   the visitor leaves the conversation, goes to their email client, clicks a link, returns to a new page. Two context switches per request.
   Rejected — the chat is the surface; verification belongs inside it.
3. **OTP via the existing six-box input.** The visitor enters a six-digit code into the chat itself. One context switch (open inbox, copy
   six digits). The site already has an `<InputOTP>` component (used nowhere in production until this feature). **Chosen.**

## State machine

A `AdminProjectRequest` row moves through one of three states. Status is a flat `varchar` (`pendingOtp | emailVerified | archived`) — same
column-shape pattern as `chats.scope` and the chat-message kinds.

```text
                          ┌── verify with correct OTP within 10 min ──> emailVerified ──> (notification email to Cem fires)
                          │
   submitProjectRequest ──┼── 5 wrong attempts ───────────────────────> archived
   (status = pendingOtp)  │
                          ├── OTP expires (10 min) ───────────────────> (terminal: visitor restarts; row stays pendingOtp until reaped)
                          │
                          └── visitor restarts the flow ──────────────> (new row supersedes the old; old row ages out)
```

- `pendingOtp` — initial state. The visitor has submitted the brief but not yet entered the verification code. The OTP hash + salt + expiry
  are on the row; `otpAttempts` increments per wrong submission.
- `emailVerified` — terminal success. `verifiedAt` is stamped; the notification job has been enqueued. The verify tool refuses further
  submissions ("already verified").
- `archived` — terminal failure. Reached when `otpAttempts` would exceed 5. The row is preserved as an audit trail of attempted abuse.

There is no "expired" state column — expiry is computed from `otpExpiresAt` at verify time. A row with an expired OTP that nobody tries to
verify stays `pendingOtp` indefinitely; a periodic reaper job (future work) is the right home for that cleanup.

## OTP storage

The OTP itself is **never persisted in plaintext**. On `submitProjectRequest`:

1. A 6-digit code is generated with `crypto.randomInt(0, 1_000_000).toString().padStart(6, '0')`.
2. A 16-byte per-row salt is generated with `crypto.randomBytes(16).toString('hex')`.
3. The row stores `otpHash = sha256(otp + otpSalt)` and `otpSalt`. Plaintext lives only in:
   - the function's local scope until it's emailed,
   - the pg-boss `projectRequestOtpSend` job payload (transient — pg-boss deletes completed jobs),
   - the visitor's inbox once Resend has delivered it.

Verification uses `crypto.timingSafeEqual` to compare hashes, so a fast-path success on a partially-correct guess doesn't leak digits via
timing.

Why bother salting a 6-digit code? A leaked DB without the salt is still a brute-force across 1,000,000 values per row, which is fast — but
that's already a much worse breach than the salt protects against. The reason the salt exists is that **without it, two rows that happen to
share the same OTP would have identical hashes**, and an attacker who learned one valid code would learn matches across the table. The salt
costs nothing and closes that.

## Attempt cap

Five attempts. Each wrong submission increments `otpAttempts`. The verify handler archives the row on the attempt that would have been the
sixth, returning `tooManyAttempts`. The expected brute-force probability across five attempts is `5 / 1_000_000 = 5e-6`.

The cap is independent of expiry: an attempt against an expired row returns `expired` without bumping the counter. Expiry is the more
important gate; the cap exists to keep the assistant honest when it tries to be helpful.

## Admin triage

Verified requests surface on the workspace projects page as the **Inbox** tab — see
[features/workspace-projects.md](./workspace-projects.md). From there the row can be:

- **Archived** (`adminProjectRequestArchive`) — flips status to `archived` without creating a project. Hidden by default.
- **Converted to a project** (`projectUpsert` with `sourceRequestId`) — opens the project editor inline on the Inbox row, prefilled with a
  title built from the project-type label + company/visitor name, the brief's `description` copied across, and Budget / Timeline / Contact
  lines pasted into `notes`. The admin reviews and edits before saving. The save runs through `projectUpsert`: in a single transaction it
  inserts the new `AdminProject` (default state `planning`, position auto-appended to the planning column), stamps `sourceRequestId`
  pointing back at the request, and archives the source request. Refuses to act when the source request is not `emailVerified`.
- **Deleted** (`adminProjectRequestDelete`) — permanent. Use only for spam that survived OTP verification. Projects converted earlier from
  this request keep their row but lose the FK backlink (the FK is `ON DELETE SET NULL`).

The workspace hub's Projects card carries a badge with the un-triaged count, fed by `admin.adminProjectRequestInboxCount` — a single
`count(*)` round-trip, not the full request list.

## Where things live

| Concern                              | File                                                                                                 |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| Table definition + types             | `src/server/db/schema.ts` (`projectRequests`, `AdminProjectRequest*`)                                |
| Migration (initial)                  | `drizzle/0003_giant_sentinels.sql`                                                                   |
| Submit tool (state → `pendingOtp`)   | `src/server/agents/toolSubmitProjectRequest.ts`                                                      |
| Verify tool (`pendingOtp` → next)    | `src/server/agents/toolVerifyProjectRequestOtp.ts`                                                   |
| OTP send job                         | `src/server/jobs/handlers/projectRequestOtpSend.ts`                                                  |
| Notification send job (after verify) | `src/server/jobs/handlers/projectRequestNotifySend.ts`                                               |
| OTP slot in the chat form            | `Otp` kind in `toolPromptUserForInput.ts` + GraphQL union member                                     |
| OTP UI                               | `src/web/components/base/input-otp.tsx` (existing base primitive)                                    |
| Admin triage UI                      | `src/routes/{-$locale}/workspace/projects.tsx` (Inbox tab)                                           |
| Admin triage commands                | `src/server/commands/projectRequest{Archive,Delete}.ts`, `projectUpsert.ts` (with `sourceRequestId`) |

## Open questions / future work

- **Reaping stale `pendingOtp` rows.** A row whose OTP expired and which the visitor never returned to retry stays around. A periodic
  cleanup job could move them to `archived` after a few days.
- **Rate limiting.** The visitor chat already caps user messages at 10 per 24h per IP-hash, which transitively caps project submissions —
  every submission needs at least 2-3 user messages, so a single IP-hash can produce at most ~3-4 briefs in a day before the chat itself
  stops accepting their input. No separate cap was added.
