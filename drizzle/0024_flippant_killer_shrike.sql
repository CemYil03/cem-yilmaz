CREATE TABLE "AdminFinancesSettings" (
	"userId" uuid PRIMARY KEY NOT NULL,
	"monthlyNetIncomeCents" integer,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "FinanceRecurringCosts" (
	"costId" uuid PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"categoryKey" varchar DEFAULT 'other' NOT NULL,
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
ALTER TABLE "AdminFinancesSettings" ADD CONSTRAINT "AdminFinancesSettings_userId_Users_userId_fk" FOREIGN KEY ("userId") REFERENCES "public"."Users"("userId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "FinanceRecurringCosts_categoryKey_idx" ON "FinanceRecurringCosts" USING btree ("categoryKey");--> statement-breakpoint
CREATE INDEX "FinanceRecurringCosts_active_idx" ON "FinanceRecurringCosts" USING btree ("active");