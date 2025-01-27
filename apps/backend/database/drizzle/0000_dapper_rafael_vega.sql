DO $$ BEGIN
 CREATE TYPE "public"."resources_provider" AS ENUM('dmhy', 'moe', 'ani');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "collections" (
	"id" serial PRIMARY KEY NOT NULL,
	"hash" varchar(64) NOT NULL,
	"name" varchar(64) DEFAULT '' NOT NULL,
	"user" varchar(64) NOT NULL,
	"filters" json DEFAULT '[]'::json NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "details" (
	"id" integer PRIMARY KEY NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"magnets" json DEFAULT '[]'::json NOT NULL,
	"files" json DEFAULT '[]'::json NOT NULL,
	"has_more_files" boolean DEFAULT false NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "providers" (
	"id" "resources_provider" NOT NULL,
	"name" varchar(32) NOT NULL,
	"refreshed_at" timestamp with time zone NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "resources" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider_name" "resources_provider" NOT NULL,
	"provider_id" varchar(128) NOT NULL,
	"title" varchar(1024) NOT NULL,
	"title_alt" varchar(1024) NOT NULL,
	"title_search" "tsvector" NOT NULL,
	"href" text NOT NULL,
	"type" varchar(64) NOT NULL,
	"magnet" varchar(256) NOT NULL,
	"tracker" text NOT NULL,
	"size" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"publisher_id" integer NOT NULL,
	"fansub_id" integer,
	"duplicated_id" integer,
	"subject_id" integer,
	"metadata" json,
	"is_deleted" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "subjects" (
	"bangumi_id" integer PRIMARY KEY NOT NULL,
	"name" varchar(256) NOT NULL,
	"keywords" json NOT NULL,
	"actived_at" timestamp with time zone NOT NULL,
	"is_archived" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(256) NOT NULL,
	CONSTRAINT "tags_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "teams" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(128) NOT NULL,
	"avatar" text,
	"providers" json DEFAULT '{}'::json,
	CONSTRAINT "teams_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(128) NOT NULL,
	"avatar" text,
	"providers" json DEFAULT '{}'::json,
	CONSTRAINT "users_name_unique" UNIQUE("name")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "details" ADD CONSTRAINT "details_id_resources_id_fk" FOREIGN KEY ("id") REFERENCES "public"."resources"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "unique_collections_hash" ON "collections" USING btree ("hash");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "unique_resources_provider_id" ON "resources" USING btree ("provider_name","provider_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "resources_title_index" ON "resources" USING btree ("title");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "resources_title_alt_index" ON "resources" USING btree ("title_alt");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "resources_magnet_index" ON "resources" USING btree ("magnet");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "resources_sort_by_created_at" ON "resources" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "resources_title_search_index" ON "resources" USING gin ("title_search");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "unique_tags_name" ON "tags" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "unique_teams_name" ON "teams" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "unique_users_name" ON "users" USING btree ("name");