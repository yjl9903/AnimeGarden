DROP INDEX IF EXISTS "sort_by_created_at";--> statement-breakpoint
ALTER TABLE "resources" ADD COLUMN "magnet2" text;--> statement-breakpoint
ALTER TABLE "resources" ADD COLUMN "magnet_user" text;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sort_by_created_at" ON "resources" USING btree ("created_at" DESC NULLS LAST);