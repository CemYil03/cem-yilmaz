CREATE TABLE "TripActivities" (
	"tripActivityId" uuid PRIMARY KEY NOT NULL,
	"tripDayId" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"startsAt" varchar(8),
	"endsAt" varchar(8),
	"title" varchar NOT NULL,
	"location" varchar,
	"url" varchar,
	"notes" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "TripDays" (
	"tripDayId" uuid PRIMARY KEY NOT NULL,
	"tripId" uuid NOT NULL,
	"dayNumber" integer NOT NULL,
	"date" date,
	"title" varchar,
	"summary" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "TripPackingItems" (
	"tripPackingItemId" uuid PRIMARY KEY NOT NULL,
	"tripId" uuid NOT NULL,
	"category" varchar DEFAULT 'Other' NOT NULL,
	"label" varchar NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"packed" boolean DEFAULT false NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Trips" (
	"tripId" uuid PRIMARY KEY NOT NULL,
	"title" varchar NOT NULL,
	"destination" varchar NOT NULL,
	"startsOn" date,
	"endsOn" date,
	"status" varchar DEFAULT 'draft' NOT NULL,
	"transportMode" varchar,
	"accommodation" text,
	"notes" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "TripActivities" ADD CONSTRAINT "TripActivities_tripDayId_TripDays_tripDayId_fk" FOREIGN KEY ("tripDayId") REFERENCES "public"."TripDays"("tripDayId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "TripDays" ADD CONSTRAINT "TripDays_tripId_Trips_tripId_fk" FOREIGN KEY ("tripId") REFERENCES "public"."Trips"("tripId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "TripPackingItems" ADD CONSTRAINT "TripPackingItems_tripId_Trips_tripId_fk" FOREIGN KEY ("tripId") REFERENCES "public"."Trips"("tripId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "TripActivities_tripDayId_position_idx" ON "TripActivities" USING btree ("tripDayId","position");--> statement-breakpoint
CREATE UNIQUE INDEX "TripDays_tripId_dayNumber_uniq" ON "TripDays" USING btree ("tripId","dayNumber");--> statement-breakpoint
CREATE INDEX "TripDays_tripId_idx" ON "TripDays" USING btree ("tripId");--> statement-breakpoint
CREATE INDEX "TripPackingItems_tripId_category_position_idx" ON "TripPackingItems" USING btree ("tripId","category","position");--> statement-breakpoint
CREATE INDEX "Trips_status_idx" ON "Trips" USING btree ("status");--> statement-breakpoint
CREATE INDEX "Trips_startsOn_idx" ON "Trips" USING btree ("startsOn");