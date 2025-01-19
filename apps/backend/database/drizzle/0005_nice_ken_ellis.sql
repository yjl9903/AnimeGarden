ALTER TABLE "subjects" ALTER COLUMN "bangumi_id" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "unique_subjects_bangumi_id" ON "subjects" USING btree ("bangumi_id");--> statement-breakpoint
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_bangumi_id_unique" UNIQUE("bangumi_id");