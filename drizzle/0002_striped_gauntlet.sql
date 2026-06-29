CREATE TABLE "Profile" (
	"profileId" uuid PRIMARY KEY NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"prose" text DEFAULT '' NOT NULL,
	"psychProfile" text DEFAULT '' NOT NULL,
	"synthesizedAt" timestamp with time zone,
	"synthesisModelId" varchar,
	"observationsSinceSynthesis" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ProfileMessageAnalysis" (
	"chatMessageId" uuid PRIMARY KEY NOT NULL,
	"observationsCreated" integer DEFAULT 0 NOT NULL,
	"analyzerModelId" varchar,
	"analyzedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ProfileObservations" (
	"observationId" uuid PRIMARY KEY NOT NULL,
	"sourceChatMessageId" uuid,
	"category" varchar NOT NULL,
	"content" text NOT NULL,
	"confidence" integer,
	"analyzerModelId" varchar,
	"dismissedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ProfileMessageAnalysis" ADD CONSTRAINT "ProfileMessageAnalysis_chatMessageId_ChatMessages_chatMessageId_fk" FOREIGN KEY ("chatMessageId") REFERENCES "public"."ChatMessages"("chatMessageId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ProfileObservations" ADD CONSTRAINT "ProfileObservations_sourceChatMessageId_ChatMessages_chatMessageId_fk" FOREIGN KEY ("sourceChatMessageId") REFERENCES "public"."ChatMessages"("chatMessageId") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "ProfileObservations_category_createdAt_idx" ON "ProfileObservations" USING btree ("category","createdAt");--> statement-breakpoint
CREATE INDEX "ProfileObservations_sourceChatMessageId_idx" ON "ProfileObservations" USING btree ("sourceChatMessageId");--> statement-breakpoint
CREATE INDEX "ProfileObservations_createdAt_idx" ON "ProfileObservations" USING btree ("createdAt");