CREATE TABLE "ProjectActivities" (
	"activityId" uuid PRIMARY KEY NOT NULL,
	"projectId" uuid NOT NULL,
	"taskId" uuid,
	"kind" varchar NOT NULL,
	"channel" varchar,
	"title" varchar NOT NULL,
	"notes" text,
	"occurredAt" timestamp with time zone NOT NULL,
	"startedAt" timestamp with time zone,
	"endedAt" timestamp with time zone,
	"durationSec" integer,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ProjectActivities" ADD CONSTRAINT "ProjectActivities_projectId_Projects_projectId_fk" FOREIGN KEY ("projectId") REFERENCES "public"."Projects"("projectId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ProjectActivities" ADD CONSTRAINT "ProjectActivities_taskId_Tasks_taskId_fk" FOREIGN KEY ("taskId") REFERENCES "public"."Tasks"("taskId") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "ProjectActivities_projectId_occurredAt_idx" ON "ProjectActivities" USING btree ("projectId","occurredAt");--> statement-breakpoint
CREATE INDEX "ProjectActivities_taskId_idx" ON "ProjectActivities" USING btree ("taskId");--> statement-breakpoint
CREATE UNIQUE INDEX "ProjectActivities_singleActiveTimer_uniq" ON "ProjectActivities" USING btree ("kind") WHERE "ProjectActivities"."endedAt" IS NULL AND "ProjectActivities"."kind" = 'work';