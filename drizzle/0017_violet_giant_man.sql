CREATE TABLE "MediaChannels" (
	"channelId" uuid PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"platform" varchar DEFAULT 'youtube' NOT NULL,
	"url" varchar NOT NULL,
	"handle" varchar,
	"avatarUrl" varchar,
	"description" text,
	"topics" text[] DEFAULT '{}' NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Movies" (
	"movieId" uuid PRIMARY KEY NOT NULL,
	"title" varchar NOT NULL,
	"tmdbId" integer,
	"posterUrl" varchar,
	"backdropUrl" varchar,
	"releaseDate" date,
	"runtimeMinutes" integer,
	"overview" text,
	"status" varchar DEFAULT 'watchlist' NOT NULL,
	"rating" integer,
	"watchedAt" timestamp with time zone,
	"notes" text,
	"topics" text[] DEFAULT '{}' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "MediaChannels_priority_idx" ON "MediaChannels" USING btree ("priority");--> statement-breakpoint
CREATE UNIQUE INDEX "Movies_tmdbId_key" ON "Movies" USING btree ("tmdbId");--> statement-breakpoint
CREATE INDEX "Movies_status_idx" ON "Movies" USING btree ("status");