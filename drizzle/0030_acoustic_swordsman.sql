CREATE TABLE "WorkspaceFile" (
	"workspaceFileId" uuid PRIMARY KEY NOT NULL,
	"userId" uuid NOT NULL,
	"fileUploadId" uuid NOT NULL,
	"filename" varchar NOT NULL,
	"label" varchar,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "WorkspaceFile" ADD CONSTRAINT "WorkspaceFile_userId_Users_userId_fk" FOREIGN KEY ("userId") REFERENCES "public"."Users"("userId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "WorkspaceFile" ADD CONSTRAINT "WorkspaceFile_fileUploadId_FileUploads_fileUploadId_fk" FOREIGN KEY ("fileUploadId") REFERENCES "public"."FileUploads"("fileUploadId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "WorkspaceFile_userId_idx" ON "WorkspaceFile" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "WorkspaceFile_fileUploadId_idx" ON "WorkspaceFile" USING btree ("fileUploadId");