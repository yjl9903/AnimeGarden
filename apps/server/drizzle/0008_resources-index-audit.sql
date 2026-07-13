ALTER TABLE "resources" ADD COLUMN "indexed_at" timestamp with time zone;--> statement-breakpoint
UPDATE "resources" SET "indexed_at" = "fetched_at";--> statement-breakpoint
ALTER TABLE "resources" ALTER COLUMN "indexed_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "resources" ALTER COLUMN "indexed_at" SET NOT NULL;--> statement-breakpoint
DROP INDEX "resources_title_index";--> statement-breakpoint
DROP INDEX "resources_title_alt_index";--> statement-breakpoint
DROP INDEX "resources_live_title_created_at_index";--> statement-breakpoint
DROP INDEX "resources_live_magnet_created_at_index";--> statement-breakpoint
DROP INDEX "resources_duplicated_id_not_null_index";--> statement-breakpoint
DROP INDEX "resources_sort_by_created_at";--> statement-breakpoint
DROP INDEX "resources_live_created_at_index";--> statement-breakpoint
DROP INDEX "resources_live_subject_created_at_index";--> statement-breakpoint
DROP INDEX "resources_live_type_created_at_index";--> statement-breakpoint
DROP INDEX "resources_live_fansub_created_at_index";--> statement-breakpoint
DROP INDEX "resources_live_publisher_created_at_index";--> statement-breakpoint
CREATE INDEX "resources_provider_created_at_id_index" ON "resources" USING btree ("provider_name","created_at" DESC NULLS FIRST,"id" DESC NULLS FIRST) WHERE "resources"."is_deleted" = false;--> statement-breakpoint
CREATE INDEX "resources_sort_by_created_at" ON "resources" USING btree ("created_at" DESC NULLS FIRST,"id" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "resources_live_created_at_index" ON "resources" USING btree ("created_at" DESC NULLS FIRST,"id" DESC NULLS FIRST) WHERE "resources"."is_deleted" = false AND "resources"."duplicated_id" IS NULL;--> statement-breakpoint
CREATE INDEX "resources_live_subject_created_at_index" ON "resources" USING btree ("subject_id","created_at" DESC NULLS FIRST,"id" DESC NULLS FIRST) WHERE "resources"."is_deleted" = false AND "resources"."duplicated_id" IS NULL AND "resources"."subject_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "resources_live_type_created_at_index" ON "resources" USING btree ("type","created_at" DESC NULLS FIRST,"id" DESC NULLS FIRST) WHERE "resources"."is_deleted" = false AND "resources"."duplicated_id" IS NULL;--> statement-breakpoint
CREATE INDEX "resources_live_fansub_created_at_index" ON "resources" USING btree ("fansub_id","created_at" DESC NULLS FIRST,"id" DESC NULLS FIRST) WHERE "resources"."is_deleted" = false AND "resources"."duplicated_id" IS NULL AND "resources"."fansub_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "resources_live_publisher_created_at_index" ON "resources" USING btree ("publisher_id","created_at" DESC NULLS FIRST,"id" DESC NULLS FIRST) WHERE "resources"."is_deleted" = false AND "resources"."duplicated_id" IS NULL;
