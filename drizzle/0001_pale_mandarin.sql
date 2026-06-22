ALTER TABLE "Chats" ADD COLUMN "sessionId" uuid;--> statement-breakpoint
ALTER TABLE "Sessions" ADD COLUMN "ipHash" varchar;--> statement-breakpoint
ALTER TABLE "Chats" ADD CONSTRAINT "Chats_sessionId_Sessions_sessionId_fk" FOREIGN KEY ("sessionId") REFERENCES "public"."Sessions"("sessionId") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "Chats_sessionId_lastModifiedAt_idx" ON "Chats" USING btree ("sessionId","lastModifiedAt");--> statement-breakpoint
CREATE INDEX "Sessions_ipHash_idx" ON "Sessions" USING btree ("ipHash");