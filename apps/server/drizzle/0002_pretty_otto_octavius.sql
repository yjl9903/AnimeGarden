CREATE INDEX IF NOT EXISTS "resources_publisher_id_index" ON "resources" USING btree ("publisher_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "resources_fansub_id_index" ON "resources" USING btree ("fansub_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "resources_subject_id_index" ON "resources" USING btree ("subject_id");