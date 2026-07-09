CREATE TABLE "Shows" (
	"showId" uuid PRIMARY KEY NOT NULL,
	"title" varchar NOT NULL,
	"tmdbId" integer,
	"posterUrl" varchar,
	"backdropUrl" varchar,
	"firstAirDate" date,
	"overview" text,
	"status" varchar DEFAULT 'watchlist' NOT NULL,
	"rating" integer,
	"notes" text,
	"topics" text[] DEFAULT '{}' NOT NULL,
	"isCompleted" boolean DEFAULT false NOT NULL,
	"nextSeasonReleaseDate" date,
	"nextSeasonReleaseRough" varchar,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "Shows_tmdbId_key" ON "Shows" USING btree ("tmdbId");--> statement-breakpoint
CREATE INDEX "Shows_status_idx" ON "Shows" USING btree ("status");