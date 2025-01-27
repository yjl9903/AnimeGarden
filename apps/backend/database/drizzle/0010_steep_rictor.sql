CREATE TABLE IF NOT EXISTS "collections" (
	"id" serial PRIMARY KEY NOT NULL,
	"hash" varchar(64) NOT NULL,
	"name" varchar(64) DEFAULT '' NOT NULL,
	"user" varchar(64) NOT NULL,
	"filters" json DEFAULT '[]'::json NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "unique_collections_hash" ON "collections" USING btree ("hash");