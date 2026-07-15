-- Travel derive-don't-store cleanup. Two changes:
--   1. `status` becomes planning-intent only. The old `active`/`completed`
--      values were pure functions of the trip's date range (today inside it /
--      past it) and drifted; the time-phase is now derived at read time.
--      Both collapse to `planned` — the confirmed-intent value.
--   2. A day no longer stores its calendar date — it is derived from the
--      trip's `startsOn` plus `dayNumber`, so drop the column.
UPDATE "AdminTravelTrip" SET "status" = 'planned' WHERE "status" IN ('active', 'completed');
--> statement-breakpoint
ALTER TABLE "AdminTravelTripDay" DROP COLUMN "date";
