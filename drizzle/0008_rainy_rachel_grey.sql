CREATE TABLE "AdminChatConfig" (
	"adminChatConfigId" uuid PRIMARY KEY NOT NULL,
	"defaultModelId" varchar NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
