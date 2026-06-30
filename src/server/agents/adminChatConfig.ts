// Admin chat config — see `docs/features/admin-chat-config.md`.

// Fixed singleton key for the `AdminChatConfig` row. Mirrors the
// `Profile` row's singleton pattern (`profileConfig.ts`). Phase 1 has one
// admin total; Phase 2 (per-user accounts) will keep this id for "the
// owner's config" and derive a new id per user.
export const ADMIN_CHAT_CONFIG_SINGLETON_ID = '00000000-0000-0000-0000-000000000002';
