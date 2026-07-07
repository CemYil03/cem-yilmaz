CREATE TABLE "MedicalAppointments" (
	"appointmentId" uuid PRIMARY KEY NOT NULL,
	"category" varchar DEFAULT 'other' NOT NULL,
	"providerName" varchar,
	"title" varchar NOT NULL,
	"notes" text,
	"scheduledAt" timestamp with time zone NOT NULL,
	"completedAt" timestamp with time zone,
	"nextDueAt" timestamp with time zone,
	"status" varchar DEFAULT 'scheduled' NOT NULL,
	"topics" text[] DEFAULT '{}' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "MedicalRecordFiles" (
	"recordFileId" uuid PRIMARY KEY NOT NULL,
	"recordId" uuid NOT NULL,
	"fileUploadId" uuid NOT NULL,
	"label" varchar,
	"pinned" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "MedicalRecords" (
	"recordId" uuid PRIMARY KEY NOT NULL,
	"category" varchar DEFAULT 'other' NOT NULL,
	"title" varchar NOT NULL,
	"summary" text NOT NULL,
	"severity" varchar,
	"symptoms" text[] DEFAULT '{}' NOT NULL,
	"bodyAreas" text[] DEFAULT '{}' NOT NULL,
	"occurredAt" timestamp with time zone,
	"resolvedAt" timestamp with time zone,
	"appointmentId" uuid,
	"topics" text[] DEFAULT '{}' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "MedicalRecordFiles" ADD CONSTRAINT "MedicalRecordFiles_recordId_MedicalRecords_recordId_fk" FOREIGN KEY ("recordId") REFERENCES "public"."MedicalRecords"("recordId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "MedicalRecordFiles" ADD CONSTRAINT "MedicalRecordFiles_fileUploadId_FileUploads_fileUploadId_fk" FOREIGN KEY ("fileUploadId") REFERENCES "public"."FileUploads"("fileUploadId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "MedicalRecords" ADD CONSTRAINT "MedicalRecords_appointmentId_MedicalAppointments_appointmentId_fk" FOREIGN KEY ("appointmentId") REFERENCES "public"."MedicalAppointments"("appointmentId") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "MedicalAppointments_category_idx" ON "MedicalAppointments" USING btree ("category");--> statement-breakpoint
CREATE INDEX "MedicalAppointments_scheduledAt_idx" ON "MedicalAppointments" USING btree ("scheduledAt");--> statement-breakpoint
CREATE INDEX "MedicalRecordFiles_recordId_pinned_idx" ON "MedicalRecordFiles" USING btree ("recordId","pinned");--> statement-breakpoint
CREATE INDEX "MedicalRecordFiles_fileUploadId_idx" ON "MedicalRecordFiles" USING btree ("fileUploadId");--> statement-breakpoint
CREATE INDEX "MedicalRecords_category_idx" ON "MedicalRecords" USING btree ("category");--> statement-breakpoint
CREATE INDEX "MedicalRecords_appointmentId_idx" ON "MedicalRecords" USING btree ("appointmentId");--> statement-breakpoint
CREATE INDEX "MedicalRecords_occurredAt_idx" ON "MedicalRecords" USING btree ("occurredAt");