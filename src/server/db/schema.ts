import {
    boolean,
    customType,
    date,
    foreignKey,
    index,
    integer,
    jsonb,
    numeric,
    pgTable,
    text,
    timestamp,
    uniqueIndex,
    uuid,
    varchar,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Drizzle has no first-class `bytea` builder; the `customType` helper wraps
// `bytea` so the column round-trips as a Node `Buffer` on read and accepts
// `Buffer | Uint8Array` on write. Used by `fileUploads.bytes`.
const bytea = customType<{ data: Buffer; driverData: Buffer }>({
    dataType() {
        return 'bytea';
    },
});

export const sessions = pgTable(
    'Sessions',
    {
        sessionId: uuid().primaryKey(),
        userId: uuid(),
        lastInteractionAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
        wasTerminatedAt: timestamp({ withTimezone: true }),
        connectionActive: boolean().notNull().default(false),
        userAgent: varchar(),
        // `ipHash` is `SHA256(VISITOR_IP_HASH_SALT + ":" + clientIp)`, computed
        // on every session upsert by `sessionUpsert`. Nullable because local
        // dev / unproxied requests have no resolvable IP (see
        // `clientIpFromRequest`). The visitor-chat rate limiter buckets by
        // `(sessionId OR ipHash)` so cookie-clearing does not reset a
        // visitor's daily quota — see `docs/features/chat-visitor.md`.
        ipHash: varchar(),
        createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.userId],
            foreignColumns: [users.userId],
        })
            .onUpdate('cascade')
            .onDelete('set null'),
        index('Sessions_ipHash_idx').on(table.ipHash),
    ],
);

export type SessionCreate = typeof sessions.$inferInsert;
export type Session = typeof sessions.$inferSelect;

export const logs = pgTable(
    'Logs',
    {
        logId: uuid().primaryKey(),
        sessionId: uuid(),
        level: varchar().notNull(),
        message: varchar().notNull(),
        context: jsonb(),
        createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.sessionId],
            foreignColumns: [sessions.sessionId],
        })
            .onUpdate('cascade')
            .onDelete('set null'),
    ],
);

export type Log = typeof logs.$inferSelect;
export type LogCreate = typeof logs.$inferInsert;

// `isAdmin` gates the workspace surface — the `User.admin` resolver and the
// `Mutation.admin` `guardAdminMutation` gate both read this column. Access is
// simply: the session has a `userId` whose row has `isAdmin = true`. Set
// manually with `UPDATE "Users" SET "isAdmin" = true WHERE …` for admin
// accounts; visitors and anonymous sessions never flip it. A dedicated
// `Admins` table is a clean upgrade later because the column move is
// mechanical. See `docs/architecture/authorization-workspace.md`.
export const users = pgTable('Users', {
    userId: uuid().primaryKey(),
    name: varchar().notNull(),
    isAdmin: boolean().notNull().default(false),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type UserCreate = typeof users.$inferInsert;

// --- Chat ---------------------------------------------------------------------
//
// See docs/architecture/chat-persistence.md for the rationale behind this
// shape. Summary: a spine table `ChatMessages` carrying ordering and shared
// columns, plus one per-variant table keyed by the same `chatMessageId`. JSONB
// is used only where the GraphQL schema itself is a union of values
// (`inputs`, `answers`, tool args/result).

// `scope` discriminates visitor chats (`/chat`) from the personal-assistant
// chats at `/workspace/assistant`. The column is stamped on insert by the
// command that created the chat — visitor mutations write `'public'`, admin
// mutations write `'admin'` — and never updated afterward. Dispatch to the
// agent factory is decided by the access path (which mutation namespace was
// used), not by reading this column; `scope` exists so the chat commands can
// reject a `chatId` flowing through the wrong namespace, and so
// `Admin.publicChats` / `Admin.chats` can split admin-side reads. See
// `docs/architecture/chat.md`.
export const chats = pgTable(
    'Chats',
    {
        chatId: uuid().primaryKey(),
        title: varchar().notNull().default(''),
        scope: varchar().$type<'public' | 'admin'>().notNull().default('public'),
        // Owning visitor session for `scope = 'public'` chats. Stamped on
        // insert by `chatMessageCreate` and never updated. Nullable because
        // admin (`scope = 'admin'`) chats are owned by a logged-in user, not
        // a session — they leave this column null. The FK is `ON DELETE SET
        // NULL` so visitor history survives a session-row purge (used by the
        // admin review at `/workspace/visitor-chats`); the data still ages
        // out through the chat-level retention rules. See
        // `docs/features/chat-visitor.md`.
        sessionId: uuid(),
        lastModifiedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
        // Latest LLM step's `inputTokens` for this chat — the prompt size the
        // provider actually saw. Updated at end of each assistant turn so the
        // workspace composer can show context-window headroom without scanning
        // message variant tables. Null until the first turn with usage lands
        // (fresh chats + legacy rows written before this column existed).
        contextTokensUsed: integer(),
        createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.sessionId],
            foreignColumns: [sessions.sessionId],
        })
            .onUpdate('cascade')
            .onDelete('set null'),
        index('Chats_sessionId_lastModifiedAt_idx').on(table.sessionId, table.lastModifiedAt),
    ],
);

export type Chat = typeof chats.$inferSelect;
export type ChatCreate = typeof chats.$inferInsert;

export const chatMessageKinds = [
    'user',
    'assistantText',
    'toolCall',
    'toolApprovalRequest',
    'toolApprovalResponse',
    'assistantInputCollection',
    'userInput',
] as const;

export type ChatMessageKind = (typeof chatMessageKinds)[number];

