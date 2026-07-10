CREATE TABLE "SupplementNutrients" (
	"nutrientId" uuid PRIMARY KEY NOT NULL,
	"supplementId" uuid NOT NULL,
	"name" varchar NOT NULL,
	"amount" varchar,
	"unit" varchar,
	"percentDailyValue" integer,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Supplements" (
	"supplementId" uuid PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"brand" varchar,
	"servingSize" varchar,
	"servingsPerContainer" integer,
	"sourceUrl" varchar,
	"notes" text,
	"researchedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "SupplementNutrients" ADD CONSTRAINT "SupplementNutrients_supplementId_Supplements_supplementId_fk" FOREIGN KEY ("supplementId") REFERENCES "public"."Supplements"("supplementId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "SupplementNutrients_supplementId_idx" ON "SupplementNutrients" USING btree ("supplementId");--> statement-breakpoint
CREATE INDEX "Supplements_name_idx" ON "Supplements" USING btree ("name");