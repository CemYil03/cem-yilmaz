CREATE TABLE "Exercises" (
	"exerciseId" uuid PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"muscleGroup" varchar DEFAULT 'other' NOT NULL,
	"equipment" varchar,
	"notes" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "FoodLogEntries" (
	"logId" uuid PRIMARY KEY NOT NULL,
	"consumedAt" timestamp with time zone NOT NULL,
	"mealType" varchar DEFAULT 'other' NOT NULL,
	"kind" varchar DEFAULT 'food' NOT NULL,
	"description" text NOT NULL,
	"recipeId" uuid,
	"notes" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "MealPlanEntries" (
	"entryId" uuid PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"mealType" varchar DEFAULT 'other' NOT NULL,
	"recipeId" uuid,
	"customText" varchar,
	"notes" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Recipes" (
	"recipeId" uuid PRIMARY KEY NOT NULL,
	"title" varchar NOT NULL,
	"mealType" varchar DEFAULT 'other' NOT NULL,
	"ingredients" text[] DEFAULT '{}' NOT NULL,
	"steps" text,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"isFavorite" boolean DEFAULT false NOT NULL,
	"rating" integer,
	"prepTimeMinutes" integer,
	"servings" integer,
	"sourceUrl" varchar,
	"notes" text,
	"lastMadeAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "WorkoutRoutineItems" (
	"routineItemId" uuid PRIMARY KEY NOT NULL,
	"routineId" uuid NOT NULL,
	"exerciseId" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"targetSets" integer,
	"targetReps" integer,
	"targetWeight" numeric,
	"notes" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "WorkoutRoutines" (
	"routineId" uuid PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"notes" text,
	"position" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "WorkoutSessions" (
	"sessionId" uuid PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"title" varchar,
	"routineId" uuid,
	"durationMinutes" integer,
	"notes" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "WorkoutSets" (
	"setId" uuid PRIMARY KEY NOT NULL,
	"sessionId" uuid NOT NULL,
	"exerciseId" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"weight" numeric,
	"reps" integer,
	"rpe" integer,
	"isWarmup" boolean DEFAULT false NOT NULL,
	"notes" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "FoodLogEntries" ADD CONSTRAINT "FoodLogEntries_recipeId_Recipes_recipeId_fk" FOREIGN KEY ("recipeId") REFERENCES "public"."Recipes"("recipeId") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "MealPlanEntries" ADD CONSTRAINT "MealPlanEntries_recipeId_Recipes_recipeId_fk" FOREIGN KEY ("recipeId") REFERENCES "public"."Recipes"("recipeId") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "WorkoutRoutineItems" ADD CONSTRAINT "WorkoutRoutineItems_routineId_WorkoutRoutines_routineId_fk" FOREIGN KEY ("routineId") REFERENCES "public"."WorkoutRoutines"("routineId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "WorkoutRoutineItems" ADD CONSTRAINT "WorkoutRoutineItems_exerciseId_Exercises_exerciseId_fk" FOREIGN KEY ("exerciseId") REFERENCES "public"."Exercises"("exerciseId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "WorkoutSessions" ADD CONSTRAINT "WorkoutSessions_routineId_WorkoutRoutines_routineId_fk" FOREIGN KEY ("routineId") REFERENCES "public"."WorkoutRoutines"("routineId") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "WorkoutSets" ADD CONSTRAINT "WorkoutSets_sessionId_WorkoutSessions_sessionId_fk" FOREIGN KEY ("sessionId") REFERENCES "public"."WorkoutSessions"("sessionId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "WorkoutSets" ADD CONSTRAINT "WorkoutSets_exerciseId_Exercises_exerciseId_fk" FOREIGN KEY ("exerciseId") REFERENCES "public"."Exercises"("exerciseId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "Exercises_muscleGroup_idx" ON "Exercises" USING btree ("muscleGroup");--> statement-breakpoint
CREATE INDEX "FoodLogEntries_consumedAt_idx" ON "FoodLogEntries" USING btree ("consumedAt");--> statement-breakpoint
CREATE INDEX "MealPlanEntries_date_idx" ON "MealPlanEntries" USING btree ("date");--> statement-breakpoint
CREATE INDEX "Recipes_mealType_idx" ON "Recipes" USING btree ("mealType");--> statement-breakpoint
CREATE INDEX "Recipes_isFavorite_idx" ON "Recipes" USING btree ("isFavorite");--> statement-breakpoint
CREATE INDEX "WorkoutRoutineItems_routineId_position_idx" ON "WorkoutRoutineItems" USING btree ("routineId","position");--> statement-breakpoint
CREATE INDEX "WorkoutRoutines_position_idx" ON "WorkoutRoutines" USING btree ("position");--> statement-breakpoint
CREATE INDEX "WorkoutSessions_date_idx" ON "WorkoutSessions" USING btree ("date");--> statement-breakpoint
CREATE INDEX "WorkoutSets_sessionId_position_idx" ON "WorkoutSets" USING btree ("sessionId","position");--> statement-breakpoint
CREATE INDEX "WorkoutSets_exerciseId_idx" ON "WorkoutSets" USING btree ("exerciseId");