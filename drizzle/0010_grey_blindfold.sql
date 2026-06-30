ALTER TABLE "ProjectActivities" ADD COLUMN "direction" varchar DEFAULT 'internal' NOT NULL;
--> statement-breakpoint
-- Backfill direction for pre-existing rows. The column defaults to `internal`
-- (correct for `work` / `note` / `milestone` and as a safe fallback), but
-- client-facing kinds get a smarter starting point:
--   * `clientContact` → `incoming` (the typical row is "client wrote me")
--   * `meeting`       → `outgoing` (Cem usually books / hosts the meeting)
--   * `offer`         → `outgoing` (offers go out from Cem)
-- These are starting points; the admin can flip direction on any row through
-- the activity editor.
UPDATE "ProjectActivities" SET "direction" = 'incoming' WHERE "kind" = 'clientContact';
--> statement-breakpoint
UPDATE "ProjectActivities" SET "direction" = 'outgoing' WHERE "kind" IN ('meeting', 'offer');
