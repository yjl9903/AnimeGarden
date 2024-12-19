ALTER TABLE "resources" ALTER COLUMN "magnet" SET DATA TYPE varchar(256);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "magnet_index" ON "resources" USING btree ("magnet");