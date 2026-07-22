-- Replace singleton AdminFinancesSettings.monthlyNetIncomeCents with
-- AdminFinancesIncomeStream rows (full-CRUD income list). See
-- docs/features/workspace-finances.md.

CREATE TABLE "AdminFinancesIncomeStream" (
	"incomeStreamId" uuid PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"amountCents" integer NOT NULL,
	"cadence" varchar DEFAULT 'monthly' NOT NULL,
	"currency" varchar(3) DEFAULT 'EUR' NOT NULL,
	"notes" text,
	"active" boolean DEFAULT true NOT NULL,
	"startsOn" date,
	"endsOn" date,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
INSERT INTO "AdminFinancesIncomeStream" ("incomeStreamId", "name", "amountCents", "cadence", "currency", "active", "updatedAt")
SELECT gen_random_uuid(), 'Net income', "monthlyNetIncomeCents", 'monthly', 'EUR', true, now()
FROM "AdminFinancesSettings"
WHERE "monthlyNetIncomeCents" IS NOT NULL;
--> statement-breakpoint
DROP TABLE "AdminFinancesSettings" CASCADE;--> statement-breakpoint
CREATE INDEX "AdminFinancesIncomeStream_active_idx" ON "AdminFinancesIncomeStream" USING btree ("active");
