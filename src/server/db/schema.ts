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

export const users = pgTable('Users', {
    userId: uuid().primaryKey(),
    name: varchar().notNull(),
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
        index('ChatMessages_chatId_createdAt_idx').on(table.chatId, table.createdAt),
        index('ChatMessages_kind_idx').on(table.kind),
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
        companyDe: varchar().notNull(),
        companyEn: varchar().notNull(),
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
        institutionDe: varchar().notNull(),
        institutionEn: varchar().notNull(),
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
