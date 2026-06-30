import {
    boolean,
    customType,
    date,
    foreignKey,
    index,
    integer,
    jsonb,
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
// `Mutation.admin` `guardAdminMutation` gate both read this column. Set
// manually with `UPDATE "Users" SET "isAdmin" = true WHERE …` for Cem's own
// accounts; visitors and anonymous sessions never flip it. The column is a
// stepping stone — once OAuth lands the boolean can be reconciled from the
// GitHub login allowlist, and a dedicated `Admins` table is a clean upgrade
// because the column move is mechanical. See
// `docs/architecture/workspace-access.md`.
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
// `docs/architecture/multi-agent-chat.md`.
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

export const cvExperience = pgTable(
    'CvExperience',
    {
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
        position: integer().notNull(),
        createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [index('CvExperience_position_idx').on(table.position)],
);

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

// One row per observation extracted by the analyzer. `sourceChatMessageId`
// FKs the user-side message the observation was derived from; the UI uses it
// to render the inline "N observations" pill in the chat thread and to
// deep-link from the compass page back to the source.
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
        index('CompassObservations_category_createdAt_idx').on(table.category, table.createdAt),
        index('CompassObservations_sourceChatMessageId_idx').on(table.sourceChatMessageId),
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

// --- Project requests --------------------------------------------------------
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
export type ProjectRequestStatus = (typeof projectRequestStatuses)[number];

export const projectRequestTypes = ['webApp', 'mobile', 'consulting', 'aiIntegration', 'other'] as const;
export type ProjectRequestType = (typeof projectRequestTypes)[number];

export const projectRequests = pgTable(
    'ProjectRequests',
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
        projectType: varchar().$type<ProjectRequestType>().notNull(),
        description: text().notNull(),
        budget: varchar(),
        timeline: varchar(),
        status: varchar().$type<ProjectRequestStatus>().notNull().default('pendingOtp'),
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
        index('ProjectRequests_status_createdAt_idx').on(table.status, table.createdAt),
        index('ProjectRequests_chatId_idx').on(table.chatId),
    ],
);

export type ProjectRequest = typeof projectRequests.$inferSelect;
export type ProjectRequestCreate = typeof projectRequests.$inferInsert;

// --- Projects & Tasks --------------------------------------------------------
//
// Workspace-only project tracking. Distinct from the public `/projects`
// portfolio surface (static `portfolioProjects.ts` today, DB-backed in
// Phase 3) — these rows are admin-only, single-language, and shaped for
// triaging incoming `ProjectRequests` plus running ongoing personal work.
//
// `Tasks.projectId` is nullable: a row with `projectId IS NULL` is a
// standalone todo (no parent project), surfaced on the workspace projects
// page's Todos tab. Project-bound tasks cascade away with their project;
// standalone todos live on independently.
//
// See `docs/features/projects-workspace.md`.

export const projectStatuses = ['idea', 'planning', 'active', 'paused', 'done', 'archived'] as const;
export type ProjectStatus = (typeof projectStatuses)[number];

export const projects = pgTable(
    'Projects',
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
        status: varchar().$type<ProjectStatus>().notNull().default('idea'),
        // Within-status ordering. The board reorders inside a single column
        // only in v1 — moving a project across columns is a status change
        // through the editor, not a drag.
        position: integer().notNull().default(0),
        // Source request this project was created from, when applicable.
        // `projectUpsert` stamps this in the same transaction that
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
        index('Projects_status_position_idx').on(table.status, table.position),
        index('Projects_sourceRequestId_idx').on(table.sourceRequestId),
    ],
);

export type Project = typeof projects.$inferSelect;
export type ProjectCreate = typeof projects.$inferInsert;

export const taskStatuses = ['todo', 'doing', 'done'] as const;
export type TaskStatus = (typeof taskStatuses)[number];

export const tasks = pgTable(
    'Tasks',
    {
        taskId: uuid().primaryKey(),
        // Owning project. Null = standalone todo, surfaced on the Todos tab.
        // On project delete the rows cascade away with the project; standalone
        // rows are unaffected.
        projectId: uuid(),
        title: varchar().notNull(),
        notes: text(),
        status: varchar().$type<TaskStatus>().notNull().default('todo'),
        // Position is scoped per `(projectId, status)` bucket on screen but
        // stored as a single integer per row — reorder rewrites the whole
        // bucket. Standalone todos share the `projectId IS NULL` bucket.
        position: integer().notNull().default(0),
        dueAt: timestamp({ withTimezone: true }),
        completedAt: timestamp({ withTimezone: true }),
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
        index('Tasks_projectId_position_idx').on(table.projectId, table.position),
        index('Tasks_status_dueAt_idx').on(table.status, table.dueAt),
    ],
);

export type Task = typeof tasks.$inferSelect;
export type TaskCreate = typeof tasks.$inferInsert;

