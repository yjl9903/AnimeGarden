ALTER TABLE "resources" ADD COLUMN "duplicated_id" integer;--> statement-breakpoint
ALTER TABLE "resources" DROP COLUMN IF EXISTS "is_duplicated";