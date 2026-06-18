CREATE TABLE "ChatMessageUserAttachments" (
	"chatMessageId" uuid NOT NULL,
	"fileUploadId" uuid NOT NULL,
	"position" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ChatMessages" (
	"chatMessageId" uuid PRIMARY KEY NOT NULL,
	"chatId" uuid NOT NULL,
	"kind" varchar NOT NULL,
	"authorUserId" uuid,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ChatMessagesAssistantInputCollection" (
	"chatMessageId" uuid PRIMARY KEY NOT NULL,
	"prompt" varchar NOT NULL,
	"inputs" jsonb NOT NULL,
	"mode" varchar DEFAULT 'form' NOT NULL,
	"modelId" varchar,
	"inputTokens" integer,
	"outputTokens" integer,
	"totalTokens" integer,
	"reasoningTokens" integer,
	"cachedInputTokens" integer
);
--> statement-breakpoint
CREATE TABLE "ChatMessagesAssistantText" (
	"chatMessageId" uuid PRIMARY KEY NOT NULL,
	"body" varchar NOT NULL,
	"modelId" varchar,
	"inputTokens" integer,
	"outputTokens" integer,
	"totalTokens" integer,
	"reasoningTokens" integer,
	"cachedInputTokens" integer
);
--> statement-breakpoint
CREATE TABLE "ChatMessagesToolApprovalRequest" (
	"chatMessageId" uuid PRIMARY KEY NOT NULL,
	"approvalId" varchar NOT NULL,
	"toolCallId" varchar NOT NULL,
	"toolName" varchar NOT NULL,
	"toolArgs" jsonb NOT NULL,
	"modelId" varchar,
	"inputTokens" integer,
	"outputTokens" integer,
	"totalTokens" integer,
	"reasoningTokens" integer,
	"cachedInputTokens" integer,
	CONSTRAINT "ChatMessagesToolApprovalRequest_approvalId_uniq" UNIQUE("approvalId")
);
--> statement-breakpoint
CREATE TABLE "ChatMessagesToolApprovalResponse" (
	"chatMessageId" uuid PRIMARY KEY NOT NULL,
	"approvalId" varchar NOT NULL,
	"approved" boolean NOT NULL,
	"reason" varchar,
	CONSTRAINT "ChatMessagesToolApprovalResponse_approvalId_unique" UNIQUE("approvalId")
);
--> statement-breakpoint
CREATE TABLE "ChatMessagesToolCall" (
	"chatMessageId" uuid PRIMARY KEY NOT NULL,
	"toolCallId" varchar NOT NULL,
	"toolName" varchar NOT NULL,
	"toolArgs" jsonb NOT NULL,
	"toolResult" jsonb,
	"resultedAt" timestamp with time zone,
	"modelId" varchar,
	"inputTokens" integer,
	"outputTokens" integer,
	"totalTokens" integer,
	"reasoningTokens" integer,
	"cachedInputTokens" integer
);
--> statement-breakpoint
CREATE TABLE "ChatMessagesUser" (
	"chatMessageId" uuid PRIMARY KEY NOT NULL,
	"body" varchar NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ChatMessagesUserInput" (
	"chatMessageId" uuid PRIMARY KEY NOT NULL,
	"collectionMessageId" uuid NOT NULL,
	"answers" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Chats" (
	"chatId" uuid PRIMARY KEY NOT NULL,
	"title" varchar DEFAULT '' NOT NULL,
	"lastModifiedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "FileUploads" (
	"fileUploadId" uuid PRIMARY KEY NOT NULL,
	"userId" uuid NOT NULL,
	"filename" varchar NOT NULL,
	"mediaType" varchar NOT NULL,
	"size" integer NOT NULL,
	"bytes" "bytea" NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Logs" (
	"logId" uuid PRIMARY KEY NOT NULL,
	"sessionId" uuid,
	"level" varchar NOT NULL,
	"message" varchar NOT NULL,
	"context" jsonb,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Sessions" (
	"sessionId" uuid PRIMARY KEY NOT NULL,
	"userId" uuid,
	"lastInteractionAt" timestamp with time zone DEFAULT now() NOT NULL,
	"wasTerminatedAt" timestamp with time zone,
	"connectionActive" boolean DEFAULT false NOT NULL,
	"userAgent" varchar,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Users" (
	"userId" uuid PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ChatMessageUserAttachments" ADD CONSTRAINT "ChatMessageUserAttachments_chatMessageId_ChatMessagesUser_chatMessageId_fk" FOREIGN KEY ("chatMessageId") REFERENCES "public"."ChatMessagesUser"("chatMessageId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ChatMessageUserAttachments" ADD CONSTRAINT "ChatMessageUserAttachments_fileUploadId_FileUploads_fileUploadId_fk" FOREIGN KEY ("fileUploadId") REFERENCES "public"."FileUploads"("fileUploadId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ChatMessages" ADD CONSTRAINT "ChatMessages_chatId_Chats_chatId_fk" FOREIGN KEY ("chatId") REFERENCES "public"."Chats"("chatId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ChatMessages" ADD CONSTRAINT "ChatMessages_authorUserId_Users_userId_fk" FOREIGN KEY ("authorUserId") REFERENCES "public"."Users"("userId") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ChatMessagesAssistantInputCollection" ADD CONSTRAINT "ChatMessagesAssistantInputCollection_chatMessageId_ChatMessages_chatMessageId_fk" FOREIGN KEY ("chatMessageId") REFERENCES "public"."ChatMessages"("chatMessageId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ChatMessagesAssistantText" ADD CONSTRAINT "ChatMessagesAssistantText_chatMessageId_ChatMessages_chatMessageId_fk" FOREIGN KEY ("chatMessageId") REFERENCES "public"."ChatMessages"("chatMessageId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ChatMessagesToolApprovalRequest" ADD CONSTRAINT "ChatMessagesToolApprovalRequest_chatMessageId_ChatMessages_chatMessageId_fk" FOREIGN KEY ("chatMessageId") REFERENCES "public"."ChatMessages"("chatMessageId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ChatMessagesToolApprovalResponse" ADD CONSTRAINT "ChatMessagesToolApprovalResponse_chatMessageId_ChatMessages_chatMessageId_fk" FOREIGN KEY ("chatMessageId") REFERENCES "public"."ChatMessages"("chatMessageId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ChatMessagesToolApprovalResponse" ADD CONSTRAINT "ChatMessagesToolApprovalResponse_approvalId_ChatMessagesToolApprovalRequest_approvalId_fk" FOREIGN KEY ("approvalId") REFERENCES "public"."ChatMessagesToolApprovalRequest"("approvalId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ChatMessagesToolCall" ADD CONSTRAINT "ChatMessagesToolCall_chatMessageId_ChatMessages_chatMessageId_fk" FOREIGN KEY ("chatMessageId") REFERENCES "public"."ChatMessages"("chatMessageId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ChatMessagesUser" ADD CONSTRAINT "ChatMessagesUser_chatMessageId_ChatMessages_chatMessageId_fk" FOREIGN KEY ("chatMessageId") REFERENCES "public"."ChatMessages"("chatMessageId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ChatMessagesUserInput" ADD CONSTRAINT "ChatMessagesUserInput_chatMessageId_ChatMessages_chatMessageId_fk" FOREIGN KEY ("chatMessageId") REFERENCES "public"."ChatMessages"("chatMessageId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ChatMessagesUserInput" ADD CONSTRAINT "ChatMessagesUserInput_collectionMessageId_ChatMessagesAssistantInputCollection_chatMessageId_fk" FOREIGN KEY ("collectionMessageId") REFERENCES "public"."ChatMessagesAssistantInputCollection"("chatMessageId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "FileUploads" ADD CONSTRAINT "FileUploads_userId_Users_userId_fk" FOREIGN KEY ("userId") REFERENCES "public"."Users"("userId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Logs" ADD CONSTRAINT "Logs_sessionId_Sessions_sessionId_fk" FOREIGN KEY ("sessionId") REFERENCES "public"."Sessions"("sessionId") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Sessions" ADD CONSTRAINT "Sessions_userId_Users_userId_fk" FOREIGN KEY ("userId") REFERENCES "public"."Users"("userId") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "ChatMessageUserAttachments_pk" ON "ChatMessageUserAttachments" USING btree ("chatMessageId","fileUploadId");--> statement-breakpoint
CREATE INDEX "ChatMessageUserAttachments_chatMessageId_idx" ON "ChatMessageUserAttachments" USING btree ("chatMessageId");--> statement-breakpoint
CREATE INDEX "ChatMessages_chatId_createdAt_idx" ON "ChatMessages" USING btree ("chatId","createdAt");--> statement-breakpoint
CREATE INDEX "ChatMessages_kind_idx" ON "ChatMessages" USING btree ("kind");--> statement-breakpoint
CREATE UNIQUE INDEX "ChatMessagesToolApprovalResponse_approvalId_uniq" ON "ChatMessagesToolApprovalResponse" USING btree ("approvalId");--> statement-breakpoint
CREATE INDEX "ChatMessagesToolCall_toolCallId_idx" ON "ChatMessagesToolCall" USING btree ("toolCallId");--> statement-breakpoint
CREATE INDEX "FileUploads_userId_idx" ON "FileUploads" USING btree ("userId");