CREATE TABLE "TtsAudioCache" (
	"contentHash" text PRIMARY KEY NOT NULL,
	"mediaType" varchar NOT NULL,
	"voice" varchar NOT NULL,
	"model" varchar NOT NULL,
	"format" varchar NOT NULL,
	"size" integer NOT NULL,
	"bytes" "bytea" NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"lastAccessedAt" timestamp with time zone DEFAULT now() NOT NULL
);
