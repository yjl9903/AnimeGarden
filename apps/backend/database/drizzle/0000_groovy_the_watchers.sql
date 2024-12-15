DO $$ BEGIN
 CREATE TYPE "resources_provider" AS ENUM('dmhy', 'moe');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "resources" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider_type" "resources_provider" NOT NULL,
	"provider_id" varchar(256) NOT NULL,
	"href" varchar(256) NOT NULL,
	"title" varchar(256) NOT NULL,
	"title_alt" varchar(256) NOT NULL,
	"type" varchar(256) NOT NULL,
	"size" varchar(256) NOT NULL,
	"magnet" varchar(256) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"fetched_at" timestamp with time zone DEFAULT now(),
	"anitomy" json,
	"fansub_id" integer NOT NULL,
	"publisher_id" integer,
	"is_deleted" boolean DEFAULT false,
	"is_duplicated" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "teams" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider_type" "resources_provider" NOT NULL,
	"provider_id" varchar(256) NOT NULL,
	"name" varchar(256) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider_type" "resources_provider" NOT NULL,
	"provider_id" varchar(256) NOT NULL,
	"name" varchar(256) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "provider_type_id" ON "resources" ("provider_type","provider_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sort_by_created_at" ON "resources" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fansub_index" ON "resources" ("fansub_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "publisher_index" ON "resources" ("publisher_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "resources" ADD CONSTRAINT "resources_fansub_id_teams_id_fk" FOREIGN KEY ("fansub_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "resources" ADD CONSTRAINT "resources_publisher_id_users_id_fk" FOREIGN KEY ("publisher_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
