# Chat email tools

The visitor AI chat has three tools that produce email side-effects. Two are user-facing entry points (`sendEmailToCem`,
`submitProjectRequest`), one is the second leg of a two-step flow (`verifyProjectRequestOtp`).

See also:

- [features/project-requests.md](./project-requests.md) — the OTP-gated verification flow that wraps `submitProjectRequest`.
- [features/chat-visitor.md](./chat-visitor.md) — the chat surface that hosts the agent.

## The tools

| Tool                      | When the agent calls it                                                                   | Side effect                                                                   | Returns                                                                                                                                |
| ------------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `sendEmailToCem`          | Visitor wants to contact Cem about something simple (question, hello, heads-up).          | Enqueues `emailToCemSend`; pg-boss handles retries.                           | `{ status: 'queued' }`                                                                                                                 |
| `submitProjectRequest`    | Visitor describes a project, freelance gig, or business enquiry.                          | Inserts a `pendingOtp` row + enqueues `projectRequestOtpSend`.                | `{ status: 'otpSent', projectRequestId, emailMasked, expiresInMinutes }`                                                               |
| `verifyProjectRequestOtp` | Always immediately after `submitProjectRequest` succeeded and the visitor entered a code. | On match: flips row to `emailVerified` + enqueues `projectRequestNotifySend`. | One of `verified` / `incorrect` (+ `attemptsRemaining`) / `expired` / `tooManyAttempts` / `alreadyVerified` / `archived` / `notFound`. |

The system prompt mandates that the agent **always collect inputs via `promptUserForInput` before calling any of these** — no guessed
addresses, no invented subjects. After `submitProjectRequest`, the agent must immediately surface a single-slot form of kind `Otp` to
collect the verification code, then call `verifyProjectRequestOtp` with the returned `projectRequestId`.

The same rule applies _before_ the agent has enough to call any tool. Any time the agent needs a value with a known shape — a single email
address, a name, a yes/no — it must use `promptUserForInput`, not prose. Partial information is fine: start with the slots you can ask for
now (name + email + a one-line description), see the answers, then make a follow-up `promptUserForInput` call for whatever's still needed.
Gemini's default behaviour without this nudge is to ask "what is your email address?" as a chat message, which loses the typed input
affordance and makes the visitor type rather than tap.

## The pattern that makes this cheap

`promptUserForInput` has no `execute` function — the tool call itself is the payload, the agent's `stopWhen` halts the loop on it, and the
runner persists it as a `chatMessagesAssistantInputCollection` row. That pattern is **not** what the three email tools use.

All three email tools **have an `execute` function**. The AI SDK's tool-loop captures the return value of `execute` into `step.toolResults`;
the existing regular-tool-call branch in `chatAssistantTurnRun.ts` matches it by `toolCallId` and writes both `toolArgs` and `toolResult`
onto the same `chatMessagesToolCall` row. The next assistant step replays that row as a `tool-result` message, so the LLM can see the
outcome and respond in natural language.

This means: **no runner change was needed to ship three new transactional tools.** The seam was already there — adding a tool is a single
file plus a one-line registration on the agent's `tools` map. New future tools can use the same shape (`execute` returns a JSON-shaped
result; the persisted history records it).

## Job pipeline

All three email side-effects ride pg-boss, not in-line awaits, so a Resend hiccup retries without rolling back the chat row that already
contains the tool call. See [architecture/jobs.md](../architecture/jobs.md) for the queue itself.

| Job name                      | Payload                                                     | Triggered by                            |
| ----------------------------- | ----------------------------------------------------------- | --------------------------------------- |
| `email-to-cem-send`           | `{ subject, body, replyEmail, visitorName? }`               | `sendEmailToCem` tool                   |
| `project-request-otp-send`    | `{ projectRequestId, visitorEmail, otp, expiresInMinutes }` | `submitProjectRequest` tool             |
| `project-request-notify-send` | `{ projectRequestId }`                                      | `verifyProjectRequestOtp` tool on match |

The notify job re-reads the row and **refuses to send if status ≠ `emailVerified`** — defense in depth in case a future caller forgets to
gate on verification.

All three jobs:

- Set `to` to `personalInfo.contact.emails[0]` for outgoing notifications to Cem (single source of truth —
  `src/web/content/personalInfo.ts`).
- Set `replyTo` to the visitor's address so Cem can hit reply directly.
- Default retry policy: 3 attempts, 60s backoff, 10-minute expiry.

## Email transport

[Resend](https://resend.com) via the `resend` npm package. Bound through `serverRuntime.emailService` (in
`src/server/services/emailServiceCreate.ts`); the underlying Resend client is constructed lazily on the first `sendEmail` call, not at boot
— so test runtimes and CI builds work without `RESEND_API_KEY`.

Two env vars (both optional at boot; fail-fast at first send):

- `RESEND_API_KEY` — generated in the Resend dashboard.
- `EMAIL_FROM_ADDRESS` — the from-address Resend sends as. The Resend account must own the sending domain (DNS, SPF, DKIM). Format is
  `"Name <local@domain>"` or a bare `local@domain`.

See [infrastructure.md](../infrastructure.md) for env var rollout.

## Rate limiting

No new gate. The visitor chat's existing 10-message-per-24h cap (`docs/features/chat-visitor.md`) transitively caps email tool use:
collecting fields via `promptUserForInput` and then triggering a tool call burns at least 2-3 user messages, so a single IP-hash can fire at
most ~3-5 simple emails or ~2-3 project requests in 24 hours before the chat itself stops responding.

## Where things live

| Concern                   | File                                                                                                 |
| ------------------------- | ---------------------------------------------------------------------------------------------------- |
| Email service             | `src/server/services/emailServiceCreate.ts`                                                          |
| `sendEmailToCem`          | `src/server/agents/toolSendEmailToCem.ts`                                                            |
| `submitProjectRequest`    | `src/server/agents/toolSubmitProjectRequest.ts`                                                      |
| `verifyProjectRequestOtp` | `src/server/agents/toolVerifyProjectRequestOtp.ts`                                                   |
| Email-to-cem job          | `src/server/jobs/handlers/emailToCemSend.ts`                                                         |
| OTP send job              | `src/server/jobs/handlers/projectRequestOtpSend.ts`                                                  |
| Notify job                | `src/server/jobs/handlers/projectRequestNotifySend.ts`                                               |
| Agent wiring + prompt     | `src/server/agents/agentVisitor.ts`                                                                  |
| `Otp` slot kind           | `src/server/agents/toolPromptUserForInput.ts` (Zod enum); GraphQL `ChatAssistantInputOtp` type       |
| OTP UI                    | `src/web/components/base/input-otp.tsx` + render branch in `ChatMessageAssistantInputCollection.tsx` |
