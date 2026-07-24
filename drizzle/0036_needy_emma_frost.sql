CREATE TABLE "AdminFinancesAssetValuation" (
	"valuationId" uuid PRIMARY KEY NOT NULL,
	"assetId" uuid NOT NULL,
	"valueCents" integer NOT NULL,
	"shares" numeric(18, 8),
	"valuedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"note" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "AdminFinancesAsset" (
	"assetId" uuid PRIMARY KEY NOT NULL,
	"kind" varchar NOT NULL,
	"name" varchar NOT NULL,
	"location" varchar NOT NULL,
	"currentValueCents" integer DEFAULT 0 NOT NULL,
	"shares" numeric(18, 8),
	"symbol" varchar,
	"isin" varchar,
	"currency" varchar(3) DEFAULT 'EUR' NOT NULL,
	"notes" text,
	"active" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "AdminFinancesAssetValuation" ADD CONSTRAINT "AdminFinancesAssetValuation_assetId_AdminFinancesAsset_assetId_fk" FOREIGN KEY ("assetId") REFERENCES "public"."AdminFinancesAsset"("assetId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "AdminFinancesAssetValuation_assetId_valuedAt_idx" ON "AdminFinancesAssetValuation" USING btree ("assetId","valuedAt");--> statement-breakpoint
CREATE INDEX "AdminFinancesAsset_kind_idx" ON "AdminFinancesAsset" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "AdminFinancesAsset_active_idx" ON "AdminFinancesAsset" USING btree ("active");--> statement-breakpoint
CREATE INDEX "AdminFinancesAsset_location_idx" ON "AdminFinancesAsset" USING btree ("location");