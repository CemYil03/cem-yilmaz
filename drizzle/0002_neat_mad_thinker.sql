CREATE TABLE "CvEducation" (
	"cvEducationId" uuid PRIMARY KEY NOT NULL,
	"degreeDe" varchar NOT NULL,
	"degreeEn" varchar NOT NULL,
	"institutionDe" varchar NOT NULL,
	"institutionEn" varchar NOT NULL,
	"subjectDe" varchar DEFAULT '' NOT NULL,
	"subjectEn" varchar DEFAULT '' NOT NULL,
	"startDate" date,
	"endDate" date NOT NULL,
	"notesDe" text DEFAULT '' NOT NULL,
	"notesEn" text DEFAULT '' NOT NULL,
	"position" integer NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "CvExperience" (
	"cvExperienceId" uuid PRIMARY KEY NOT NULL,
	"roleDe" varchar NOT NULL,
	"roleEn" varchar NOT NULL,
	"companyDe" varchar NOT NULL,
	"companyEn" varchar NOT NULL,
	"startDate" date NOT NULL,
	"endDate" date,
	"descriptionDe" text NOT NULL,
	"descriptionEn" text NOT NULL,
	"technologies" text[] DEFAULT '{}' NOT NULL,
	"managerName" varchar,
	"position" integer NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "CvHobby" (
	"cvHobbyId" uuid PRIMARY KEY NOT NULL,
	"textDe" text NOT NULL,
	"textEn" text NOT NULL,
	"since" integer,
	"position" integer NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "CvSkill" (
	"cvSkillId" uuid PRIMARY KEY NOT NULL,
	"category" varchar NOT NULL,
	"label" varchar NOT NULL,
	"position" integer NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "CvEducation_position_idx" ON "CvEducation" USING btree ("position");--> statement-breakpoint
CREATE INDEX "CvExperience_position_idx" ON "CvExperience" USING btree ("position");--> statement-breakpoint
CREATE INDEX "CvHobby_position_idx" ON "CvHobby" USING btree ("position");--> statement-breakpoint
CREATE INDEX "CvSkill_category_idx" ON "CvSkill" USING btree ("category");--> statement-breakpoint
CREATE INDEX "CvSkill_position_idx" ON "CvSkill" USING btree ("position");