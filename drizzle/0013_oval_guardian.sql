CREATE TABLE "CompassInterviewMessageAnalysis" (
	"interviewMessageId" uuid PRIMARY KEY NOT NULL,
	"observationsCreated" integer DEFAULT 0 NOT NULL,
	"analyzerModelId" varchar,
	"analyzedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "CompassInterviewMessages" (
	"interviewMessageId" uuid PRIMARY KEY NOT NULL,
	"interviewId" uuid NOT NULL,
	"role" varchar NOT NULL,
	"content" text NOT NULL,
	"modelId" varchar,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "CompassInterviews" (
	"interviewId" uuid PRIMARY KEY NOT NULL,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"dueAt" timestamp with time zone DEFAULT now() NOT NULL,
	"startedAt" timestamp with time zone,
	"completedAt" timestamp with time zone,
	"endReason" varchar,
	"triggerReason" varchar DEFAULT 'weekly_cron' NOT NULL,
	"observationCount" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "CompassObservations" ADD COLUMN "sourceInterviewMessageId" uuid;--> statement-breakpoint
ALTER TABLE "CompassInterviewMessageAnalysis" ADD CONSTRAINT "CompassInterviewMessageAnalysis_interviewMessageId_CompassInterviewMessages_interviewMessageId_fk" FOREIGN KEY ("interviewMessageId") REFERENCES "public"."CompassInterviewMessages"("interviewMessageId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "CompassInterviewMessages" ADD CONSTRAINT "CompassInterviewMessages_interviewId_CompassInterviews_interviewId_fk" FOREIGN KEY ("interviewId") REFERENCES "public"."CompassInterviews"("interviewId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "CompassInterviewMessages_interviewId_createdAt_idx" ON "CompassInterviewMessages" USING btree ("interviewId","createdAt");--> statement-breakpoint
CREATE INDEX "CompassInterviews_status_dueAt_idx" ON "CompassInterviews" USING btree ("status","dueAt");--> statement-breakpoint
CREATE INDEX "CompassInterviews_createdAt_idx" ON "CompassInterviews" USING btree ("createdAt");--> statement-breakpoint
ALTER TABLE "CompassObservations" ADD CONSTRAINT "CompassObservations_sourceInterviewMessageId_CompassInterviewMessages_interviewMessageId_fk" FOREIGN KEY ("sourceInterviewMessageId") REFERENCES "public"."CompassInterviewMessages"("interviewMessageId") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "CompassObservations_sourceInterviewMessageId_idx" ON "CompassObservations" USING btree ("sourceInterviewMessageId");