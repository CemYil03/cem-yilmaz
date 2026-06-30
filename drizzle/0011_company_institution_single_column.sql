-- Collapse the `companyDe`/`companyEn` and `institutionDe`/`institutionEn`
-- pairs to single, untranslated columns. Company names and institution names
-- are proper nouns — they read the same in both locales (see
-- `docs/architecture/content-model.md`). The German column is treated as the
-- source of truth on backfill; in practice both columns held identical text
-- for every real row.

ALTER TABLE "CvExperience" ADD COLUMN "company" varchar;--> statement-breakpoint
UPDATE "CvExperience" SET "company" = "companyDe";--> statement-breakpoint
ALTER TABLE "CvExperience" ALTER COLUMN "company" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "CvExperience" DROP COLUMN "companyDe";--> statement-breakpoint
ALTER TABLE "CvExperience" DROP COLUMN "companyEn";--> statement-breakpoint
ALTER TABLE "CvEducation" ADD COLUMN "institution" varchar;--> statement-breakpoint
UPDATE "CvEducation" SET "institution" = "institutionDe";--> statement-breakpoint
ALTER TABLE "CvEducation" ALTER COLUMN "institution" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "CvEducation" DROP COLUMN "institutionDe";--> statement-breakpoint
ALTER TABLE "CvEducation" DROP COLUMN "institutionEn";
