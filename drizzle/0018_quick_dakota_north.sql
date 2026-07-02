CREATE TABLE "ItemFiles" (
	"itemFileId" uuid PRIMARY KEY NOT NULL,
	"itemId" uuid NOT NULL,
	"serviceEntryId" uuid,
	"fileUploadId" uuid NOT NULL,
	"label" varchar,
	"kind" varchar DEFAULT 'other' NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ItemServiceEntries" (
	"serviceEntryId" uuid PRIMARY KEY NOT NULL,
	"itemId" uuid NOT NULL,
	"kind" varchar DEFAULT 'service' NOT NULL,
	"performedAt" date NOT NULL,
	"vendor" varchar,
	"costCents" integer,
	"notes" text,
	"nextDueAt" date,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ItemValuations" (
	"valuationId" uuid PRIMARY KEY NOT NULL,
	"itemId" uuid NOT NULL,
	"valueCents" integer NOT NULL,
	"valuedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"note" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Items" (
	"itemId" uuid PRIMARY KEY NOT NULL,
	"categoryKey" varchar DEFAULT 'other' NOT NULL,
	"name" varchar NOT NULL,
	"brand" varchar,
	"model" varchar,
	"serialNumber" varchar,
	"purchasedAt" date,
	"purchasePriceCents" integer,
	"currentValueCents" integer,
	"condition" varchar,
	"disposalState" varchar DEFAULT 'owned' NOT NULL,
	"disposedAt" timestamp with time zone,
	"warrantyEndsAt" date,
	"warrantyProvider" varchar,
	"warrantyNotes" text,
	"notes" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ItemFiles" ADD CONSTRAINT "ItemFiles_itemId_Items_itemId_fk" FOREIGN KEY ("itemId") REFERENCES "public"."Items"("itemId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ItemFiles" ADD CONSTRAINT "ItemFiles_serviceEntryId_ItemServiceEntries_serviceEntryId_fk" FOREIGN KEY ("serviceEntryId") REFERENCES "public"."ItemServiceEntries"("serviceEntryId") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ItemFiles" ADD CONSTRAINT "ItemFiles_fileUploadId_FileUploads_fileUploadId_fk" FOREIGN KEY ("fileUploadId") REFERENCES "public"."FileUploads"("fileUploadId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ItemServiceEntries" ADD CONSTRAINT "ItemServiceEntries_itemId_Items_itemId_fk" FOREIGN KEY ("itemId") REFERENCES "public"."Items"("itemId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ItemValuations" ADD CONSTRAINT "ItemValuations_itemId_Items_itemId_fk" FOREIGN KEY ("itemId") REFERENCES "public"."Items"("itemId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "ItemFiles_itemId_pinned_idx" ON "ItemFiles" USING btree ("itemId","pinned");--> statement-breakpoint
CREATE INDEX "ItemFiles_serviceEntryId_idx" ON "ItemFiles" USING btree ("serviceEntryId");--> statement-breakpoint
CREATE INDEX "ItemFiles_fileUploadId_idx" ON "ItemFiles" USING btree ("fileUploadId");--> statement-breakpoint
CREATE INDEX "ItemServiceEntries_itemId_performedAt_idx" ON "ItemServiceEntries" USING btree ("itemId","performedAt");--> statement-breakpoint
CREATE INDEX "ItemValuations_itemId_valuedAt_idx" ON "ItemValuations" USING btree ("itemId","valuedAt");--> statement-breakpoint
CREATE INDEX "Items_disposalState_idx" ON "Items" USING btree ("disposalState");--> statement-breakpoint
CREATE INDEX "Items_warrantyEndsAt_idx" ON "Items" USING btree ("warrantyEndsAt");--> statement-breakpoint
CREATE INDEX "Items_categoryKey_idx" ON "Items" USING btree ("categoryKey");