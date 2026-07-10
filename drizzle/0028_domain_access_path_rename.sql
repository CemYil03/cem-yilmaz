-- Rename the Media / Inventory / Medical / Finances / Nutrition / Fitness /
-- Projects domain tables to the entity-access-path convention.
--
-- Hand-authored: Drizzle's diff generator can't tell a rename from a
-- drop+create, so we spell out the ALTERs (tables, indexes, unique + FK
-- constraints) to preserve every row. See docs/conventions.md
-- ("Type & input naming") and the 0012 / 0027 rename precedents.

ALTER TABLE "Movies" RENAME TO "AdminMediaMovie";--> statement-breakpoint
ALTER TABLE "Shows" RENAME TO "AdminMediaShow";--> statement-breakpoint
ALTER TABLE "MediaChannels" RENAME TO "AdminMediaChannel";--> statement-breakpoint
ALTER TABLE "Items" RENAME TO "AdminInventoryItem";--> statement-breakpoint
ALTER TABLE "ItemValuations" RENAME TO "AdminInventoryItemValuation";--> statement-breakpoint
ALTER TABLE "ItemServiceEntries" RENAME TO "AdminInventoryItemServiceEntry";--> statement-breakpoint
ALTER TABLE "ItemFiles" RENAME TO "AdminInventoryItemFile";--> statement-breakpoint
ALTER TABLE "MedicalAppointments" RENAME TO "AdminMedicalAppointment";--> statement-breakpoint
ALTER TABLE "MedicalRecords" RENAME TO "AdminMedicalRecord";--> statement-breakpoint
ALTER TABLE "MedicalRecordFiles" RENAME TO "AdminMedicalRecordFile";--> statement-breakpoint
ALTER TABLE "FinanceRecurringCosts" RENAME TO "AdminFinancesRecurringCost";--> statement-breakpoint
ALTER TABLE "Recipes" RENAME TO "AdminNutritionRecipe";--> statement-breakpoint
ALTER TABLE "MealPlanEntries" RENAME TO "AdminNutritionMealPlanEntry";--> statement-breakpoint
ALTER TABLE "FoodLogEntries" RENAME TO "AdminNutritionFoodLogEntry";--> statement-breakpoint
ALTER TABLE "Supplements" RENAME TO "AdminNutritionSupplement";--> statement-breakpoint
ALTER TABLE "SupplementNutrients" RENAME TO "AdminNutritionSupplementNutrient";--> statement-breakpoint
ALTER TABLE "Exercises" RENAME TO "AdminFitnessExercise";--> statement-breakpoint
ALTER TABLE "WorkoutRoutines" RENAME TO "AdminFitnessWorkoutRoutine";--> statement-breakpoint
ALTER TABLE "WorkoutRoutineItems" RENAME TO "AdminFitnessWorkoutRoutineItem";--> statement-breakpoint
ALTER TABLE "WorkoutSessions" RENAME TO "AdminFitnessWorkoutSession";--> statement-breakpoint
ALTER TABLE "WorkoutSets" RENAME TO "AdminFitnessWorkoutSet";--> statement-breakpoint
ALTER TABLE "ProjectRequests" RENAME TO "AdminProjectRequest";--> statement-breakpoint
ALTER TABLE "Projects" RENAME TO "AdminProject";--> statement-breakpoint
ALTER TABLE "Tasks" RENAME TO "AdminProjectTask";--> statement-breakpoint
ALTER TABLE "ProjectActivities" RENAME TO "AdminProjectActivity";--> statement-breakpoint
ALTER TABLE "ProjectLinks" RENAME TO "AdminProjectLink";--> statement-breakpoint
ALTER TABLE "ProjectFiles" RENAME TO "AdminProjectFile";--> statement-breakpoint
ALTER INDEX "Movies_status_idx" RENAME TO "AdminMediaMovie_status_idx";--> statement-breakpoint
ALTER INDEX "Movies_tmdbId_key" RENAME TO "AdminMediaMovie_tmdbId_key";--> statement-breakpoint
ALTER INDEX "Shows_status_idx" RENAME TO "AdminMediaShow_status_idx";--> statement-breakpoint
ALTER INDEX "Shows_tmdbId_key" RENAME TO "AdminMediaShow_tmdbId_key";--> statement-breakpoint
ALTER INDEX "MediaChannels_priority_idx" RENAME TO "AdminMediaChannel_priority_idx";--> statement-breakpoint
ALTER INDEX "Items_disposalState_idx" RENAME TO "AdminInventoryItem_disposalState_idx";--> statement-breakpoint
ALTER INDEX "Items_categoryKey_idx" RENAME TO "AdminInventoryItem_categoryKey_idx";--> statement-breakpoint
ALTER INDEX "Items_warrantyEndsAt_idx" RENAME TO "AdminInventoryItem_warrantyEndsAt_idx";--> statement-breakpoint
ALTER INDEX "ItemValuations_itemId_valuedAt_idx" RENAME TO "AdminInventoryItemValuation_itemId_valuedAt_idx";--> statement-breakpoint
ALTER INDEX "ItemServiceEntries_itemId_performedAt_idx" RENAME TO "AdminInventoryItemServiceEntry_itemId_performedAt_idx";--> statement-breakpoint
ALTER INDEX "ItemFiles_itemId_pinned_idx" RENAME TO "AdminInventoryItemFile_itemId_pinned_idx";--> statement-breakpoint
ALTER INDEX "ItemFiles_fileUploadId_idx" RENAME TO "AdminInventoryItemFile_fileUploadId_idx";--> statement-breakpoint
ALTER INDEX "ItemFiles_serviceEntryId_idx" RENAME TO "AdminInventoryItemFile_serviceEntryId_idx";--> statement-breakpoint
ALTER INDEX "MedicalAppointments_scheduledAt_idx" RENAME TO "AdminMedicalAppointment_scheduledAt_idx";--> statement-breakpoint
ALTER INDEX "MedicalAppointments_category_idx" RENAME TO "AdminMedicalAppointment_category_idx";--> statement-breakpoint
ALTER INDEX "MedicalRecords_occurredAt_idx" RENAME TO "AdminMedicalRecord_occurredAt_idx";--> statement-breakpoint
ALTER INDEX "MedicalRecords_appointmentId_idx" RENAME TO "AdminMedicalRecord_appointmentId_idx";--> statement-breakpoint
ALTER INDEX "MedicalRecords_category_idx" RENAME TO "AdminMedicalRecord_category_idx";--> statement-breakpoint
ALTER INDEX "MedicalRecordFiles_fileUploadId_idx" RENAME TO "AdminMedicalRecordFile_fileUploadId_idx";--> statement-breakpoint
ALTER INDEX "MedicalRecordFiles_recordId_pinned_idx" RENAME TO "AdminMedicalRecordFile_recordId_pinned_idx";--> statement-breakpoint
ALTER INDEX "FinanceRecurringCosts_categoryKey_idx" RENAME TO "AdminFinancesRecurringCost_categoryKey_idx";--> statement-breakpoint
ALTER INDEX "FinanceRecurringCosts_active_idx" RENAME TO "AdminFinancesRecurringCost_active_idx";--> statement-breakpoint
ALTER INDEX "Recipes_isFavorite_idx" RENAME TO "AdminNutritionRecipe_isFavorite_idx";--> statement-breakpoint
ALTER INDEX "Recipes_mealType_idx" RENAME TO "AdminNutritionRecipe_mealType_idx";--> statement-breakpoint
ALTER INDEX "MealPlanEntries_date_idx" RENAME TO "AdminNutritionMealPlanEntry_date_idx";--> statement-breakpoint
ALTER INDEX "FoodLogEntries_consumedAt_idx" RENAME TO "AdminNutritionFoodLogEntry_consumedAt_idx";--> statement-breakpoint
ALTER INDEX "Supplements_name_idx" RENAME TO "AdminNutritionSupplement_name_idx";--> statement-breakpoint
ALTER INDEX "SupplementNutrients_supplementId_idx" RENAME TO "AdminNutritionSupplementNutrient_supplementId_idx";--> statement-breakpoint
ALTER INDEX "Exercises_muscleGroup_idx" RENAME TO "AdminFitnessExercise_muscleGroup_idx";--> statement-breakpoint
ALTER INDEX "WorkoutRoutines_position_idx" RENAME TO "AdminFitnessWorkoutRoutine_position_idx";--> statement-breakpoint
ALTER INDEX "WorkoutRoutineItems_routineId_position_idx" RENAME TO "AdminFitnessWorkoutRoutineItem_routineId_position_idx";--> statement-breakpoint
ALTER INDEX "WorkoutSessions_date_idx" RENAME TO "AdminFitnessWorkoutSession_date_idx";--> statement-breakpoint
ALTER INDEX "WorkoutSets_sessionId_position_idx" RENAME TO "AdminFitnessWorkoutSet_sessionId_position_idx";--> statement-breakpoint
ALTER INDEX "WorkoutSets_exerciseId_idx" RENAME TO "AdminFitnessWorkoutSet_exerciseId_idx";--> statement-breakpoint
ALTER INDEX "ProjectRequests_status_createdAt_idx" RENAME TO "AdminProjectRequest_status_createdAt_idx";--> statement-breakpoint
ALTER INDEX "ProjectRequests_chatId_idx" RENAME TO "AdminProjectRequest_chatId_idx";--> statement-breakpoint
ALTER INDEX "Projects_status_position_idx" RENAME TO "AdminProject_status_position_idx";--> statement-breakpoint
ALTER INDEX "Projects_sourceRequestId_idx" RENAME TO "AdminProject_sourceRequestId_idx";--> statement-breakpoint
ALTER INDEX "Tasks_projectId_position_idx" RENAME TO "AdminProjectTask_projectId_position_idx";--> statement-breakpoint
ALTER INDEX "Tasks_status_dueAt_idx" RENAME TO "AdminProjectTask_status_dueAt_idx";--> statement-breakpoint
ALTER INDEX "ProjectActivities_projectId_occurredAt_idx" RENAME TO "AdminProjectActivity_projectId_occurredAt_idx";--> statement-breakpoint
ALTER INDEX "ProjectActivities_singleActiveTimer_uniq" RENAME TO "AdminProjectActivity_singleActiveTimer_uniq";--> statement-breakpoint
ALTER INDEX "ProjectActivities_taskId_idx" RENAME TO "AdminProjectActivity_taskId_idx";--> statement-breakpoint
ALTER INDEX "ProjectLinks_activityId_idx" RENAME TO "AdminProjectLink_activityId_idx";--> statement-breakpoint
ALTER INDEX "ProjectLinks_projectId_pinned_idx" RENAME TO "AdminProjectLink_projectId_pinned_idx";--> statement-breakpoint
ALTER INDEX "ProjectFiles_activityId_idx" RENAME TO "AdminProjectFile_activityId_idx";--> statement-breakpoint
ALTER INDEX "ProjectFiles_fileUploadId_idx" RENAME TO "AdminProjectFile_fileUploadId_idx";--> statement-breakpoint
ALTER INDEX "ProjectFiles_projectId_pinned_idx" RENAME TO "AdminProjectFile_projectId_pinned_idx";--> statement-breakpoint
ALTER TABLE "AdminInventoryItemValuation" RENAME CONSTRAINT "ItemValuations_itemId_Items_itemId_fk" TO "AdminInventoryItemValuation_itemId_AdminInventoryItem_itemId_fk";--> statement-breakpoint
ALTER TABLE "AdminInventoryItemServiceEntry" RENAME CONSTRAINT "ItemServiceEntries_itemId_Items_itemId_fk" TO "AdminInventoryItemServiceEntry_itemId_AdminInventoryItem_itemId_fk";--> statement-breakpoint
ALTER TABLE "AdminInventoryItemFile" RENAME CONSTRAINT "ItemFiles_itemId_Items_itemId_fk" TO "AdminInventoryItemFile_itemId_AdminInventoryItem_itemId_fk";--> statement-breakpoint
ALTER TABLE "AdminInventoryItemFile" RENAME CONSTRAINT "ItemFiles_serviceEntryId_ItemServiceEntries_serviceEntryId_fk" TO "AdminInventoryItemFile_serviceEntryId_AdminInventoryItemServiceEntry_serviceEntryId_fk";--> statement-breakpoint
ALTER TABLE "AdminInventoryItemFile" RENAME CONSTRAINT "ItemFiles_fileUploadId_FileUploads_fileUploadId_fk" TO "AdminInventoryItemFile_fileUploadId_FileUploads_fileUploadId_fk";--> statement-breakpoint
ALTER TABLE "AdminMedicalRecord" RENAME CONSTRAINT "MedicalRecords_appointmentId_MedicalAppointments_appointmentId_" TO "AdminMedicalRecord_appointmentId_AdminMedicalAppointment_appointmentId_";--> statement-breakpoint
ALTER TABLE "AdminMedicalRecordFile" RENAME CONSTRAINT "MedicalRecordFiles_recordId_MedicalRecords_recordId_fk" TO "AdminMedicalRecordFile_recordId_AdminMedicalRecord_recordId_fk";--> statement-breakpoint
ALTER TABLE "AdminMedicalRecordFile" RENAME CONSTRAINT "MedicalRecordFiles_fileUploadId_FileUploads_fileUploadId_fk" TO "AdminMedicalRecordFile_fileUploadId_FileUploads_fileUploadId_fk";--> statement-breakpoint
ALTER TABLE "AdminNutritionMealPlanEntry" RENAME CONSTRAINT "MealPlanEntries_recipeId_Recipes_recipeId_fk" TO "AdminNutritionMealPlanEntry_recipeId_AdminNutritionRecipe_recipeId_fk";--> statement-breakpoint
ALTER TABLE "AdminNutritionFoodLogEntry" RENAME CONSTRAINT "FoodLogEntries_recipeId_Recipes_recipeId_fk" TO "AdminNutritionFoodLogEntry_recipeId_AdminNutritionRecipe_recipeId_fk";--> statement-breakpoint
ALTER TABLE "AdminNutritionSupplementNutrient" RENAME CONSTRAINT "SupplementNutrients_supplementId_Supplements_supplementId_fk" TO "AdminNutritionSupplementNutrient_supplementId_AdminNutritionSupplement_supplementId_fk";--> statement-breakpoint
ALTER TABLE "AdminFitnessWorkoutRoutineItem" RENAME CONSTRAINT "WorkoutRoutineItems_routineId_WorkoutRoutines_routineId_fk" TO "AdminFitnessWorkoutRoutineItem_routineId_AdminFitnessWorkoutRoutine_routineId_fk";--> statement-breakpoint
ALTER TABLE "AdminFitnessWorkoutRoutineItem" RENAME CONSTRAINT "WorkoutRoutineItems_exerciseId_Exercises_exerciseId_fk" TO "AdminFitnessWorkoutRoutineItem_exerciseId_AdminFitnessExercise_exerciseId_fk";--> statement-breakpoint
ALTER TABLE "AdminFitnessWorkoutSession" RENAME CONSTRAINT "WorkoutSessions_routineId_WorkoutRoutines_routineId_fk" TO "AdminFitnessWorkoutSession_routineId_AdminFitnessWorkoutRoutine_routineId_fk";--> statement-breakpoint
ALTER TABLE "AdminFitnessWorkoutSet" RENAME CONSTRAINT "WorkoutSets_sessionId_WorkoutSessions_sessionId_fk" TO "AdminFitnessWorkoutSet_sessionId_AdminFitnessWorkoutSession_sessionId_fk";--> statement-breakpoint
ALTER TABLE "AdminFitnessWorkoutSet" RENAME CONSTRAINT "WorkoutSets_exerciseId_Exercises_exerciseId_fk" TO "AdminFitnessWorkoutSet_exerciseId_AdminFitnessExercise_exerciseId_fk";--> statement-breakpoint
ALTER TABLE "AdminProjectRequest" RENAME CONSTRAINT "ProjectRequests_chatId_Chats_chatId_fk" TO "AdminProjectRequest_chatId_Chats_chatId_fk";--> statement-breakpoint
ALTER TABLE "AdminProject" RENAME CONSTRAINT "Projects_sourceRequestId_ProjectRequests_projectRequestId_fk" TO "AdminProject_sourceRequestId_AdminProjectRequest_projectRequestId_fk";--> statement-breakpoint
ALTER TABLE "AdminProjectTask" RENAME CONSTRAINT "Tasks_projectId_Projects_projectId_fk" TO "AdminProjectTask_projectId_AdminProject_projectId_fk";--> statement-breakpoint
ALTER TABLE "AdminProjectActivity" RENAME CONSTRAINT "ProjectActivities_projectId_Projects_projectId_fk" TO "AdminProjectActivity_projectId_AdminProject_projectId_fk";--> statement-breakpoint
ALTER TABLE "AdminProjectActivity" RENAME CONSTRAINT "ProjectActivities_taskId_Tasks_taskId_fk" TO "AdminProjectActivity_taskId_AdminProjectTask_taskId_fk";--> statement-breakpoint
ALTER TABLE "AdminProjectLink" RENAME CONSTRAINT "ProjectLinks_projectId_Projects_projectId_fk" TO "AdminProjectLink_projectId_AdminProject_projectId_fk";--> statement-breakpoint
ALTER TABLE "AdminProjectLink" RENAME CONSTRAINT "ProjectLinks_activityId_ProjectActivities_activityId_fk" TO "AdminProjectLink_activityId_AdminProjectActivity_activityId_fk";--> statement-breakpoint
ALTER TABLE "AdminProjectFile" RENAME CONSTRAINT "ProjectFiles_projectId_Projects_projectId_fk" TO "AdminProjectFile_projectId_AdminProject_projectId_fk";--> statement-breakpoint
ALTER TABLE "AdminProjectFile" RENAME CONSTRAINT "ProjectFiles_activityId_ProjectActivities_activityId_fk" TO "AdminProjectFile_activityId_AdminProjectActivity_activityId_fk";--> statement-breakpoint
ALTER TABLE "AdminProjectFile" RENAME CONSTRAINT "ProjectFiles_fileUploadId_FileUploads_fileUploadId_fk" TO "AdminProjectFile_fileUploadId_FileUploads_fileUploadId_fk";
