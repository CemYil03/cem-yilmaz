CREATE TABLE "Projects" (
	"projectId" uuid PRIMARY KEY NOT NULL,
	"title" varchar NOT NULL,
	"description" text,
	"notes" text,
	"status" varchar DEFAULT 'idea' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"sourceRequestId" uuid,
	"startedAt" timestamp with time zone,
	"completedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Tasks" (
	"taskId" uuid PRIMARY KEY NOT NULL,
	"projectId" uuid,
	"title" varchar NOT NULL,
	"notes" text,
	"status" varchar DEFAULT 'todo' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"dueAt" timestamp with time zone,
	"completedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Projects" ADD CONSTRAINT "Projects_sourceRequestId_ProjectRequests_projectRequestId_fk" FOREIGN KEY ("sourceRequestId") REFERENCES "public"."ProjectRequests"("projectRequestId") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Tasks" ADD CONSTRAINT "Tasks_projectId_Projects_projectId_fk" FOREIGN KEY ("projectId") REFERENCES "public"."Projects"("projectId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "Projects_status_position_idx" ON "Projects" USING btree ("status","position");--> statement-breakpoint
CREATE INDEX "Projects_sourceRequestId_idx" ON "Projects" USING btree ("sourceRequestId");--> statement-breakpoint
CREATE INDEX "Tasks_projectId_position_idx" ON "Tasks" USING btree ("projectId","position");--> statement-breakpoint
CREATE INDEX "Tasks_status_dueAt_idx" ON "Tasks" USING btree ("status","dueAt");