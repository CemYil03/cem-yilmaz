// Visitor-chat rate-limit constants. Keyed on the requesting session AND
// its `ipHash` (whichever fills first wins) over a rolling 24h window —
// see `docs/features/chat-visitor.md`. Enforced inside `chatMessageCreate`
// on the visitor branch and surfaced to the client through
// `Session.visitorChatQuota`.

export const VISITOR_CHAT_DAILY_LIMIT = 10;

export const VISITOR_CHAT_WINDOW_MS = 24 * 60 * 60 * 1000;
