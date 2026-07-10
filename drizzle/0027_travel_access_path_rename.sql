-- Rename the Travel tables to the entity-access-path convention.
--
-- Hand-authored migration: Drizzle's diff generator can't tell a rename from a
-- drop+create, so we spell out the ALTERs to preserve every trip, day,
-- activity, and packing-item row. The tables now carry the `AdminTravel`
-- prefix so the physical name matches the GraphQL type — see
-- docs/conventions.md ("Type & input naming") and docs/features/workspace-travel.md.

ALTER TABLE "Trips" RENAME TO "AdminTravelTrip";--> statement-breakpoint
ALTER TABLE "TripDays" RENAME TO "AdminTravelTripDay";--> statement-breakpoint
ALTER TABLE "TripActivities" RENAME TO "AdminTravelTripActivity";--> statement-breakpoint
ALTER TABLE "TripPackingItems" RENAME TO "AdminTravelTripPackingItem";--> statement-breakpoint

ALTER INDEX "Trips_status_idx" RENAME TO "AdminTravelTrip_status_idx";--> statement-breakpoint
ALTER INDEX "Trips_startsOn_idx" RENAME TO "AdminTravelTrip_startsOn_idx";--> statement-breakpoint
ALTER INDEX "TripDays_tripId_dayNumber_uniq" RENAME TO "AdminTravelTripDay_tripId_dayNumber_uniq";--> statement-breakpoint
ALTER INDEX "TripDays_tripId_idx" RENAME TO "AdminTravelTripDay_tripId_idx";--> statement-breakpoint
ALTER INDEX "TripActivities_tripDayId_position_idx" RENAME TO "AdminTravelTripActivity_tripDayId_position_idx";--> statement-breakpoint
ALTER INDEX "TripPackingItems_tripId_category_position_idx" RENAME TO "AdminTravelTripPackingItem_tripId_category_position_idx";--> statement-breakpoint

ALTER TABLE "AdminTravelTripDay" RENAME CONSTRAINT "TripDays_tripId_Trips_tripId_fk" TO "AdminTravelTripDay_tripId_AdminTravelTrip_tripId_fk";--> statement-breakpoint
ALTER TABLE "AdminTravelTripActivity" RENAME CONSTRAINT "TripActivities_tripDayId_TripDays_tripDayId_fk" TO "AdminTravelTripActivity_tripDayId_AdminTravelTripDay_tripDayId_fk";--> statement-breakpoint
ALTER TABLE "AdminTravelTripPackingItem" RENAME CONSTRAINT "TripPackingItems_tripId_Trips_tripId_fk" TO "AdminTravelTripPackingItem_tripId_AdminTravelTrip_tripId_fk";
