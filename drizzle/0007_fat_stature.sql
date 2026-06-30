CREATE TABLE "ProjectFiles" (
	"projectFileId" uuid PRIMARY KEY NOT NULL,
	"projectId" uuid NOT NULL,
	"activityId" uuid,
	"fileUploadId" uuid NOT NULL,
	"label" varchar,
	"kind" varchar DEFAULT 'other' NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ProjectLinks" (
	"projectLinkId" uuid PRIMARY KEY NOT NULL,
	"projectId" uuid NOT NULL,
	"activityId" uuid,
	"url" varchar NOT NULL,
	"label" varchar,
	"kind" varchar DEFAULT 'other' NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ProjectActivities" ADD COLUMN "amountCents" integer;--> statement-breakpoint
ALTER TABLE "ProjectActivities" ADD COLUMN "offerStatus" varchar;--> statement-breakpoint
ALTER TABLE "ProjectFiles" ADD CONSTRAINT "ProjectFiles_projectId_Projects_projectId_fk" FOREIGN KEY ("projectId") REFERENCES "public"."Projects"("projectId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ProjectFiles" ADD CONSTRAINT "ProjectFiles_activityId_ProjectActivities_activityId_fk" FOREIGN KEY ("activityId") REFERENCES "public"."ProjectActivities"("activityId") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ProjectFiles" ADD CONSTRAINT "ProjectFiles_fileUploadId_FileUploads_fileUploadId_fk" FOREIGN KEY ("fileUploadId") REFERENCES "public"."FileUploads"("fileUploadId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ProjectLinks" ADD CONSTRAINT "ProjectLinks_projectId_Projects_projectId_fk" FOREIGN KEY ("projectId") REFERENCES "public"."Projects"("projectId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ProjectLinks" ADD CONSTRAINT "ProjectLinks_activityId_ProjectActivities_activityId_fk" FOREIGN KEY ("activityId") REFERENCES "public"."ProjectActivities"("activityId") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "ProjectFiles_projectId_pinned_idx" ON "ProjectFiles" USING btree ("projectId","pinned");--> statement-breakpoint
CREATE INDEX "ProjectFiles_activityId_idx" ON "ProjectFiles" USING btree ("activityId");--> statement-breakpoint
CREATE INDEX "ProjectFiles_fileUploadId_idx" ON "ProjectFiles" USING btree ("fileUploadId");--> statement-breakpoint
CREATE INDEX "ProjectLinks_projectId_pinned_idx" ON "ProjectLinks" USING btree ("projectId","pinned");--> statement-breakpoint
CREATE INDEX "ProjectLinks_activityId_idx" ON "ProjectLinks" USING btree ("activityId");