ALTER TABLE "Compass" ADD COLUMN "scheduledInterviewTopic" varchar;--> statement-breakpoint
ALTER TABLE "Compass" ADD COLUMN "scheduledInterviewAt" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "Compass" ADD COLUMN "scheduledInterviewReason" text;--> statement-breakpoint
ALTER TABLE "CompassInterviews" ADD COLUMN "topic" varchar DEFAULT 'general' NOT NULL;