export const chatMessages = pgTable(
    'ChatMessages',
    {
        chatMessageId: uuid().primaryKey(),
        chatId: uuid().notNull(),
        kind: varchar().$type<ChatMessageKind>().notNull(),
        authorUserId: uuid(),
        // Self-FK: when a sub-agent runs inside a parent tool's `execute`
        // (today: `toolDelegateToProjects` runs `agentPersonalAssistantProjects`),
        // each child tool call this sub-agent makes is persisted with
        // `parentChatMessageId` set to the parent delegate row's id. The
        // transcript filters child rows out of the top-level list and renders
        // them indented under the parent's tool-call card. LLM replay
        // (`toModelMessages`) ignores this column — the rows are still valid
        // AI-SDK tool-call/tool-result pairs on their own. See
        // `docs/architecture/agent-delegation.md` ("Nested tool calls").
        parentChatMessageId: uuid(),
        createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.chatId],
            foreignColumns: [chats.chatId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        foreignKey({
            columns: [table.authorUserId],
            foreignColumns: [users.userId],
        })
            .onUpdate('cascade')
            .onDelete('set null'),
        // Self-FK on `parentChatMessageId`. `ON DELETE CASCADE` so deleting a
        // parent (e.g. retention cleanup) takes its children with it.
        foreignKey({
            columns: [table.parentChatMessageId],
            foreignColumns: [table.chatMessageId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        index('ChatMessages_chatId_createdAt_idx').on(table.chatId, table.createdAt),
        index('ChatMessages_kind_idx').on(table.kind),
        // Powers "load children of X in insertion order" inside the transcript
        // and the live-updates merge — see `chatMessageRowsLoad`.
        index('ChatMessages_parentChatMessageId_createdAt_idx').on(table.parentChatMessageId, table.createdAt),
    ],
);

export type ChatMessage = typeof chatMessages.$inferSelect;
export type ChatMessageCreate = typeof chatMessages.$inferInsert;

export const chatMessagesUser = pgTable(
    'ChatMessagesUser',
    {
        chatMessageId: uuid().primaryKey(),
        body: varchar().notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.chatMessageId],
            foreignColumns: [chatMessages.chatMessageId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
    ],
);

export type ChatMessageUser = typeof chatMessagesUser.$inferSelect;
export type ChatMessageUserCreate = typeof chatMessagesUser.$inferInsert;

// Per-step generation metadata is denormalized onto every AI-produced variant
// row (see `docs/architecture/chat-persistence.md` — "Generation metadata"). A
// single LLM step can persist multiple rows (text + N tool calls + an input
// collection); each row carries the same `(modelId, *Tokens)` snapshot that
// the AI SDK reported for that step. All columns are nullable so legacy rows
// (pre-feature) and providers that don't report a given metric still load.
// Aggregating across rows therefore over-counts: a step that produced one
// `assistantText` plus three `toolCall` rows reports its tokens four times.
// Analytics consumers must dedupe by step boundary or accept the duplication
// — see the alternatives table in `chat-persistence.md`.
export const chatMessagesAssistantText = pgTable(
    'ChatMessagesAssistantText',
    {
        chatMessageId: uuid().primaryKey(),
        body: varchar().notNull(),
        // Gemini thought summary (`includeThoughts` → AI SDK `reasoning-delta` /
        // `reasoningText`). Null for Flash (thinking disabled), legacy rows, and
        // turns that produced no thoughts. UI-only — `toModelMessages` does not
        // replay it. See `docs/architecture/chat-persistence.md`.
        reasoning: varchar(),
        modelId: varchar(),
        inputTokens: integer(),
        outputTokens: integer(),
        totalTokens: integer(),
        reasoningTokens: integer(),
        cachedInputTokens: integer(),
    },
    (table) => [
        foreignKey({
            columns: [table.chatMessageId],
            foreignColumns: [chatMessages.chatMessageId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
    ],
);

export type ChatMessageAssistantText = typeof chatMessagesAssistantText.$inferSelect;
export type ChatMessageAssistantTextCreate = typeof chatMessagesAssistantText.$inferInsert;

// `toolArgs` and `toolResult` are per-tool-typed payloads; they are validated
// by Zod schemas at the application boundary (the tool definition), never
// queried by the database, and never exposed via GraphQL. `toolCallId` mirrors
// the AI SDK's tool-call id so replay can pair the call with its result.
//
// Generation metadata columns: see comment on `chatMessagesAssistantText`.
export const chatMessagesToolCall = pgTable(
    'ChatMessagesToolCall',
    {
        chatMessageId: uuid().primaryKey(),
        toolCallId: varchar().notNull(),
        toolName: varchar().notNull(),
        toolArgs: jsonb().notNull(),
        toolResult: jsonb(),
        resultedAt: timestamp({ withTimezone: true }),
        modelId: varchar(),
        inputTokens: integer(),
        outputTokens: integer(),
        totalTokens: integer(),
        reasoningTokens: integer(),
        cachedInputTokens: integer(),
    },
    (table) => [
        foreignKey({
            columns: [table.chatMessageId],
            foreignColumns: [chatMessages.chatMessageId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        index('ChatMessagesToolCall_toolCallId_idx').on(table.toolCallId),
    ],
);

export type ChatMessageToolCall = typeof chatMessagesToolCall.$inferSelect;
export type ChatMessageToolCallCreate = typeof chatMessagesToolCall.$inferInsert;

export const chatMessagesToolApprovalRequest = pgTable(
    'ChatMessagesToolApprovalRequest',
    {
        chatMessageId: uuid().primaryKey(),
        approvalId: varchar().notNull().unique('ChatMessagesToolApprovalRequest_approvalId_uniq'),
        // The AI SDK assigns a `toolCallId` to the suspended call. We persist
        // it so that on approve/decline the respond command can write a
        // matching `chatMessagesToolCall` row whose id lines up with what the
        // agent originally produced — `toModelMessages` then emits a coherent
        // tool-call/tool-result pair on resume.
        toolCallId: varchar().notNull(),
        toolName: varchar().notNull(),
        toolArgs: jsonb().notNull(),
        // Generation metadata columns: see comment on `chatMessagesAssistantText`.
        modelId: varchar(),
        inputTokens: integer(),
        outputTokens: integer(),
        totalTokens: integer(),
        reasoningTokens: integer(),
        cachedInputTokens: integer(),
    },
    (table) => [
        foreignKey({
            columns: [table.chatMessageId],
            foreignColumns: [chatMessages.chatMessageId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
    ],
);

export type ChatMessageToolApprovalRequest = typeof chatMessagesToolApprovalRequest.$inferSelect;
export type ChatMessageToolApprovalRequestCreate = typeof chatMessagesToolApprovalRequest.$inferInsert;

export const chatMessagesToolApprovalResponse = pgTable(
    'ChatMessagesToolApprovalResponse',
    {
        chatMessageId: uuid().primaryKey(),
        approvalId: varchar().notNull().unique(),
        approved: boolean().notNull(),
        // Optional free-text justification the human typed when responding.
        // Persisted so `toModelMessages` can forward it onto the SDK's
        // `tool-approval-response` part — the SDK then routes it to the
        // synthetic denied tool-result so the LLM sees *why* the human
        // declined instead of a generic "execution-denied". The column is
        // schema-symmetric (valid on approve too) so an "approve with
        // justification" UX can land later without a migration; today only
        // the Decline UI exposes the textarea.
        reason: varchar(),
    },
    (table) => [
        foreignKey({
            columns: [table.chatMessageId],
            foreignColumns: [chatMessages.chatMessageId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        foreignKey({
            columns: [table.approvalId],
            foreignColumns: [chatMessagesToolApprovalRequest.approvalId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        uniqueIndex('ChatMessagesToolApprovalResponse_approvalId_uniq').on(table.approvalId),
    ],
);

export type ChatMessageToolApprovalResponse = typeof chatMessagesToolApprovalResponse.$inferSelect;
export type ChatMessageToolApprovalResponseCreate = typeof chatMessagesToolApprovalResponse.$inferInsert;

// `inputs` is a `ChatAssistantInputSlot[]` — a GraphQL union of typed slot kinds.
// Stored as JSONB because the slot variants share no flat row shape; typed by
// an internal Zod schema before insert. NOT a GraphQL type — the mapper
// converts to `GqlSChatAssistantInput` on read.
//
// `mode` controls only how the collection is rendered: `'form'` (default)
// shows every slot at once, `'stepThrough'` walks the user through one slot
// at a time. It's a flat enum — not a union — so it lives as a column rather
// than inside the JSONB payload, matching the JSONB-only-for-unions rule the
// table comment lays down.
export const chatMessagesAssistantInputCollection = pgTable(
    'ChatMessagesAssistantInputCollection',
    {
        chatMessageId: uuid().primaryKey(),
        prompt: varchar().notNull(),
        inputs: jsonb().notNull(),
        mode: varchar().$type<'form' | 'stepThrough'>().notNull().default('form'),
        // Generation metadata columns: see comment on `chatMessagesAssistantText`.
        modelId: varchar(),
        inputTokens: integer(),
        outputTokens: integer(),
        totalTokens: integer(),
        reasoningTokens: integer(),
        cachedInputTokens: integer(),
    },
    (table) => [
        foreignKey({
            columns: [table.chatMessageId],
            foreignColumns: [chatMessages.chatMessageId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
    ],
);

export type ChatMessageAssistantInputCollection = typeof chatMessagesAssistantInputCollection.$inferSelect;
export type ChatMessageAssistantInputCollectionCreate = typeof chatMessagesAssistantInputCollection.$inferInsert;

// `answers` is a `ChatMessageUserInputAnswer[]` whose `value` is itself a
// GraphQL union (`ChatAssistantInputValue`). Same JSONB rationale as
// `inputs` above.
//
// An empty `answers: []` is the "user pivoted away" signal: written by
// `chatMessageCreate` when the user types a free-text message while the
// previous collection is still open — see "Pivoting away from an open
// collection" in `docs/architecture/chat.md`. Real submits always carry at
// least one answer (the form's `canSubmit` gate enforces it), so absence
// uniquely identifies a skip.
export const chatMessagesUserInput = pgTable(
    'ChatMessagesUserInput',
    {
        chatMessageId: uuid().primaryKey(),
        collectionMessageId: uuid().notNull(),
        answers: jsonb().notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.chatMessageId],
            foreignColumns: [chatMessages.chatMessageId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        foreignKey({
            columns: [table.collectionMessageId],
            foreignColumns: [chatMessagesAssistantInputCollection.chatMessageId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
    ],
);

export type ChatMessageUserInput = typeof chatMessagesUserInput.$inferSelect;
export type ChatMessageUserInputCreate = typeof chatMessagesUserInput.$inferInsert;

// --- File uploads -------------------------------------------------------------
//
// Bytes-in-Postgres for user-uploaded file blobs. Each row carries the original
// filename, IANA media type, byte length, and the raw payload. The bytes column
// uses `bytea` via `customType` (Drizzle has no first-class bytea builder).
// Storage location decision (Postgres vs. filesystem vs. object storage) is
// template-wide: see `docs/architecture/file-storage.md`. The store is
// consumer-agnostic — chat is its first consumer (via the
// `ChatMessageUserAttachments` join below), but other surfaces can reference
// `FileUploads.fileUploadId` directly. Per-consumer caps live at the upload
// route (`src/routes/api/file-uploads.ts` enforces 10 MB today) — the column
// itself is unbounded.
//
// File uploads are owned by a user. On user delete, the rows cascade away.
// Other surfaces reference uploads by id and may layer their own cascade /
// retention rules on top via their own join rows.

export const fileUploads = pgTable(
    'FileUploads',
    {
        fileUploadId: uuid().primaryKey(),
        userId: uuid().notNull(),
        filename: varchar().notNull(),
        mediaType: varchar().notNull(),
        size: integer().notNull(),
        bytes: bytea().notNull(),
        createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.userId],
            foreignColumns: [users.userId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        index('FileUploads_userId_idx').on(table.userId),
    ],
);

export type FileUpload = typeof fileUploads.$inferSelect;
export type FileUploadCreate = typeof fileUploads.$inferInsert;

// Join row pinning file uploads to a user-authored chat message as
// "attachments". `position` is the user-visible order of attachments inside
// the message — preserved from the order the composer sent them so the
// rendered tile row matches what the user dragged in. An attachment can in
// principle reference the same file upload from more than one message (we
// don't dedupe today, but the schema doesn't forbid sharing). On chat delete,
// the join rows cascade away but the underlying `FileUploads` row is
// preserved — reachable only by id, and cleaned up by the user row's cascade
// if the user is removed.
export const chatMessageUserAttachments = pgTable(
    'ChatMessageUserAttachments',
    {
        chatMessageId: uuid().notNull(),
        fileUploadId: uuid().notNull(),
        position: integer().notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.chatMessageId],
            foreignColumns: [chatMessagesUser.chatMessageId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        foreignKey({
            columns: [table.fileUploadId],
            foreignColumns: [fileUploads.fileUploadId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        uniqueIndex('ChatMessageUserAttachments_pk').on(table.chatMessageId, table.fileUploadId),
        index('ChatMessageUserAttachments_chatMessageId_idx').on(table.chatMessageId),
    ],
);

export type ChatMessageUserAttachment = typeof chatMessageUserAttachments.$inferSelect;
export type ChatMessageUserAttachmentCreate = typeof chatMessageUserAttachments.$inferInsert;

// --- CV ----------------------------------------------------------------------
//
// Editable CV content surfaced on `/cv` (timeline) and `/about` (skills,
// hobbies). Each table is an ordered list driven by a `position` integer that
// the admin editor at `/workspace/cv` writes via the `*Reorder` command. The
// public read path is `Query.cv.*`; mutations are gated by `guardAdminMutation`
// — see `docs/features/cv.md`.
//
// Bilingual fields ship as paired `*De` / `*En` text columns. The visitor
// site never queries by language at the DB layer (the GraphQL response
// returns both, the client picks at render), so a column-per-locale stays
// simpler than a JSONB blob and lets the admin form bind to two plain inputs.
//
// Proper nouns that read the same in both locales (company names, institution
// names, skill labels) stay on a single column — same rationale as
// `cvSkill.label`. See `docs/architecture/content-model.md`.
//
// `endDate IS NULL` is the canonical "ongoing" marker for the timeline rows
// (rendered as "heute" / "today"). `technologies` is a Postgres `text[]` —
// the labels are display chips, never queried by relation, so a join table
// would be overhead.

// `cvExperience` has no `position` column — rows are an inherently
// chronological list, so the read query orders by `endDate DESC NULLS FIRST,
// startDate DESC` (ongoing roles first; later end dates beat earlier ones;
// later start date wins on tie). The other three CV tables stay manually
// ordered via `position`.
export const cvExperience = pgTable('CvExperience', {
    cvExperienceId: uuid().primaryKey(),
    roleDe: varchar().notNull(),
    roleEn: varchar().notNull(),
    company: varchar().notNull(),
    startDate: date().notNull(),
    endDate: date(),
    descriptionDe: text().notNull(),
    descriptionEn: text().notNull(),
    technologies: text().array().notNull().default([]),
    managerName: varchar(),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
});

export type CvExperience = typeof cvExperience.$inferSelect;
export type CvExperienceCreate = typeof cvExperience.$inferInsert;

export const cvEducation = pgTable(
    'CvEducation',
    {
        cvEducationId: uuid().primaryKey(),
        degreeDe: varchar().notNull(),
        degreeEn: varchar().notNull(),
        institution: varchar().notNull(),
        subjectDe: varchar().notNull().default(''),
        subjectEn: varchar().notNull().default(''),
        startDate: date(),
        endDate: date().notNull(),
        notesDe: text().notNull().default(''),
        notesEn: text().notNull().default(''),
        position: integer().notNull(),
        createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [index('CvEducation_position_idx').on(table.position)],
);

export type CvEducation = typeof cvEducation.$inferSelect;
export type CvEducationCreate = typeof cvEducation.$inferInsert;

// `category` is a flat enum stored as varchar — the GraphQL schema mirrors
// it as `enum CvSkillCategory`. Skill labels themselves are not translated
// ("TypeScript" reads the same in both locales), which is why there is a
// single `label` column rather than the `*De`/`*En` pair.
export const cvSkillCategories = ['capabilities', 'frameworks', 'services', 'tools', 'languages'] as const;
export type CvSkillCategory = (typeof cvSkillCategories)[number];

export const cvSkill = pgTable(
    'CvSkill',
    {
        cvSkillId: uuid().primaryKey(),
        category: varchar().$type<CvSkillCategory>().notNull(),
        label: varchar().notNull(),
        position: integer().notNull(),
        createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [index('CvSkill_category_idx').on(table.category), index('CvSkill_position_idx').on(table.position)],
);

export type CvSkill = typeof cvSkill.$inferSelect;
export type CvSkillCreate = typeof cvSkill.$inferInsert;

// `since` is a free-form integer year for entries like "Seit 2011 Karate" —
// nullable because not every hobby anchors on a year ("Tennis, Volleyball,
// Fußball, Schwimmen").
export const cvHobby = pgTable(
    'CvHobby',
    {
        cvHobbyId: uuid().primaryKey(),
        textDe: text().notNull(),
        textEn: text().notNull(),
        since: integer(),
        position: integer().notNull(),
        createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [index('CvHobby_position_idx').on(table.position)],
);

export type CvHobby = typeof cvHobby.$inferSelect;
export type CvHobbyCreate = typeof cvHobby.$inferInsert;

// --- Profile -----------------------------------------------------------------
//
// AI-built profile of Cem, fed by an analyzer job that watches the admin
// assistant chat. Three artifacts ride on a single singleton row:
//
// - `summary` — short, factual, INJECTED into the personal assistant's system
//   prompt on every turn (`agentPersonalAssistant`). Read by exactly one
//   command: `compassSummaryGet`.
// - `prose` — long-form, human-readable insight for Cem. Never injected.
// - `psychology` — psychological synthesis. Firewall: never injected and
//   never fed back to any agent.
//
// The firewall is enforced by storage separation: the agent factory only ever
// reads `summary`; `prose` / `psychology` are surfaced exclusively at
// `/workspace/compass`. See `docs/features/compass.md`.
//
// One row in the table. We model it as a regular table (not a key/value blob)
// so the big text fields stay typed, and so a future Phase 2 split into
// per-user compasses is a column addition rather than a schema move.

export const compass = pgTable('Compass', {
    compassId: uuid().primaryKey(),
    summary: text().notNull().default(''),
    prose: text().notNull().default(''),
    psychology: text().notNull().default(''),
    // Timestamp of the last successful synthesis; null until the synthesizer
    // has run at least once. Renders the "Last synthesized · 2 days ago"
    // label on the compass page.
    synthesizedAt: timestamp({ withTimezone: true }),
    synthesisModelId: varchar(),
    // Count of non-dismissed observations recorded since the last synthesis.
    // The analyzer increments this; the synthesizer resets it to 0. The
    // synthesizer auto-triggers when this crosses
    // `COMPASS_SYNTHESIS_THRESHOLD` (`src/server/agents/compassConfig.ts`).
    observationsSinceSynthesis: integer().notNull().default(0),
    // AI-suggested next interview — set by the analyzer when a message
    // contains a time-sensitive signal (upcoming decision, deadline, acute
    // stressor). The cron handler consumes this before falling back to the
    // rotation. Cleared after use or when Cem dismisses the suggestion.
    scheduledInterviewTopic: varchar(),
    scheduledInterviewAt: timestamp({ withTimezone: true }),
    scheduledInterviewReason: text(),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
});

export type Compass = typeof compass.$inferSelect;
export type CompassCreate = typeof compass.$inferInsert;

// --- Admin chat config -------------------------------------------------------
//
// Singleton row holding the workspace assistant's saved default model id.
// Same shape and id strategy as `Compass` above: one fixed-id row today, a
// future per-user split is a column addition rather than a schema move. The
// list of selectable models lives in code (`src/server/agents/adminChatModels.ts`)
// — this table stores ONLY which one is currently picked. The row is
// bootstrapped lazily on first `Admin.chatConfig` read; until then, the
// runtime falls back to the catalog's first entry. See
// `docs/features/admin-chat-config.md`.

export const adminChatConfig = pgTable('AdminChatConfig', {
    adminChatConfigId: uuid().primaryKey(),
    defaultModelId: varchar().notNull(),
    updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
});

export type AdminChatConfig = typeof adminChatConfig.$inferSelect;
export type AdminChatConfigCreate = typeof adminChatConfig.$inferInsert;

// Categories the analyzer LLM is told to choose from. Stored as a flat enum
// in a `varchar` (mirrors the GraphQL `CompassObservationCategory` enum).
//
// - `factual`     — concrete facts (skills, preferences, life events, plans)
// - `behavioral`  — communication style, decision patterns, working habits
// - `psychological` — state of mind, stress markers, recurring emotional themes
export const compassObservationCategories = ['factual', 'behavioral', 'psychological'] as const;
export type CompassObservationCategory = (typeof compassObservationCategories)[number];

// --- Compass psychological interviews ---------------------------------------
//
// A recurring job creates a `pending` interview row on a cadence. When Cem
// lands on `/workspace/compass` and starts it, the row transitions to
// `in_progress`; the interview agent and Cem's replies are appended to
// `CompassInterviewMessages`. When the agent calls `concludeInterview`, or
// Cem ends the session early, the row moves to `completed`. A `skipped` row
// is one Cem chose not to do.
//
// At most one row is `pending` at any time — the cron handler is idempotent,
// so a missed week resumes next week rather than piling up.
//
// Decoupled from `Chats` / `ChatMessages` deliberately: `chats.scope` is the
// strict `'public' | 'admin'` discriminator the visitor / admin access-path
// dispatch rests on (`docs/architecture/chat.md`), and interview turns
// don't need approval, tool calls, generations, or input collection — a flat
// user/assistant log is enough. See `docs/features/workspace-compass.md`.
export const compassInterviewStatuses = ['pending', 'in_progress', 'completed', 'skipped'] as const;
export type CompassInterviewStatus = (typeof compassInterviewStatuses)[number];

export const compassInterviewEndReasons = ['agent_satisfied', 'user_ended', 'skipped'] as const;
export type CompassInterviewEndReason = (typeof compassInterviewEndReasons)[number];

export const compassInterviewTriggerReasons = ['scheduled', 'manual'] as const;
export type CompassInterviewTriggerReason = (typeof compassInterviewTriggerReasons)[number];

export const compassInterviewTopics = ['general', 'career', 'relationships', 'fitness', 'health', 'stress'] as const;
export type CompassInterviewTopic = (typeof compassInterviewTopics)[number];

export const compassInterviews = pgTable(
    'CompassInterviews',
    {
        interviewId: uuid().primaryKey(),
        status: varchar().$type<CompassInterviewStatus>().notNull().default('pending'),
        // Set when the cron handler (or the manual trigger) first inserted the
        // row. Drives the "waiting since…" copy on the page surface.
        dueAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
        // Stamped on the first `compassInterviewStart`.
        startedAt: timestamp({ withTimezone: true }),
        // Stamped on `completed` or `skipped`.
        completedAt: timestamp({ withTimezone: true }),
        endReason: varchar().$type<CompassInterviewEndReason>(),
        triggerReason: varchar().$type<CompassInterviewTriggerReason>().notNull().default('scheduled'),
        // The domain focus for this interview. Drives per-topic system-prompt
        // injection in `agentCompassInterviewer`; surfaces as a badge on the
        // page. 'general' is a broad check-in with no specific focus area.
        topic: varchar().$type<CompassInterviewTopic>().notNull().default('general'),
        // Denormalized count of observations whose source-interview-message
        // belongs to this interview. Kept on the row so the past-interviews
        // list can render "N observations" without a per-row aggregate.
        // The analyzer increments this when it logs an observation for an
        // interview message.
        observationCount: integer().notNull().default(0),
        createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        index('CompassInterviews_status_dueAt_idx').on(table.status, table.dueAt),
        index('CompassInterviews_createdAt_idx').on(table.createdAt),
    ],
);

export type CompassInterview = typeof compassInterviews.$inferSelect;
export type CompassInterviewCreate = typeof compassInterviews.$inferInsert;

export const compassInterviewMessageRoles = ['user', 'assistant'] as const;
export type CompassInterviewMessageRole = (typeof compassInterviewMessageRoles)[number];

// Flat user/assistant log for an interview. No tool calls, no generations, no
// approval lifecycle — just the words exchanged. The analyzer treats user
// turns the same way it treats admin chat user messages.
export const compassInterviewMessages = pgTable(
    'CompassInterviewMessages',
    {
        interviewMessageId: uuid().primaryKey(),
        interviewId: uuid().notNull(),
        role: varchar().$type<CompassInterviewMessageRole>().notNull(),
        content: text().notNull(),
        // Set on assistant turns only — the resolved Gemini model id used for
        // the turn, mirroring `Compass.synthesisModelId`. Helpful for triage
        // when the interviewer's question quality drifts after a model bump.
        modelId: varchar(),
        createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.interviewId],
            foreignColumns: [compassInterviews.interviewId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        index('CompassInterviewMessages_interviewId_createdAt_idx').on(table.interviewId, table.createdAt),
    ],
);

export type CompassInterviewMessage = typeof compassInterviewMessages.$inferSelect;
export type CompassInterviewMessageCreate = typeof compassInterviewMessages.$inferInsert;

// One row per observation extracted by the analyzer. The source FK is one of
// `sourceChatMessageId` (admin chat with the personal assistant) or
// `sourceInterviewMessageId` (a turn in a psychological-interview session) —
// exactly one is set per row, enforced by the creating command. The UI uses
// whichever is set to render the inline "N observations" pill and to deep-link
// from the compass page back to the source.
//
// `dismissedAt` is a soft delete: dismissed rows skip the synthesizer pass
// but are kept around as an audit trail so Cem can revisit what the model
// once thought.
export const compassObservations = pgTable(
    'CompassObservations',
    {
        observationId: uuid().primaryKey(),
        // `set null` so an observation outlives a chat message delete — the
        // synthesis already absorbed it. The UI's "open source message"
        // affordance just degrades gracefully when this is null.
        sourceChatMessageId: uuid(),
        // Parallel FK for observations drawn from psychological-interview
        // turns. Same `set null` rationale. Exactly one of
        // `sourceChatMessageId` / `sourceInterviewMessageId` is set per row.
        sourceInterviewMessageId: uuid(),
        category: varchar().$type<CompassObservationCategory>().notNull(),
        content: text().notNull(),
        // Optional 0..1 confidence the analyzer reported. Displayed as a
        // faint indicator on the observation card; never used to filter.
        confidence: integer(),
        analyzerModelId: varchar(),
        dismissedAt: timestamp({ withTimezone: true }),
        createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.sourceChatMessageId],
            foreignColumns: [chatMessages.chatMessageId],
        })
            .onUpdate('cascade')
            .onDelete('set null'),
        foreignKey({
            columns: [table.sourceInterviewMessageId],
            foreignColumns: [compassInterviewMessages.interviewMessageId],
        })
            .onUpdate('cascade')
            .onDelete('set null'),
        index('CompassObservations_category_createdAt_idx').on(table.category, table.createdAt),
        index('CompassObservations_sourceChatMessageId_idx').on(table.sourceChatMessageId),
        index('CompassObservations_sourceInterviewMessageId_idx').on(table.sourceInterviewMessageId),
        index('CompassObservations_createdAt_idx').on(table.createdAt),
    ],
);

export type CompassObservation = typeof compassObservations.$inferSelect;
export type CompassObservationCreate = typeof compassObservations.$inferInsert;

// Tracks which chat messages have already been seen by the analyzer. Keyed
// by `chatMessageId` so re-runs are idempotent — the job handler short-circuits
// when a row already exists. `observationsCreated` records how many rows the
// analyzer produced for this message: zero is a legitimate "looked, nothing
// to log" outcome and distinguishes the message from "not yet processed."
export const compassMessageAnalysis = pgTable(
    'CompassMessageAnalysis',
    {
        chatMessageId: uuid().primaryKey(),
        observationsCreated: integer().notNull().default(0),
        analyzerModelId: varchar(),
        analyzedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.chatMessageId],
            foreignColumns: [chatMessages.chatMessageId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
    ],
);

export type CompassMessageAnalysis = typeof compassMessageAnalysis.$inferSelect;
export type CompassMessageAnalysisCreate = typeof compassMessageAnalysis.$inferInsert;

// Same shape as `CompassMessageAnalysis` but keyed by interview message id —
// the analyzer branches on which one it was enqueued for and picks the right
// idempotency table. Splitting the table (rather than a nullable two-FK
// shape) keeps the PK / cascade trivial and the indexes tight.
export const compassInterviewMessageAnalysis = pgTable(
    'CompassInterviewMessageAnalysis',
    {
        interviewMessageId: uuid().primaryKey(),
        observationsCreated: integer().notNull().default(0),
        analyzerModelId: varchar(),
        analyzedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.interviewMessageId],
            foreignColumns: [compassInterviewMessages.interviewMessageId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
    ],
);

export type CompassInterviewMessageAnalysis = typeof compassInterviewMessageAnalysis.$inferSelect;
export type CompassInterviewMessageAnalysisCreate = typeof compassInterviewMessageAnalysis.$inferInsert;

// --- AdminProject requests --------------------------------------------------------
//
// Verified contact channel for the visitor chat's `submitProjectRequest`
// tool. A visitor who describes a project in the chat lands here in state
// `pendingOtp`; a 6-digit code is emailed to the address they gave; only
// once the matching code comes back does the row flip to `emailVerified` and
// the notification job email Cem the full brief. Spam, impersonation, and
// typos all get caught at the cheapest point — before Cem's inbox.
//
// `otpHash` is `sha256(otp + otpSalt)` with a per-row salt — plaintext OTPs
// never hit the DB, and re-running sha256 on a leaked row without the salt
// is a brute-force across 1M values per row. `otpAttempts` caps at 5 (the
// verify handler archives the row on the 6th wrong submission). 10-minute
// expiry; once consumed (`emailVerified`) the row is no longer accepted by
// verify.
//
// See `docs/features/project-requests.md` for the full state machine and
// `docs/features/chat-email-tools.md` for the chat-tool flow.

export const projectRequestStatuses = ['pendingOtp', 'emailVerified', 'archived'] as const;
export type AdminProjectRequestStatus = (typeof projectRequestStatuses)[number];

export const projectRequestTypes = ['webApp', 'mobile', 'consulting', 'aiIntegration', 'other'] as const;
export type AdminProjectRequestType = (typeof projectRequestTypes)[number];

export const projectRequests = pgTable(
    'AdminProjectRequest',
    {
        projectRequestId: uuid().primaryKey(),
        // Owning visitor chat, when one exists. Set to null if the chat is
        // ever deleted — the row still serves as a historical record of the
        // brief Cem received.
        chatId: uuid(),
        name: varchar().notNull(),
        // The visitor-supplied address. Treated as unverified until
        // `status = 'emailVerified'`; the notification job to Cem refuses
        // to fire until then.
        email: varchar().notNull(),
        company: varchar(),
        projectType: varchar().$type<AdminProjectRequestType>().notNull(),
        description: text().notNull(),
        budget: varchar(),
        timeline: varchar(),
        status: varchar().$type<AdminProjectRequestStatus>().notNull().default('pendingOtp'),
        // `sha256(otp + otpSalt)` — plaintext OTP never stored. The salt is
        // per-row crypto.randomBytes(16) hex, regenerated on every project
        // request, so two requests with the same OTP produce different
        // hashes. The verify handler compares with `crypto.timingSafeEqual`.
        otpHash: varchar().notNull(),
        otpSalt: varchar().notNull(),
        otpExpiresAt: timestamp({ withTimezone: true }).notNull(),
        // Increments per wrong submission. The verify handler archives the
        // row when this would exceed 5, so legitimate fat-fingering survives
        // a handful of typos and brute-force tops out at 5×10^-6.
        otpAttempts: integer().notNull().default(0),
        // Null until verification succeeds; stamped by `toolVerifyProjectRequestOtp`.
        verifiedAt: timestamp({ withTimezone: true }),
        createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.chatId],
            foreignColumns: [chats.chatId],
        })
            .onUpdate('cascade')
            .onDelete('set null'),
        index('AdminProjectRequest_status_createdAt_idx').on(table.status, table.createdAt),
        index('AdminProjectRequest_chatId_idx').on(table.chatId),
    ],
);

export type AdminProjectRequest = typeof projectRequests.$inferSelect;
export type AdminProjectRequestCreate = typeof projectRequests.$inferInsert;

// --- Projects & Tasks --------------------------------------------------------
//
// Workspace-only project tracking. Distinct from the public `/projects`
// portfolio surface (static `portfolioProjects.ts` today, DB-backed in
// Phase 3) — these rows are admin-only, single-language, and shaped for
// triaging incoming `ProjectRequests` plus running ongoing personal work.
//
// `Tasks.projectId` is nullable: a row with `projectId IS NULL` is a
// standalone todo (no parent project), surfaced on the workspace projects
// page's Todos tab. AdminProject-bound tasks cascade away with their project;
// standalone todos live on independently.
//
// See `docs/features/projects-workspace.md`.

export const projectStatuses = ['idea', 'planning', 'active', 'paused', 'done', 'archived'] as const;
export type AdminProjectStatus = (typeof projectStatuses)[number];

export const projects = pgTable(
    'AdminProject',
    {
        projectId: uuid().primaryKey(),
        title: varchar().notNull(),
        // Short single-line summary surfaced on cards in the projects board.
        // Null when the row was hand-created without one — the editor never
        // forces it. Long-form context lives in `notes`.
        description: text(),
        // Long-form markdown notes. Plain text in v1; rendered with the same
        // markdown pipeline used elsewhere when the editor lands a preview.
        notes: text(),
        status: varchar().$type<AdminProjectStatus>().notNull().default('idea'),
        // Within-status ordering. The board reorders inside a single column
        // only in v1 — moving a project across columns is a status change
        // through the editor, not a drag.
        position: integer().notNull().default(0),
        // Source request this project was created from, when applicable.
        // `adminProjectsUpsert` stamps this in the same transaction that
        // archives the request, so the board can render a "Source request"
        // backlink. Null for hand-created projects.
        sourceRequestId: uuid(),
        startedAt: timestamp({ withTimezone: true }),
        completedAt: timestamp({ withTimezone: true }),
        createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.sourceRequestId],
            foreignColumns: [projectRequests.projectRequestId],
        })
            .onUpdate('cascade')
            .onDelete('set null'),
        index('AdminProject_status_position_idx').on(table.status, table.position),
        index('AdminProject_sourceRequestId_idx').on(table.sourceRequestId),
    ],
);

export type AdminProject = typeof projects.$inferSelect;
export type AdminProjectCreate = typeof projects.$inferInsert;

// Task lifecycle. `backlog` is the not-yet-committed holding column; `blocked`
// is work that can't progress until something external clears. Stored as a
// plain `varchar` (not a Postgres enum), so adding a value needs no migration —
// existing rows keep whatever string they held. UI display order lives at the
// call sites, not here.
export const taskStatuses = ['backlog', 'todo', 'doing', 'blocked', 'done'] as const;
export type AdminProjectTaskStatus = (typeof taskStatuses)[number];

// Weight of a task — how much focus it costs to make progress. Optional; a
// null row is unclassified and renders without the effort bar. Drives the
// left-edge color strip on the row card and the composer's default-effort
// picker. See `docs/features/todos-experience.md`.
export const taskEfforts = ['quick', 'focused', 'deep'] as const;
export type AdminProjectTaskEffort = (typeof taskEfforts)[number];

// When the user intends to act on the task, independent of any due date.
// A due date says "must be done by"; the bucket says "I want to do this".
// Optional; null lets the row float in the general list. Drives the top
// filter chips (Heute / Diese Woche / Alles / Warten auf).
export const taskWhenBuckets = ['today', 'week', 'someday', 'waiting'] as const;
export type AdminProjectTaskWhenBucket = (typeof taskWhenBuckets)[number];

export const tasks = pgTable(
    'AdminProjectTask',
    {
        taskId: uuid().primaryKey(),
        // Owning project. Null = standalone todo, surfaced on the Todos tab.
        // On project delete the rows cascade away with the project; standalone
        // rows are unaffected.
        projectId: uuid(),
        title: varchar().notNull(),
        notes: text(),
        status: varchar().$type<AdminProjectTaskStatus>().notNull().default('todo'),
        // Position is scoped per `(projectId, status)` bucket on screen but
        // stored as a single integer per row — reorder rewrites the whole
        // bucket. Standalone todos share the `projectId IS NULL` bucket.
        position: integer().notNull().default(0),
        dueAt: timestamp({ withTimezone: true }),
        completedAt: timestamp({ withTimezone: true }),
        // Perceived weight — quick / focused / deep. Nullable; unclassified
        // rows render without the left-edge effort strip.
        effort: varchar().$type<AdminProjectTaskEffort>(),
        // When the user intends to act. Independent of `dueAt`.
        whenBucket: varchar().$type<AdminProjectTaskWhenBucket>(),
        createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.projectId],
            foreignColumns: [projects.projectId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        index('AdminProjectTask_projectId_position_idx').on(table.projectId, table.position),
        index('AdminProjectTask_status_dueAt_idx').on(table.status, table.dueAt),
    ],
);

export type AdminProjectTask = typeof tasks.$inferSelect;
export type AdminProjectTaskCreate = typeof tasks.$inferInsert;

// --- AdminProject activities ------------------------------------------------------
//
// Unified per-project timeline. One row covers both event-style entries
// (client wrote on Malt, offer sent, call held) and timed work sessions
// produced by the work timer — same shape, different columns populated.
//
// For event rows: `occurredAt` is when it happened, `durationSec` is optional
// and lets Cem record "the call was 45 min" without running a timer. The
// `startedAt` / `endedAt` columns stay null.
//
// For work-timer rows: `kind = 'work'`, `startedAt = occurredAt`, `endedAt`
// is null while the timer runs and stamped on stop. `durationSec` is a cached
// `endedAt - startedAt` so the sum query stays index-only.
//
// `channel` is meaningful only for `clientContact` / `meeting` rows; the UI
// hides it for other kinds. Stored as plain varchar against the enum list
// below so adding a channel later is a schema-free deploy.
//
// The partial unique index `(endedAt IS NULL) WHERE kind = 'work'` enforces
// the one-global-active-timer invariant at the DB level — even with two tabs
// open, the second `adminProjectTimersStart` raises a unique-violation that the
// command handler catches and retries after stopping the existing timer.
//
// See `docs/features/projects-workspace.md`.

export const projectActivityKinds = ['clientContact', 'meeting', 'work', 'offer', 'milestone', 'note'] as const;
export type AdminProjectActivityKind = (typeof projectActivityKinds)[number];

export const projectActivityChannels = ['malt', 'email', 'phone', 'videoCall', 'inPerson', 'aiAssistant', 'other'] as const;
export type AdminProjectActivityChannel = (typeof projectActivityChannels)[number];

// Sidedness of an activity row. Drives the chat-style timeline layout on the
// project detail page — `outgoing` rows render right-aligned (from Cem),
// `incoming` rows left-aligned (from the client), `internal` rows render as
// centered system markers (work sessions, freeform notes, milestones).
//
// `work` and `note` kinds always carry `internal`; `milestone` is also
// `internal` by convention (a milestone is a marker, not a turn). The editor
// only surfaces a direction picker for `clientContact`, `meeting`, and
// `offer`; for the implicit kinds the command normalizes to `internal`
// regardless of what the client sent.
export const projectActivityDirections = ['outgoing', 'incoming', 'internal'] as const;
export type AdminProjectActivityDirection = (typeof projectActivityDirections)[number];

// Offer-row state. Meaningful only when `kind = 'offer'`; the UI hides the
// pill for other kinds. A withdrawn offer keeps the row for history.
export const projectOfferStatuses = ['sent', 'accepted', 'rejected', 'withdrawn'] as const;
export type AdminProjectOfferStatus = (typeof projectOfferStatuses)[number];

export const projectActivities = pgTable(
    'AdminProjectActivity',
    {
        activityId: uuid().primaryKey(),
        projectId: uuid().notNull(),
        // Optional link to a specific task — lets totals roll up per task
        // without forcing every activity to pick one. Cascade-set-null on
        // task delete so removing a task doesn't shred its history.
        taskId: uuid(),
        kind: varchar().$type<AdminProjectActivityKind>().notNull(),
        // Communication channel; null when kind is `work` / `offer` /
        // `milestone` / `note`. Free to fill for `clientContact` / `meeting`.
        channel: varchar().$type<AdminProjectActivityChannel>(),
        // Sidedness — drives the chat-style timeline. `outgoing` = Cem,
        // `incoming` = client, `internal` = system markers (work / note /
        // milestone). Defaulted at the command layer so existing rows backfill
        // sensibly via the migration default.
        direction: varchar().$type<AdminProjectActivityDirection>().notNull().default('internal'),
        // Optional one-line heading. Timer rows ("Work session") and
        // agent-authored entries still set it; the manual composer leaves it
        // null and writes the single free-form summary into `notes` instead
        // (see docs/features/workspace-projects.md — "Activity timeline").
        title: varchar(),
        notes: text(),
        // When the event happened (call start, email send). For timer rows
        // this equals `startedAt`. The timeline orders strictly on this column.
        occurredAt: timestamp({ withTimezone: true }).notNull(),
        // Set on work-timer rows; null on event rows.
        startedAt: timestamp({ withTimezone: true }),
        // Null while a timer is running; stamped by `adminProjectTimersStop`.
        endedAt: timestamp({ withTimezone: true }),
        // Cached `endedAt - startedAt` in seconds, written on stop. Also
        // settable directly on event rows when Cem logs a known duration
        // ("the call was 45 min") without running a timer.
        durationSec: integer(),
        // Offer-specific fields. Only meaningful when `kind = 'offer'`; the
        // editor hides them for other kinds. `amountCents` is integer cents
        // in EUR (single-currency assumption in v1); no rounding ambiguity.
        // `offerStatus` tracks the lifecycle the offer went through after
        // being logged.
        amountCents: integer(),
        offerStatus: varchar().$type<AdminProjectOfferStatus>(),
        createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.projectId],
            foreignColumns: [projects.projectId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        foreignKey({
            columns: [table.taskId],
            foreignColumns: [tasks.taskId],
        })
            .onUpdate('cascade')
            .onDelete('set null'),
        index('AdminProjectActivity_projectId_occurredAt_idx').on(table.projectId, table.occurredAt),
        index('AdminProjectActivity_taskId_idx').on(table.taskId),
        // Partial unique enforces the single-active-timer invariant. The
        // `kind = 'work' AND endedAt IS NULL` predicate matches at most one
        // row across the whole table; a concurrent second start fails fast.
        uniqueIndex('AdminProjectActivity_singleActiveTimer_uniq')
            .on(table.kind)
            .where(sql`${table.endedAt} IS NULL AND ${table.kind} = 'work'`),
    ],
);

export type AdminProjectActivity = typeof projectActivities.$inferSelect;
export type AdminProjectActivityCreate = typeof projectActivities.$inferInsert;

// --- AdminProject links & files ---------------------------------------------------
//
// First-class resources hanging off a project: external URLs (repo, Malt
// mission, Figma file, client portal, shared drive) and uploaded files
// (offer PDFs, signed contracts, invoices, screenshots). Each row optionally
// references the `AdminProjectActivity` it was "born from" — when a link or file
// is added at the moment of logging "sent offer", `activityId` points at
// that activity and the timeline row renders the chip inline. Adding the
// resource directly at project level leaves `activityId` null.
//
// `pinned` is the hoisting mechanism: pinned rows surface in the project
// detail header's pinned rail; the full list always lives on the Links /
// Files tab. One row, two surfaces — no duplication.
//
// Files reuse the shared `fileUploads` table (see line ~454). Cascade on
// `fileUploadId` delete removes the project-file join row; cascade on
// project delete cleans up join rows but leaves the underlying upload
// blob in place (cleaned up later by the user-row cascade). See
// `docs/architecture/file-storage.md`.
//
// See `docs/features/projects-workspace.md`.

export const projectLinkKinds = ['github', 'malt', 'figma', 'gdrive', 'notion', 'invoice', 'offer', 'other'] as const;
export type AdminProjectLinkKind = (typeof projectLinkKinds)[number];

export const projectLinks = pgTable(
    'AdminProjectLink',
    {
        projectLinkId: uuid().primaryKey(),
        projectId: uuid().notNull(),
        // Activity this link was born from, if any. Cascade-set-null on
        // activity delete so removing the timeline entry doesn't shred the
        // link — it just detaches and stays available on the Links tab.
        activityId: uuid(),
        url: varchar().notNull(),
        // Human label for the link card. Null falls back to the URL host.
        label: varchar(),
        kind: varchar().$type<AdminProjectLinkKind>().notNull().default('other'),
        // True surfaces this link in the project detail header's pinned rail.
        // The full list always renders on the Links tab regardless of `pinned`.
        pinned: boolean().notNull().default(false),
        createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.projectId],
            foreignColumns: [projects.projectId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        foreignKey({
            columns: [table.activityId],
            foreignColumns: [projectActivities.activityId],
        })
            .onUpdate('cascade')
            .onDelete('set null'),
        index('AdminProjectLink_projectId_pinned_idx').on(table.projectId, table.pinned),
        index('AdminProjectLink_activityId_idx').on(table.activityId),
    ],
);

export type AdminProjectLink = typeof projectLinks.$inferSelect;
export type AdminProjectLinkCreate = typeof projectLinks.$inferInsert;

export const projectFileKinds = ['offer', 'invoice', 'contract', 'screenshot', 'other'] as const;
export type AdminProjectFileKind = (typeof projectFileKinds)[number];

export const projectFiles = pgTable(
    'AdminProjectFile',
    {
        projectFileId: uuid().primaryKey(),
        projectId: uuid().notNull(),
        // Activity this file was born from, if any. Same semantics as
        // `projectLinks.activityId` — cascade-set-null on activity delete.
        activityId: uuid(),
        // The underlying upload row. Cascade on delete: removing the upload
        // removes the join. The upload itself is owned by the user that
        // posted it and lives on `fileUploads`.
        fileUploadId: uuid().notNull(),
        label: varchar(),
        kind: varchar().$type<AdminProjectFileKind>().notNull().default('other'),
        pinned: boolean().notNull().default(false),
        createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.projectId],
            foreignColumns: [projects.projectId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        foreignKey({
            columns: [table.activityId],
            foreignColumns: [projectActivities.activityId],
        })
            .onUpdate('cascade')
            .onDelete('set null'),
        foreignKey({
            columns: [table.fileUploadId],
            foreignColumns: [fileUploads.fileUploadId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        index('AdminProjectFile_projectId_pinned_idx').on(table.projectId, table.pinned),
        index('AdminProjectFile_activityId_idx').on(table.activityId),
        index('AdminProjectFile_fileUploadId_idx').on(table.fileUploadId),
    ],
);

export type AdminProjectFile = typeof projectFiles.$inferSelect;
export type AdminProjectFileCreate = typeof projectFiles.$inferInsert;

// --- Workspace files ---------------------------------------------------------
//
// Standalone markdown documents the assistant drafts from chat and the admin
// edits in the workspace document panel (Claude-artifact style). Unlike
// `AdminProjectFile`, these are not tied to a project — they belong directly to
// the user. The bytes live on the shared `fileUploads` table (markdown only);
// this row carries the metadata + a stable `fileUploadId` (the update path
// rewrites the upload's bytes in place so the download URL never changes). See
// `docs/features/workspace-files.md`.
export const workspaceFiles = pgTable(
    'WorkspaceFile',
    {
        workspaceFileId: uuid().primaryKey(),
        userId: uuid().notNull(),
        fileUploadId: uuid().notNull(),
        filename: varchar().notNull(),
        label: varchar(),
        createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.userId],
            foreignColumns: [users.userId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        foreignKey({
            columns: [table.fileUploadId],
            foreignColumns: [fileUploads.fileUploadId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        index('WorkspaceFile_userId_idx').on(table.userId),
        index('WorkspaceFile_fileUploadId_idx').on(table.fileUploadId),
    ],
);

export type WorkspaceFile = typeof workspaceFiles.$inferSelect;
export type WorkspaceFileCreate = typeof workspaceFiles.$inferInsert;

// --- Media -------------------------------------------------------------------
//
// `Movies`, `Shows`, and `MediaChannels` back `/workspace/media`. Admin-only,
// `noindex` surface — no `*De`/`*En` pairs, following the `Projects` / `Tasks`
// convention (see `docs/architecture/content-model.md`).
//
// `topics` is a Postgres `text[]` on movies / shows / channels — the clustering
// axis for channels ("tech", "movieCritic", "entertainment") and free-form
// genre tags on titles. Mirrors `cvExperience.technologies`: display chips +
// `ANY(topics)` filter for cross-view reads (e.g. `/workspace/software`
// pulling `mediaChannelsByTopic("tech")`). The `mediaTopics` const array below
// is the *known* vocabulary the UI autocomplete and `AdminMediaTopic` GraphQL enum
// surface; the column itself accepts any string so the enum can grow without a
// migration.

export const movieStatuses = ['watchlist', 'watching', 'watched', 'dropped'] as const;
export type AdminMediaMovieStatus = (typeof movieStatuses)[number];

export const mediaPlatforms = ['youtube', 'twitch', 'podcast', 'other'] as const;
export type AdminMediaPlatform = (typeof mediaPlatforms)[number];

export const mediaTopics = [
    'tech',
    'ai',
    'software',
    'gaming',
    'movieCritic',
    'entertainment',
    'comedy',
    'science',
    'business',
    'finance',
    'news',
    'music',
    'sports',
    'lifestyle',
    'education',
] as const;
export type AdminMediaTopic = (typeof mediaTopics)[number];

// `tmdbId` is UNIQUE-nullable: multiple manually-entered movies can coexist
// (all NULL) but a TMDB-sourced movie is de-duplicated across re-adds.
// `posterUrl` / `backdropUrl` are cached CDN URLs from TMDB, not local uploads —
// see `docs/features/workspace-media.md` for the "no local blob storage"
// rationale. `rating` is 1..10, admin's own; movie-critic ratings live off-DB.
export const movies = pgTable(
    'AdminMediaMovie',
    {
        movieId: uuid().primaryKey(),
        title: varchar().notNull(),
        tmdbId: integer(),
        posterUrl: varchar(),
        backdropUrl: varchar(),
        releaseDate: date(),
        runtimeMinutes: integer(),
        overview: text(),
        status: varchar().$type<AdminMediaMovieStatus>().notNull().default('watchlist'),
        rating: integer(),
        watchedAt: timestamp({ withTimezone: true }),
        notes: text(),
        topics: text().array().notNull().default([]),
        createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [uniqueIndex('AdminMediaMovie_tmdbId_key').on(table.tmdbId), index('AdminMediaMovie_status_idx').on(table.status)],
);

export type AdminMediaMovie = typeof movies.$inferSelect;
export type AdminMediaMovieCreate = typeof movies.$inferInsert;

// TV series tracked on `/workspace/media` (Serien tab). Same watch-status
// vocabulary as `Movies`, plus series-specific tracking: whether the show has
// ended (`isCompleted`) and when the next season lands — either an exact
// `nextSeasonReleaseDate` or a free-form `nextSeasonReleaseRough` ("Fall 2026",
// "Q3 2027"). Both date fields can coexist (exact when known, rough as a
// fallback label). See `docs/features/workspace-media.md`.
export const shows = pgTable(
    'AdminMediaShow',
    {
        showId: uuid().primaryKey(),
        title: varchar().notNull(),
        tmdbId: integer(),
        posterUrl: varchar(),
        backdropUrl: varchar(),
        firstAirDate: date(),
        overview: text(),
        status: varchar().$type<AdminMediaMovieStatus>().notNull().default('watchlist'),
        rating: integer(),
        notes: text(),
        topics: text().array().notNull().default([]),
        isCompleted: boolean().notNull().default(false),
        nextSeasonReleaseDate: date(),
        nextSeasonReleaseRough: varchar(),
        createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [uniqueIndex('AdminMediaShow_tmdbId_key').on(table.tmdbId), index('AdminMediaShow_status_idx').on(table.status)],
);

export type AdminMediaShow = typeof shows.$inferSelect;
export type AdminMediaShowCreate = typeof shows.$inferInsert;

// `priority` orders channels within a topic section on the editor (drag-reorder
// via `useReorderableList`). Reorder is not delta-based — the command rewrites
// every priority in one txn, matching the CV pattern
// (`docs/architecture/content-model.md`).
export const mediaChannels = pgTable(
    'AdminMediaChannel',
    {
        channelId: uuid().primaryKey(),
        name: varchar().notNull(),
        platform: varchar().$type<AdminMediaPlatform>().notNull().default('youtube'),
        url: varchar().notNull(),
        handle: varchar(),
        avatarUrl: varchar(),
        description: text(),
        topics: text().array().notNull().default([]),
        priority: integer().notNull().default(0),
        notes: text(),
        createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [index('AdminMediaChannel_priority_idx').on(table.priority)],
);

export type AdminMediaChannel = typeof mediaChannels.$inferSelect;
export type AdminMediaChannelCreate = typeof mediaChannels.$inferInsert;

// --- Medical -----------------------------------------------------------------
//
// `MedicalAppointments`, `MedicalRecords`, and `MedicalRecordFiles` back
// `/workspace/medical`. Admin-only, `noindex`; no `*De`/`*En` pairs (matches
// Media / Inventory). See `docs/features/workspace-medical.md`.
//
// The feature has two purposes:
//   - **Health journal** — `MedicalRecords` are chat-authored write-ups born
//     from conversations with the personal assistant ("I have a red patch on
//     my forearm…"). The medical sub-agent asks clarifiers, then files a
//     structured record with symptoms / body areas / severity / free-form
//     summary. Optionally attaches photos (join → `FileUploads`).
//   - **Appointment tracker** — `MedicalAppointments` are scheduled or
//     completed visits with a provider. Grouped by `category` (dentist, GP,
//     dermatology, …). "When is my next dentist visit?" reads
//     `nextDueAt ?? lastCompletedAt + defaultCadence` — the cadence lives as
//     a static config (`medicalCategoryCadence.ts`), not a table.
//
// Records and appointments cross-link: a record can reference the appointment
// that produced it (or vice-versa a follow-up appointment can be filed from a
// record). The FK is nullable and `set null` on appointment delete so records
// survive appointment cleanup.

export const medicalCategories = ['dentist', 'gp', 'dermatology', 'eyes', 'mentalHealth', 'ent', 'physio', 'other'] as const;
export type AdminMedicalCategory = (typeof medicalCategories)[number];

export const medicalAppointmentStatuses = ['scheduled', 'completed', 'cancelled', 'missed'] as const;
export type AdminMedicalAppointmentStatus = (typeof medicalAppointmentStatuses)[number];

export const medicalRecordSeverities = ['info', 'mild', 'moderate', 'severe'] as const;
export type AdminMedicalRecordSeverity = (typeof medicalRecordSeverities)[number];

// A scheduled or completed appointment with a provider. `providerName` is
// free-text (no dedicated `MedicalProvider` table in v1 — see the feature
// doc for the deferred-provider-directory rationale). `scheduledAt` is the
// intended time; `completedAt` stamps when the visit actually happened.
// `nextDueAt` is an explicit override for the "next visit" question — when
// absent, the category's default cadence applies.
export const medicalAppointments = pgTable(
    'AdminMedicalAppointment',
    {
        appointmentId: uuid().primaryKey(),
        category: varchar().$type<AdminMedicalCategory>().notNull().default('other'),
        providerName: varchar(),
        title: varchar().notNull(),
        notes: text(),
        scheduledAt: timestamp({ withTimezone: true }).notNull(),
        completedAt: timestamp({ withTimezone: true }),
        nextDueAt: timestamp({ withTimezone: true }),
        status: varchar().$type<AdminMedicalAppointmentStatus>().notNull().default('scheduled'),
        topics: text().array().notNull().default([]),
        createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        index('AdminMedicalAppointment_category_idx').on(table.category),
        index('AdminMedicalAppointment_scheduledAt_idx').on(table.scheduledAt),
    ],
);

export type AdminMedicalAppointment = typeof medicalAppointments.$inferSelect;
export type AdminMedicalAppointmentCreate = typeof medicalAppointments.$inferInsert;

// A health-journal entry, usually authored by the medical sub-agent from a
// chat conversation. `summary` is the agent's structured writeup;
// `symptoms` / `bodyAreas` are free-form `text[]` so the vocabulary can grow
// without migrations (mirrors `Movies.topics`). `appointmentId` is optional
// — a record can reference the appointment that produced it (or a future
// follow-up); on appointment delete the FK is nulled so the record survives.
export const medicalRecords = pgTable(
    'AdminMedicalRecord',
    {
        recordId: uuid().primaryKey(),
        category: varchar().$type<AdminMedicalCategory>().notNull().default('other'),
        title: varchar().notNull(),
        summary: text().notNull(),
        severity: varchar().$type<AdminMedicalRecordSeverity>(),
        symptoms: text().array().notNull().default([]),
        bodyAreas: text().array().notNull().default([]),
        occurredAt: timestamp({ withTimezone: true }),
        resolvedAt: timestamp({ withTimezone: true }),
        appointmentId: uuid(),
        topics: text().array().notNull().default([]),
        createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.appointmentId],
            foreignColumns: [medicalAppointments.appointmentId],
        })
            .onUpdate('cascade')
            .onDelete('set null'),
        index('AdminMedicalRecord_category_idx').on(table.category),
        index('AdminMedicalRecord_appointmentId_idx').on(table.appointmentId),
        index('AdminMedicalRecord_occurredAt_idx').on(table.occurredAt),
    ],
);

export type AdminMedicalRecord = typeof medicalRecords.$inferSelect;
export type AdminMedicalRecordCreate = typeof medicalRecords.$inferInsert;

// Join row pinning `FileUploads` to a medical record — the "attach the photo
// you sent in chat to this dermatology record" wire. Mirrors `ItemFiles` and
// `ProjectFiles`: the raw bytes live once in `FileUploads`, this row is the
// domain-specific reference. On record delete the join cascades; on upload
// delete the join also cascades (the file was the anchor, so losing it means
// the reference is meaningless).
export const medicalRecordFiles = pgTable(
    'AdminMedicalRecordFile',
    {
        recordFileId: uuid().primaryKey(),
        recordId: uuid().notNull(),
        fileUploadId: uuid().notNull(),
        label: varchar(),
        pinned: boolean().notNull().default(false),
        createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.recordId],
            foreignColumns: [medicalRecords.recordId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        foreignKey({
            columns: [table.fileUploadId],
            foreignColumns: [fileUploads.fileUploadId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        index('AdminMedicalRecordFile_recordId_pinned_idx').on(table.recordId, table.pinned),
        index('AdminMedicalRecordFile_fileUploadId_idx').on(table.fileUploadId),
    ],
);

export type AdminMedicalRecordFile = typeof medicalRecordFiles.$inferSelect;
export type AdminMedicalRecordFileCreate = typeof medicalRecordFiles.$inferInsert;

// --- Inventory ---------------------------------------------------------------
//
// `Items` and its satellites (`ItemValuations`, `ItemServiceEntries`,
// `ItemFiles`) back `/workspace/inventory`. Admin-only, `noindex` — no
// `*De`/`*En` pairs, matching Media / Projects / Tasks. See
// `docs/features/workspace-inventory.md`.
//
// The design intentionally splits three concerns onto their own tables:
//   - **Valuations** are a journal so material net worth can be plotted over
//     time; the current value is *also* cached on the `Items` row
//     (`currentValueCents`) so the list surface and the finances-overview
//     tile read it without touching the journal.
//   - **Service entries** are events (service / repair / replacement), with
//     an optional `nextDueAt` reminder. Independent of warranty.
//   - **Files** reuse the existing `FileUploads` table (bytea in Postgres —
//     no S3), following the `ProjectFiles` shape. A file can optionally
//     attach to a specific service entry (e.g. an invoice).
//
// Category taxonomy stays hard-coded (`itemCategories` below) — the media
// convention for known-vocabulary enums. A new category is a one-line change
// here plus a mirror in the `AdminInventoryItemCategory` GraphQL enum. If categories ever
// need to be user-editable, elevate to a `ItemCategories` table.

export const itemCategories = [
    'electronics',
    'appliance',
    'kitchen',
    'furniture',
    'vehicle',
    'clothing',
    'tool',
    'sports',
    'other',
] as const;
export type AdminInventoryItemCategory = (typeof itemCategories)[number];

export const itemConditions = ['new', 'likeNew', 'good', 'fair', 'poor'] as const;
export type AdminInventoryItemCondition = (typeof itemConditions)[number];

export const itemDisposalStates = ['owned', 'sold', 'gifted', 'lost', 'disposed'] as const;
export type AdminInventoryItemDisposalState = (typeof itemDisposalStates)[number];

export const itemServiceKinds = ['service', 'repair', 'replacement', 'other'] as const;
export type AdminInventoryItemServiceKind = (typeof itemServiceKinds)[number];

export const itemFileKinds = ['photo', 'receipt', 'warranty', 'manual', 'invoice', 'other'] as const;
export type AdminInventoryItemFileKind = (typeof itemFileKinds)[number];

// `currentValueCents` is a cached snapshot of the latest `ItemValuations` row
// so the list surface and finances tile never need to `MAX(valuedAt)` at
// query time. The `adminInventoryItemsReprice` command is the single writer: journal insert
// + this cache update in one transaction.
export const items = pgTable(
    'AdminInventoryItem',
    {
        itemId: uuid().primaryKey(),
        categoryKey: varchar().$type<AdminInventoryItemCategory>().notNull().default('other'),
        name: varchar().notNull(),
        brand: varchar(),
        model: varchar(),
        serialNumber: varchar(),
        purchasedAt: date(),
        purchasePriceCents: integer(),
        currentValueCents: integer(),
        condition: varchar().$type<AdminInventoryItemCondition>(),
        disposalState: varchar().$type<AdminInventoryItemDisposalState>().notNull().default('owned'),
        disposedAt: timestamp({ withTimezone: true }),
        warrantyEndsAt: date(),
        warrantyProvider: varchar(),
        warrantyNotes: text(),
        notes: text(),
        createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        index('AdminInventoryItem_disposalState_idx').on(table.disposalState),
        index('AdminInventoryItem_warrantyEndsAt_idx').on(table.warrantyEndsAt),
        index('AdminInventoryItem_categoryKey_idx').on(table.categoryKey),
    ],
);

export type AdminInventoryItem = typeof items.$inferSelect;
export type AdminInventoryItemCreate = typeof items.$inferInsert;

// Repricing journal. `adminInventoryItemsReprice` writes one row here and updates the cached
// `items.currentValueCents` in the same transaction. `valuedAt` defaults to
// now but is settable — an appraisal from last month can be back-dated.
export const itemValuations = pgTable(
    'AdminInventoryItemValuation',
    {
        valuationId: uuid().primaryKey(),
        itemId: uuid().notNull(),
        valueCents: integer().notNull(),
        valuedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
        note: text(),
        createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.itemId],
            foreignColumns: [items.itemId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        index('AdminInventoryItemValuation_itemId_valuedAt_idx').on(table.itemId, table.valuedAt),
    ],
);

export type AdminInventoryItemValuation = typeof itemValuations.$inferSelect;
export type AdminInventoryItemValuationCreate = typeof itemValuations.$inferInsert;

// Service events on an item — services, repairs, replacements, other. The
// optional `nextDueAt` drives a "next service due" reminder computed by the
// list query. Independent of warranty; both live on the item and are
// surfaced side-by-side on the detail page.
export const itemServiceEntries = pgTable(
    'AdminInventoryItemServiceEntry',
    {
        serviceEntryId: uuid().primaryKey(),
        itemId: uuid().notNull(),
        kind: varchar().$type<AdminInventoryItemServiceKind>().notNull().default('service'),
        performedAt: date().notNull(),
        vendor: varchar(),
        costCents: integer(),
        notes: text(),
        nextDueAt: date(),
        createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.itemId],
            foreignColumns: [items.itemId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        index('AdminInventoryItemServiceEntry_itemId_performedAt_idx').on(table.itemId, table.performedAt),
    ],
);

export type AdminInventoryItemServiceEntry = typeof itemServiceEntries.$inferSelect;
export type AdminInventoryItemServiceEntryCreate = typeof itemServiceEntries.$inferInsert;

// Join row pinning `FileUploads` to an item (and optionally a specific
// service entry, e.g. an invoice). Mirrors `projectFiles`: the underlying
// upload is owned by the user that posted it and lives on `fileUploads`; on
// service-entry delete the join's `serviceEntryId` sets to null (the file
// still belongs to the item), on upload delete the whole join cascades.
export const itemFiles = pgTable(
    'AdminInventoryItemFile',
    {
        itemFileId: uuid().primaryKey(),
        itemId: uuid().notNull(),
        serviceEntryId: uuid(),
        fileUploadId: uuid().notNull(),
        label: varchar(),
        kind: varchar().$type<AdminInventoryItemFileKind>().notNull().default('other'),
        pinned: boolean().notNull().default(false),
        createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.itemId],
            foreignColumns: [items.itemId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        foreignKey({
            columns: [table.serviceEntryId],
            foreignColumns: [itemServiceEntries.serviceEntryId],
        })
            .onUpdate('cascade')
            .onDelete('set null'),
        foreignKey({
            columns: [table.fileUploadId],
            foreignColumns: [fileUploads.fileUploadId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        index('AdminInventoryItemFile_itemId_pinned_idx').on(table.itemId, table.pinned),
        index('AdminInventoryItemFile_serviceEntryId_idx').on(table.serviceEntryId),
        index('AdminInventoryItemFile_fileUploadId_idx').on(table.fileUploadId),
    ],
);

export type AdminInventoryItemFile = typeof itemFiles.$inferSelect;
export type AdminInventoryItemFileCreate = typeof itemFiles.$inferInsert;

// Content-addressed cache for `/api/tts` audio. The primary key is a
// SHA-256 hex of `${text}|${voice}|${model}|${format}` — identical inputs
// produce the same key, so re-listening to a message is a plain SELECT and
// skips Gemini entirely.
//
// Not a consumer of `FileUploads`: those rows are user-owned (cascade on user
// delete, download route gates on `userId`), while TTS bytes are anonymous
// and shared across sessions. A dedicated table keeps the ownership model
// clean.
//
// `format` is carried both in the column and in the hash so a format
// migration (e.g. WAV → MP3) never collides with older rows — old rows
// simply become unreachable and can be dropped by a future eviction job.
export const ttsAudioCache = pgTable('TtsAudioCache', {
    contentHash: text().primaryKey(),
    mediaType: varchar().notNull(),
    voice: varchar().notNull(),
    model: varchar().notNull(),
    format: varchar().notNull(),
    size: integer().notNull(),
    bytes: bytea().notNull(),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    lastAccessedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
});

export type TtsAudioCacheRow = typeof ttsAudioCache.$inferSelect;
export type TtsAudioCacheCreate = typeof ttsAudioCache.$inferInsert;

// --- Travel -----------------------------------------------------------------
//
// `AdminTravelTrip` and its satellites (`AdminTravelTripDay`,
// `AdminTravelTripActivity`, `AdminTravelTripPackingItem`) back
// `/workspace/travel`. Admin-only, `noindex` — no `*De`/`*En` pairs, matching
// Media / Medical / Inventory / Projects. Every table carries the `AdminTravel`
// entity-access-path prefix so the physical name matches its GraphQL type — see
// `docs/conventions.md` ("Type & input naming"). See
// `docs/features/workspace-travel.md`.
//
// The three-tier shape (trip → days → activities) exists so the AI assistant
// can persist a day-by-day itinerary from a chat session — future chats read
// the plan from the DB instead of the transcript. `AdminTravelTripDay` is a
// first-class bucket (rather than each activity carrying its own date) so
// "Day 3 in Rome" reads well both in the agent's tool calls and in the UI.
//
// `AdminTravelTripPackingItem` rows are trip-scoped for v1. A reusable base
// template is a follow-up — see the feature doc's Future Work.
//
// Two things are deliberately NOT stored, because they duplicate facts already
// present and would drift (see the feature doc's "Trip shape" section):
//   - A day's calendar date — derived from `startsOn + (dayNumber - 1)`, so
//     `dayNumber` is the single ordering key and the date can never disagree
//     with the trip's range.
//   - The trip's time-phase (upcoming / underway / past) — derived from the
//     stored `startsOn`/`endsOn` range. `status` therefore carries only
//     planning intent (`draft` / `planned` / `cancelled`), not "active" or
//     "completed", which were pure functions of the dates.

export const tripStatuses = ['draft', 'planned', 'cancelled'] as const;
export type AdminTravelTripStatus = (typeof tripStatuses)[number];

export const transportModes = ['flight', 'train', 'car', 'ferry', 'mixed'] as const;
export type AdminTravelTransportMode = (typeof transportModes)[number];

export const trips = pgTable(
    'AdminTravelTrip',
    {
        tripId: uuid().primaryKey(),
        title: varchar().notNull(),
        destination: varchar().notNull(),
        startsOn: date(),
        endsOn: date(),
        status: varchar().$type<AdminTravelTripStatus>().notNull().default('draft'),
        transportMode: varchar().$type<AdminTravelTransportMode>(),
        accommodation: text(),
        notes: text(),
        createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [index('AdminTravelTrip_status_idx').on(table.status), index('AdminTravelTrip_startsOn_idx').on(table.startsOn)],
);

export type AdminTravelTrip = typeof trips.$inferSelect;
export type AdminTravelTripCreate = typeof trips.$inferInsert;

// A day within a trip. `dayNumber` is the 1-based ordinal and the single
// ordering key ("Day 3"), used by the agent and the UI. There is no stored
// calendar date: for a dated trip the date is derived from the trip's
// `startsOn` plus this day's `dayNumber`; a dateless "sketch" trip has no
// date at all. `summary` holds the AI-written paragraph describing the day at
// a glance; `title` is a shorter label ("Colosseum + Trastevere").
export const tripDays = pgTable(
    'AdminTravelTripDay',
    {
        tripDayId: uuid().primaryKey(),
        tripId: uuid().notNull(),
        dayNumber: integer().notNull(),
        title: varchar(),
        summary: text(),
        createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.tripId],
            foreignColumns: [trips.tripId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        uniqueIndex('AdminTravelTripDay_tripId_dayNumber_uniq').on(table.tripId, table.dayNumber),
        index('AdminTravelTripDay_tripId_idx').on(table.tripId),
    ],
);

export type AdminTravelTripDay = typeof tripDays.$inferSelect;
export type AdminTravelTripDayCreate = typeof tripDays.$inferInsert;

// An activity slotted into a `TripDay`. Times are stored as wall-clock only
// (`time` — the trip is location-scoped, so a single tz would be a lie); the
// UI pairs them with the day's derived date for display. `position` orders
// activities within a day when times are missing or equal.
export const tripActivities = pgTable(
    'AdminTravelTripActivity',
    {
        tripActivityId: uuid().primaryKey(),
        tripDayId: uuid().notNull(),
        position: integer().notNull().default(0),
        startsAt: varchar({ length: 8 }),
        endsAt: varchar({ length: 8 }),
        title: varchar().notNull(),
        location: varchar(),
        url: varchar(),
        notes: text(),
        createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.tripDayId],
            foreignColumns: [tripDays.tripDayId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        index('AdminTravelTripActivity_tripDayId_position_idx').on(table.tripDayId, table.position),
    ],
);

export type AdminTravelTripActivity = typeof tripActivities.$inferSelect;
export type AdminTravelTripActivityCreate = typeof tripActivities.$inferInsert;

// Trip-scoped packing checklist. `category` is free text (Documents,
// Electronics, Clothing …) — a known vocabulary lives in
// `travelPackingCategories` and the UI groups by it, but the column stays
// text so the agent can invent a new bucket without a migration.
export const tripPackingItems = pgTable(
    'AdminTravelTripPackingItem',
    {
        tripPackingItemId: uuid().primaryKey(),
        tripId: uuid().notNull(),
        category: varchar().notNull().default('Other'),
        label: varchar().notNull(),
        quantity: integer().notNull().default(1),
        packed: boolean().notNull().default(false),
        position: integer().notNull().default(0),
        notes: text(),
        createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.tripId],
            foreignColumns: [trips.tripId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        index('AdminTravelTripPackingItem_tripId_category_position_idx').on(table.tripId, table.category, table.position),
    ],
);

export type AdminTravelTripPackingItem = typeof tripPackingItems.$inferSelect;
export type AdminTravelTripPackingItemCreate = typeof tripPackingItems.$inferInsert;

// --- Finances ---------------------------------------------------------------
//
// `FinanceRecurringCosts` + `FinanceIncomeStreams` back `/workspace/finances`.
// Admin-only, `noindex` — no `*De`/`*En` pairs, no per-row `userId` (the
// `User.admin` / `Mutation.admin` gate authorizes). One row per repeating
// charge (rent, insurance, subscription, …) and one row per income stream
// (salary, freelance, …). `amountCents` is the amount **per `cadence`**, so
// the page-level Monthly / Yearly toggle is deterministic projection over the
// same rows — no dated transactions in v1. See
// `docs/features/workspace-finances.md`.

export const financeRecurringCostCategories = [
    'housing',
    'connectivity',
    'transport',
    'insurance',
    'subscriptionsEntertainment',
    'subscriptionsWork',
    'memberships',
    'donations',
    'household',
    'savingsGeneral',
    'savingsVacation',
    'other',
] as const;
export type AdminFinancesRecurringCostCategory = (typeof financeRecurringCostCategories)[number];

export const financeCadences = ['monthly', 'yearly'] as const;
export type AdminFinancesCadence = (typeof financeCadences)[number];

export const financeRecurringCosts = pgTable(
    'AdminFinancesRecurringCost',
    {
        costId: uuid().primaryKey(),
        name: varchar().notNull(),
        categoryKey: varchar().$type<AdminFinancesRecurringCostCategory>().notNull().default('other'),
        amountCents: integer().notNull(),
        cadence: varchar().$type<AdminFinancesCadence>().notNull().default('monthly'),
        currency: varchar({ length: 3 }).notNull().default('EUR'),
        notes: text(),
        active: boolean().notNull().default(true),
        startsOn: date(),
        endsOn: date(),
        createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        index('AdminFinancesRecurringCost_categoryKey_idx').on(table.categoryKey),
        index('AdminFinancesRecurringCost_active_idx').on(table.active),
    ],
);

export type AdminFinancesRecurringCost = typeof financeRecurringCosts.$inferSelect;
export type AdminFinancesRecurringCostCreate = typeof financeRecurringCosts.$inferInsert;

export const financeIncomeStreams = pgTable(
    'AdminFinancesIncomeStream',
    {
        incomeStreamId: uuid().primaryKey(),
        name: varchar().notNull(),
        amountCents: integer().notNull(),
        cadence: varchar().$type<AdminFinancesCadence>().notNull().default('monthly'),
        currency: varchar({ length: 3 }).notNull().default('EUR'),
        notes: text(),
        active: boolean().notNull().default(true),
        startsOn: date(),
        endsOn: date(),
        createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [index('AdminFinancesIncomeStream_active_idx').on(table.active)],
);

export type AdminFinancesIncomeStream = typeof financeIncomeStreams.$inferSelect;
export type AdminFinancesIncomeStreamCreate = typeof financeIncomeStreams.$inferInsert;

// --- Nutrition --------------------------------------------------------------
//
// Three tables back `/workspace/nutrition`: `Recipes` (a cookbook of favourite
// dishes grouped by meal type), `MealPlanEntries` (a *soft* weekly plan — only
// filled slots exist, so an empty week is zero rows), and `FoodLogEntries` (a
// what-I-ate/drank diary the page rolls up into an end-of-week overview).
// Admin-only, `noindex` — no `*De`/`*En` pairs, no per-row `userId`, matching
// Travel / Media. See `docs/features/workspace-nutrition.md`.
//
// `mealType` is shared across all three so the assistant's "snack idea" ask,
// the plan grid's columns, and the diary all speak the same vocabulary. On a
// recipe, `isFavorite` + `lastMadeAt` are what let the nutrition sub-agent
// suggest something Cem likes and hasn't made recently.

export const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack', 'other'] as const;
export type AdminNutritionMealType = (typeof mealTypes)[number];

export const foodLogKinds = ['food', 'drink'] as const;
export type AdminNutritionFoodLogKind = (typeof foodLogKinds)[number];

export const recipes = pgTable(
    'AdminNutritionRecipe',
    {
        recipeId: uuid().primaryKey(),
        title: varchar().notNull(),
        mealType: varchar().$type<AdminNutritionMealType>().notNull().default('other'),
        ingredients: text()
            .array()
            .notNull()
            .default(sql`'{}'`),
        steps: text(),
        tags: text()
            .array()
            .notNull()
            .default(sql`'{}'`),
        isFavorite: boolean().notNull().default(false),
        rating: integer(),
        prepTimeMinutes: integer(),
        servings: integer(),
        sourceUrl: varchar(),
        notes: text(),
        lastMadeAt: timestamp({ withTimezone: true }),
        createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        index('AdminNutritionRecipe_mealType_idx').on(table.mealType),
        index('AdminNutritionRecipe_isFavorite_idx').on(table.isFavorite),
    ],
);

export type AdminNutritionRecipe = typeof recipes.$inferSelect;
export type AdminNutritionRecipeCreate = typeof recipes.$inferInsert;

// A single soft-plan slot: a `(date, mealType)` cell that either references a
// `AdminNutritionRecipe` or carries a free-text idea (`customText`). Both may be set — the
// UI prefers the recipe. On recipe delete the FK nulls so the plan slot
// survives as a bare idea rather than vanishing.
export const mealPlanEntries = pgTable(
    'AdminNutritionMealPlanEntry',
    {
        entryId: uuid().primaryKey(),
        date: date().notNull(),
        mealType: varchar().$type<AdminNutritionMealType>().notNull().default('other'),
        recipeId: uuid(),
        customText: varchar(),
        notes: text(),
        createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.recipeId],
            foreignColumns: [recipes.recipeId],
        })
            .onUpdate('cascade')
            .onDelete('set null'),
        index('AdminNutritionMealPlanEntry_date_idx').on(table.date),
    ],
);

export type AdminNutritionMealPlanEntry = typeof mealPlanEntries.$inferSelect;
export type AdminNutritionMealPlanEntryCreate = typeof mealPlanEntries.$inferInsert;

// The diary: one row per thing eaten or drunk. `kind` (food | drink) lets the
// weekly overview split intake; `recipeId` optionally links back to a cooked
// dish (nulled on recipe delete). `consumedAt` is a full timestamp so the
// page can group by day and the agent can log "for breakfast" against a time.
export const foodLogEntries = pgTable(
    'AdminNutritionFoodLogEntry',
    {
        logId: uuid().primaryKey(),
        consumedAt: timestamp({ withTimezone: true }).notNull(),
        mealType: varchar().$type<AdminNutritionMealType>().notNull().default('other'),
        kind: varchar().$type<AdminNutritionFoodLogKind>().notNull().default('food'),
        description: text().notNull(),
        recipeId: uuid(),
        notes: text(),
        createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.recipeId],
            foreignColumns: [recipes.recipeId],
        })
            .onUpdate('cascade')
            .onDelete('set null'),
        index('AdminNutritionFoodLogEntry_consumedAt_idx').on(table.consumedAt),
    ],
);

export type AdminNutritionFoodLogEntry = typeof foodLogEntries.$inferSelect;
export type AdminNutritionFoodLogEntryCreate = typeof foodLogEntries.$inferInsert;

// One tracked supplement (a pill / powder / capsule Cem takes). The exact
// per-serving composition lives in the child `SupplementNutrients` rows, which
// the "research composition" action fills from grounded web search and Cem
// confirms before saving. `researchedAt` is stamped when the composition came
// from that AI fill; `sourceUrl` is the product page it was read from. No
// `userId` / `*De`/`*En` — admin-only, matching the rest of Nutrition.
export const supplements = pgTable(
    'AdminNutritionSupplement',
    {
        supplementId: uuid().primaryKey(),
        name: varchar().notNull(),
        brand: varchar(),
        servingSize: varchar(),
        servingsPerContainer: integer(),
        sourceUrl: varchar(),
        notes: text(),
        researchedAt: timestamp({ withTimezone: true }),
        createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [index('AdminNutritionSupplement_name_idx').on(table.name)],
);

export type AdminNutritionSupplement = typeof supplements.$inferSelect;
export type AdminNutritionSupplementCreate = typeof supplements.$inferInsert;

// One nutrient line on a supplement's facts panel (e.g. "Vitamin D3 · 2000 ·
// IU · 250 %DV"). Owned by the parent supplement — `ON DELETE cascade`, unlike
// the recipe links elsewhere in Nutrition that null out. `amount` is text so
// it tolerates "<1", "trace", and ranges the label prints verbatim.
// `sortOrder` preserves the label's own ordering (the upsert rewrites the whole
// child set with the array index).
export const supplementNutrients = pgTable(
    'AdminNutritionSupplementNutrient',
    {
        nutrientId: uuid().primaryKey(),
        supplementId: uuid().notNull(),
        name: varchar().notNull(),
        amount: varchar(),
        unit: varchar(),
        percentDailyValue: integer(),
        sortOrder: integer().notNull().default(0),
        createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.supplementId],
            foreignColumns: [supplements.supplementId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        index('AdminNutritionSupplementNutrient_supplementId_idx').on(table.supplementId),
    ],
);

export type AdminNutritionSupplementNutrient = typeof supplementNutrients.$inferSelect;
export type AdminNutritionSupplementNutrientCreate = typeof supplementNutrients.$inferInsert;

// --- Fitness ----------------------------------------------------------------
//
// Five tables back `/workspace/fitness`: `Exercises` (a catalog), `WorkoutRoutines`
// + `WorkoutRoutineItems` (reusable templates like "Push day"), and
// `WorkoutSessions` + `WorkoutSets` (the actual gym log — weight × reps per set).
// Admin-only, `noindex` — no `*De`/`*En` pairs, no per-row `userId`, matching
// Travel / Media. See `docs/features/workspace-fitness.md`.
//
// A session may be `routineId`-linked ("seeded from Push day", nulled if the
// routine is later deleted). `WorkoutSets` carry the actual load; the
// `(exerciseId)` index backs the "what did I bench last time?" lookup the
// fitness sub-agent leans on. Weights are `numeric` (mode 'number') so half-kg
// plates round-trip without float drift.

export const muscleGroups = ['chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'fullBody', 'cardio', 'other'] as const;
export type AdminFitnessMuscleGroup = (typeof muscleGroups)[number];

export const equipmentTypes = ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'kettlebell', 'other'] as const;
export type AdminFitnessEquipmentType = (typeof equipmentTypes)[number];

export const exercises = pgTable(
    'AdminFitnessExercise',
    {
        exerciseId: uuid().primaryKey(),
        name: varchar().notNull(),
        muscleGroup: varchar().$type<AdminFitnessMuscleGroup>().notNull().default('other'),
        equipment: varchar().$type<AdminFitnessEquipmentType>(),
        notes: text(),
        createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [index('AdminFitnessExercise_muscleGroup_idx').on(table.muscleGroup)],
);

export type AdminFitnessExercise = typeof exercises.$inferSelect;
export type AdminFitnessExerciseCreate = typeof exercises.$inferInsert;

export const workoutRoutines = pgTable(
    'AdminFitnessWorkoutRoutine',
    {
        routineId: uuid().primaryKey(),
        name: varchar().notNull(),
        notes: text(),
        position: integer().notNull().default(0),
        createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [index('AdminFitnessWorkoutRoutine_position_idx').on(table.position)],
);

export type AdminFitnessWorkoutRoutine = typeof workoutRoutines.$inferSelect;
export type AdminFitnessWorkoutRoutineCreate = typeof workoutRoutines.$inferInsert;

// One planned exercise within a routine, with optional targets. `targetWeight`
// is `numeric` for half-kg increments. `position` orders the routine.
export const workoutRoutineItems = pgTable(
    'AdminFitnessWorkoutRoutineItem',
    {
        routineItemId: uuid().primaryKey(),
        routineId: uuid().notNull(),
        exerciseId: uuid().notNull(),
        position: integer().notNull().default(0),
        targetSets: integer(),
        targetReps: integer(),
        targetWeight: numeric({ mode: 'number' }),
        notes: text(),
        createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.routineId],
            foreignColumns: [workoutRoutines.routineId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        foreignKey({
            columns: [table.exerciseId],
            foreignColumns: [exercises.exerciseId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        index('AdminFitnessWorkoutRoutineItem_routineId_position_idx').on(table.routineId, table.position),
    ],
);

export type AdminFitnessWorkoutRoutineItem = typeof workoutRoutineItems.$inferSelect;
export type AdminFitnessWorkoutRoutineItemCreate = typeof workoutRoutineItems.$inferInsert;

export const workoutSessions = pgTable(
    'AdminFitnessWorkoutSession',
    {
        sessionId: uuid().primaryKey(),
        date: date().notNull(),
        title: varchar(),
        routineId: uuid(),
        durationMinutes: integer(),
        notes: text(),
        createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.routineId],
            foreignColumns: [workoutRoutines.routineId],
        })
            .onUpdate('cascade')
            .onDelete('set null'),
        index('AdminFitnessWorkoutSession_date_idx').on(table.date),
    ],
);

export type AdminFitnessWorkoutSession = typeof workoutSessions.$inferSelect;
export type AdminFitnessWorkoutSessionCreate = typeof workoutSessions.$inferInsert;

// One logged set within a session: `weight` × `reps`, optional `rpe`, and an
// `isWarmup` flag so warmups don't pollute PR math. `position` orders sets
// within a session; the `(exerciseId)` index backs per-exercise history.
export const workoutSets = pgTable(
    'AdminFitnessWorkoutSet',
    {
        setId: uuid().primaryKey(),
        sessionId: uuid().notNull(),
        exerciseId: uuid().notNull(),
        position: integer().notNull().default(0),
        weight: numeric({ mode: 'number' }),
        reps: integer(),
        rpe: integer(),
        isWarmup: boolean().notNull().default(false),
        notes: text(),
        createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.sessionId],
            foreignColumns: [workoutSessions.sessionId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        foreignKey({
            columns: [table.exerciseId],
            foreignColumns: [exercises.exerciseId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        index('AdminFitnessWorkoutSet_sessionId_position_idx').on(table.sessionId, table.position),
        index('AdminFitnessWorkoutSet_exerciseId_idx').on(table.exerciseId),
    ],
);

export type AdminFitnessWorkoutSet = typeof workoutSets.$inferSelect;
export type AdminFitnessWorkoutSetCreate = typeof workoutSets.$inferInsert;

// --- Tax --------------------------------------------------------------------
//
// Organises a German tax return end-to-end: a `AdminTaxYear` container holds
// income sources (one per Anlage / employer), deductible expenses (with
// receipt files), and a document checklist. Admin-only convention: no per-row
// `userId` — `guardAdminMutation` gates the whole namespace at the resolver
// boundary. This is a collection/organisation tool, not a tax calculator.

export const taxYearStatuses = ['open', 'collecting', 'filing', 'submitted', 'closed'] as const;
export type AdminTaxYearStatus = (typeof taxYearStatuses)[number];

export const taxIncomeKinds = ['employment', 'selfEmployment', 'business', 'minijob', 'capital', 'other'] as const;
export type AdminTaxIncomeKind = (typeof taxIncomeKinds)[number];

export const taxExpenseCategories = [
    'businessExpense',
    'workRelated',
    'specialExpenses',
    'insurance',
    'extraordinary',
    'homeOffice',
    'other',
] as const;
export type AdminTaxExpenseCategory = (typeof taxExpenseCategories)[number];

export const taxDocumentKinds = [
    'lohnsteuerbescheinigung',
    'euer',
    'minijobConfirmation',
    'insuranceStatement',
    'donationReceipt',
    'bankStatement',
    'other',
] as const;
export type AdminTaxDocumentKind = (typeof taxDocumentKinds)[number];

export const taxDocumentStatuses = ['needed', 'received', 'notApplicable'] as const;
export type AdminTaxDocumentStatus = (typeof taxDocumentStatuses)[number];

export const taxFileKinds = ['receipt', 'statement', 'scan', 'other'] as const;
export type AdminTaxFileKind = (typeof taxFileKinds)[number];

// One tax year (e.g. 2025). `submittedAt` is stamped by the command when
// `status` reaches `submitted`; `filingDeadline` is informational. `year` is
// unique so a second "new year" for the same year is rejected at the DB.
export const taxYears = pgTable(
    'AdminTaxYear',
    {
        taxYearId: uuid().primaryKey(),
        year: integer().notNull(),
        status: varchar().$type<AdminTaxYearStatus>().notNull().default('open'),
        filingDeadline: date(),
        submittedAt: timestamp({ withTimezone: true }),
        notes: text(),
        createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [uniqueIndex('AdminTaxYear_year_idx').on(table.year)],
);

export type AdminTaxYear = typeof taxYears.$inferSelect;
export type AdminTaxYearCreate = typeof taxYears.$inferInsert;

// An income source within a year, one per Anlage / employer (Anlage N =
// employment, Anlage S = selfEmployment, Anlage G = business, Minijob, KAP =
// capital). `grossAmountCents` nullable — the figure may not be known yet.
export const taxIncomeSources = pgTable(
    'AdminTaxIncomeSource',
    {
        incomeSourceId: uuid().primaryKey(),
        taxYearId: uuid().notNull(),
        kind: varchar().$type<AdminTaxIncomeKind>().notNull().default('other'),
        label: varchar().notNull(),
        grossAmountCents: integer(),
        notes: text(),
        createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.taxYearId],
            foreignColumns: [taxYears.taxYearId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        index('AdminTaxIncomeSource_taxYearId_idx').on(table.taxYearId),
        index('AdminTaxIncomeSource_kind_idx').on(table.kind),
    ],
);

export type AdminTaxIncomeSource = typeof taxIncomeSources.$inferSelect;
export type AdminTaxIncomeSourceCreate = typeof taxIncomeSources.$inferInsert;

// A deductible expense. `incomeSourceId` optionally links which income it
// offsets (Betriebsausgabe ↔ selfEmployment, Werbungskosten ↔ employment); on
// source delete the link is nulled so the expense survives. `deductible`
// lets a row be recorded but excluded from the deductible total.
export const taxExpenses = pgTable(
    'AdminTaxExpense',
    {
        expenseId: uuid().primaryKey(),
        taxYearId: uuid().notNull(),
        incomeSourceId: uuid(),
        categoryKey: varchar().$type<AdminTaxExpenseCategory>().notNull().default('other'),
        description: varchar().notNull(),
        amountCents: integer().notNull(),
        incurredOn: date(),
        deductible: boolean().notNull().default(true),
        notes: text(),
        createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.taxYearId],
            foreignColumns: [taxYears.taxYearId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        foreignKey({
            columns: [table.incomeSourceId],
            foreignColumns: [taxIncomeSources.incomeSourceId],
        })
            .onUpdate('cascade')
            .onDelete('set null'),
        index('AdminTaxExpense_taxYearId_idx').on(table.taxYearId),
        index('AdminTaxExpense_categoryKey_idx').on(table.categoryKey),
        index('AdminTaxExpense_incomeSourceId_idx').on(table.incomeSourceId),
    ],
);

export type AdminTaxExpense = typeof taxExpenses.$inferSelect;
export type AdminTaxExpenseCreate = typeof taxExpenses.$inferInsert;

// Document-checklist row. Default rows are seeded on year insert (see
// `taxDefaultChecklist`); the status toggles needed → received as scans come
// in. `notApplicable` retires a row without deleting it.
export const taxDocuments = pgTable(
    'AdminTaxDocument',
    {
        documentId: uuid().primaryKey(),
        taxYearId: uuid().notNull(),
        kind: varchar().$type<AdminTaxDocumentKind>().notNull().default('other'),
        title: varchar().notNull(),
        status: varchar().$type<AdminTaxDocumentStatus>().notNull().default('needed'),
        notes: text(),
        createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.taxYearId],
            foreignColumns: [taxYears.taxYearId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        index('AdminTaxDocument_taxYearId_idx').on(table.taxYearId),
        index('AdminTaxDocument_status_idx').on(table.status),
    ],
);

export type AdminTaxDocument = typeof taxDocuments.$inferSelect;
export type AdminTaxDocumentCreate = typeof taxDocuments.$inferInsert;

// Join row pinning `FileUploads` to a tax year, and optionally to a specific
// expense (a receipt) or checklist document (a scan). Mirrors `itemFiles`:
// the upload is user-owned and lives on `fileUploads`; on expense/document
// delete the secondary link nulls (the file stays on the year), on upload
// delete the whole join cascades.
export const taxFiles = pgTable(
    'AdminTaxFile',
    {
        taxFileId: uuid().primaryKey(),
        taxYearId: uuid().notNull(),
        expenseId: uuid(),
        documentId: uuid(),
        fileUploadId: uuid().notNull(),
        label: varchar(),
        kind: varchar().$type<AdminTaxFileKind>().notNull().default('other'),
        pinned: boolean().notNull().default(false),
        createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.taxYearId],
            foreignColumns: [taxYears.taxYearId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        foreignKey({
            columns: [table.expenseId],
            foreignColumns: [taxExpenses.expenseId],
        })
            .onUpdate('cascade')
            .onDelete('set null'),
        foreignKey({
            columns: [table.documentId],
            foreignColumns: [taxDocuments.documentId],
        })
            .onUpdate('cascade')
            .onDelete('set null'),
        foreignKey({
            columns: [table.fileUploadId],
            foreignColumns: [fileUploads.fileUploadId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        index('AdminTaxFile_taxYearId_idx').on(table.taxYearId),
        index('AdminTaxFile_expenseId_idx').on(table.expenseId),
        index('AdminTaxFile_documentId_idx').on(table.documentId),
        index('AdminTaxFile_fileUploadId_idx').on(table.fileUploadId),
    ],
);

export type AdminTaxFile = typeof taxFiles.$inferSelect;
export type AdminTaxFileCreate = typeof taxFiles.$inferInsert;
