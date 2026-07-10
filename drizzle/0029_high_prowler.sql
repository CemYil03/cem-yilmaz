CREATE TABLE "AdminTaxDocument" (
	"documentId" uuid PRIMARY KEY NOT NULL,
	"taxYearId" uuid NOT NULL,
	"kind" varchar DEFAULT 'other' NOT NULL,
	"title" varchar NOT NULL,
	"status" varchar DEFAULT 'needed' NOT NULL,
	"notes" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "AdminTaxExpense" (
	"expenseId" uuid PRIMARY KEY NOT NULL,
	"taxYearId" uuid NOT NULL,
	"incomeSourceId" uuid,
	"categoryKey" varchar DEFAULT 'other' NOT NULL,
	"description" varchar NOT NULL,
	"amountCents" integer NOT NULL,
	"incurredOn" date,
	"deductible" boolean DEFAULT true NOT NULL,
	"notes" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "AdminTaxFile" (
	"taxFileId" uuid PRIMARY KEY NOT NULL,
	"taxYearId" uuid NOT NULL,
	"expenseId" uuid,
	"documentId" uuid,
	"fileUploadId" uuid NOT NULL,
	"label" varchar,
	"kind" varchar DEFAULT 'other' NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "AdminTaxIncomeSource" (
	"incomeSourceId" uuid PRIMARY KEY NOT NULL,
	"taxYearId" uuid NOT NULL,
	"kind" varchar DEFAULT 'other' NOT NULL,
	"label" varchar NOT NULL,
	"grossAmountCents" integer,
	"notes" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "AdminTaxYear" (
	"taxYearId" uuid PRIMARY KEY NOT NULL,
	"year" integer NOT NULL,
	"status" varchar DEFAULT 'open' NOT NULL,
	"filingDeadline" date,
	"submittedAt" timestamp with time zone,
	"notes" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "AdminTaxDocument" ADD CONSTRAINT "AdminTaxDocument_taxYearId_AdminTaxYear_taxYearId_fk" FOREIGN KEY ("taxYearId") REFERENCES "public"."AdminTaxYear"("taxYearId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "AdminTaxExpense" ADD CONSTRAINT "AdminTaxExpense_taxYearId_AdminTaxYear_taxYearId_fk" FOREIGN KEY ("taxYearId") REFERENCES "public"."AdminTaxYear"("taxYearId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "AdminTaxExpense" ADD CONSTRAINT "AdminTaxExpense_incomeSourceId_AdminTaxIncomeSource_incomeSourceId_fk" FOREIGN KEY ("incomeSourceId") REFERENCES "public"."AdminTaxIncomeSource"("incomeSourceId") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "AdminTaxFile" ADD CONSTRAINT "AdminTaxFile_taxYearId_AdminTaxYear_taxYearId_fk" FOREIGN KEY ("taxYearId") REFERENCES "public"."AdminTaxYear"("taxYearId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "AdminTaxFile" ADD CONSTRAINT "AdminTaxFile_expenseId_AdminTaxExpense_expenseId_fk" FOREIGN KEY ("expenseId") REFERENCES "public"."AdminTaxExpense"("expenseId") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "AdminTaxFile" ADD CONSTRAINT "AdminTaxFile_documentId_AdminTaxDocument_documentId_fk" FOREIGN KEY ("documentId") REFERENCES "public"."AdminTaxDocument"("documentId") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "AdminTaxFile" ADD CONSTRAINT "AdminTaxFile_fileUploadId_FileUploads_fileUploadId_fk" FOREIGN KEY ("fileUploadId") REFERENCES "public"."FileUploads"("fileUploadId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "AdminTaxIncomeSource" ADD CONSTRAINT "AdminTaxIncomeSource_taxYearId_AdminTaxYear_taxYearId_fk" FOREIGN KEY ("taxYearId") REFERENCES "public"."AdminTaxYear"("taxYearId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "AdminTaxDocument_taxYearId_idx" ON "AdminTaxDocument" USING btree ("taxYearId");--> statement-breakpoint
CREATE INDEX "AdminTaxDocument_status_idx" ON "AdminTaxDocument" USING btree ("status");--> statement-breakpoint
CREATE INDEX "AdminTaxExpense_taxYearId_idx" ON "AdminTaxExpense" USING btree ("taxYearId");--> statement-breakpoint
CREATE INDEX "AdminTaxExpense_categoryKey_idx" ON "AdminTaxExpense" USING btree ("categoryKey");--> statement-breakpoint
CREATE INDEX "AdminTaxExpense_incomeSourceId_idx" ON "AdminTaxExpense" USING btree ("incomeSourceId");--> statement-breakpoint
CREATE INDEX "AdminTaxFile_taxYearId_idx" ON "AdminTaxFile" USING btree ("taxYearId");--> statement-breakpoint
CREATE INDEX "AdminTaxFile_expenseId_idx" ON "AdminTaxFile" USING btree ("expenseId");--> statement-breakpoint
CREATE INDEX "AdminTaxFile_documentId_idx" ON "AdminTaxFile" USING btree ("documentId");--> statement-breakpoint
CREATE INDEX "AdminTaxFile_fileUploadId_idx" ON "AdminTaxFile" USING btree ("fileUploadId");--> statement-breakpoint
CREATE INDEX "AdminTaxIncomeSource_taxYearId_idx" ON "AdminTaxIncomeSource" USING btree ("taxYearId");--> statement-breakpoint
CREATE INDEX "AdminTaxIncomeSource_kind_idx" ON "AdminTaxIncomeSource" USING btree ("kind");--> statement-breakpoint
CREATE UNIQUE INDEX "AdminTaxYear_year_idx" ON "AdminTaxYear" USING btree ("year");