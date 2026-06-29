CREATE TABLE "ProjectRequests" (
	"projectRequestId" uuid PRIMARY KEY NOT NULL,
	"chatId" uuid,
	"name" varchar NOT NULL,
	"email" varchar NOT NULL,
	"company" varchar,
	"projectType" varchar NOT NULL,
	"description" text NOT NULL,
	"budget" varchar,
	"timeline" varchar,
	"status" varchar DEFAULT 'pendingOtp' NOT NULL,
	"otpHash" varchar NOT NULL,
	"otpSalt" varchar NOT NULL,
	"otpExpiresAt" timestamp with time zone NOT NULL,
	"otpAttempts" integer DEFAULT 0 NOT NULL,
	"verifiedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ProjectRequests" ADD CONSTRAINT "ProjectRequests_chatId_Chats_chatId_fk" FOREIGN KEY ("chatId") REFERENCES "public"."Chats"("chatId") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "ProjectRequests_status_createdAt_idx" ON "ProjectRequests" USING btree ("status","createdAt");--> statement-breakpoint
CREATE INDEX "ProjectRequests_chatId_idx" ON "ProjectRequests" USING btree ("chatId");