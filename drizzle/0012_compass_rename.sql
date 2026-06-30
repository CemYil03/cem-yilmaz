-- Rename the AI-built "profile" feature to "compass".
--
-- Hand-authored migration: Drizzle's diff generator can't tell a rename from a
-- drop+create, so we spell out the ALTERs to preserve the singleton row's data
-- and every observation history. See docs/features/compass.md.

ALTER TABLE "Profile" RENAME TO "Compass";--> statement-breakpoint
ALTER TABLE "Compass" RENAME COLUMN "profileId" TO "compassId";--> statement-breakpoint
ALTER TABLE "Compass" RENAME COLUMN "psychProfile" TO "psychology";--> statement-breakpoint

ALTER TABLE "ProfileObservations" RENAME TO "CompassObservations";--> statement-breakpoint
ALTER TABLE "ProfileMessageAnalysis" RENAME TO "CompassMessageAnalysis";--> statement-breakpoint

ALTER INDEX "ProfileObservations_category_createdAt_idx" RENAME TO "CompassObservations_category_createdAt_idx";--> statement-breakpoint
ALTER INDEX "ProfileObservations_sourceChatMessageId_idx" RENAME TO "CompassObservations_sourceChatMessageId_idx";--> statement-breakpoint
ALTER INDEX "ProfileObservations_createdAt_idx" RENAME TO "CompassObservations_createdAt_idx";--> statement-breakpoint

ALTER TABLE "CompassObservations" RENAME CONSTRAINT "ProfileObservations_sourceChatMessageId_ChatMessages_chatMessageId_fk" TO "CompassObservations_sourceChatMessageId_ChatMessages_chatMessageId_fk";--> statement-breakpoint
ALTER TABLE "CompassMessageAnalysis" RENAME CONSTRAINT "ProfileMessageAnalysis_chatMessageId_ChatMessages_chatMessageId_fk" TO "CompassMessageAnalysis_chatMessageId_ChatMessages_chatMessageId_fk";