// --- Project activities ------------------------------------------------------
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
// open, the second `projectTimerStart` raises a unique-violation that the
// command handler catches and retries after stopping the existing timer.
//
// See `docs/features/projects-workspace.md`.

export const projectActivityKinds = ['clientContact', 'meeting', 'work', 'offer', 'milestone', 'note'] as const;
export type ProjectActivityKind = (typeof projectActivityKinds)[number];

export const projectActivityChannels = ['malt', 'email', 'phone', 'videoCall', 'inPerson', 'aiAssistant', 'other'] as const;
export type ProjectActivityChannel = (typeof projectActivityChannels)[number];

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
export type ProjectActivityDirection = (typeof projectActivityDirections)[number];

// Offer-row state. Meaningful only when `kind = 'offer'`; the UI hides the
// pill for other kinds. A withdrawn offer keeps the row for history.
export const projectOfferStatuses = ['sent', 'accepted', 'rejected', 'withdrawn'] as const;
export type ProjectOfferStatus = (typeof projectOfferStatuses)[number];

export const projectActivities = pgTable(
    'ProjectActivities',
    {
        activityId: uuid().primaryKey(),
        projectId: uuid().notNull(),
        // Optional link to a specific task — lets totals roll up per task
        // without forcing every activity to pick one. Cascade-set-null on
        // task delete so removing a task doesn't shred its history.
        taskId: uuid(),
        kind: varchar().$type<ProjectActivityKind>().notNull(),
        // Communication channel; null when kind is `work` / `offer` /
        // `milestone` / `note`. Free to fill for `clientContact` / `meeting`.
        channel: varchar().$type<ProjectActivityChannel>(),
        // Sidedness — drives the chat-style timeline. `outgoing` = Cem,
        // `incoming` = client, `internal` = system markers (work / note /
        // milestone). Defaulted at the command layer so existing rows backfill
        // sensibly via the migration default.
        direction: varchar().$type<ProjectActivityDirection>().notNull().default('internal'),
        title: varchar().notNull(),
        notes: text(),
        // When the event happened (call start, email send). For timer rows
        // this equals `startedAt`. The timeline orders strictly on this column.
        occurredAt: timestamp({ withTimezone: true }).notNull(),
        // Set on work-timer rows; null on event rows.
        startedAt: timestamp({ withTimezone: true }),
        // Null while a timer is running; stamped by `projectTimerStop`.
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
        offerStatus: varchar().$type<ProjectOfferStatus>(),
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
        index('ProjectActivities_projectId_occurredAt_idx').on(table.projectId, table.occurredAt),
        index('ProjectActivities_taskId_idx').on(table.taskId),
        // Partial unique enforces the single-active-timer invariant. The
        // `kind = 'work' AND endedAt IS NULL` predicate matches at most one
        // row across the whole table; a concurrent second start fails fast.
        uniqueIndex('ProjectActivities_singleActiveTimer_uniq')
            .on(table.kind)
            .where(sql`${table.endedAt} IS NULL AND ${table.kind} = 'work'`),
    ],
);

export type ProjectActivity = typeof projectActivities.$inferSelect;
export type ProjectActivityCreate = typeof projectActivities.$inferInsert;

// --- Project links & files ---------------------------------------------------
//
// First-class resources hanging off a project: external URLs (repo, Malt
// mission, Figma file, client portal, shared drive) and uploaded files
// (offer PDFs, signed contracts, invoices, screenshots). Each row optionally
// references the `ProjectActivity` it was "born from" — when a link or file
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
export type ProjectLinkKind = (typeof projectLinkKinds)[number];

export const projectLinks = pgTable(
    'ProjectLinks',
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
        kind: varchar().$type<ProjectLinkKind>().notNull().default('other'),
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
        index('ProjectLinks_projectId_pinned_idx').on(table.projectId, table.pinned),
        index('ProjectLinks_activityId_idx').on(table.activityId),
    ],
);

export type ProjectLink = typeof projectLinks.$inferSelect;
export type ProjectLinkCreate = typeof projectLinks.$inferInsert;

export const projectFileKinds = ['offer', 'invoice', 'contract', 'screenshot', 'other'] as const;
export type ProjectFileKind = (typeof projectFileKinds)[number];

export const projectFiles = pgTable(
    'ProjectFiles',
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
        kind: varchar().$type<ProjectFileKind>().notNull().default('other'),
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
        index('ProjectFiles_projectId_pinned_idx').on(table.projectId, table.pinned),
        index('ProjectFiles_activityId_idx').on(table.activityId),
        index('ProjectFiles_fileUploadId_idx').on(table.fileUploadId),
    ],
);

export type ProjectFile = typeof projectFiles.$inferSelect;
export type ProjectFileCreate = typeof projectFiles.$inferInsert;
