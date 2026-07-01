ALTER TABLE "CompassInterviews" ALTER COLUMN "triggerReason" SET DEFAULT 'scheduled';
--> statement-breakpoint
UPDATE "CompassInterviews" SET "triggerReason" = 'scheduled' WHERE "triggerReason" = 'weekly_cron';
