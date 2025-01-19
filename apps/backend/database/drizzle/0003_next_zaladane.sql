CREATE TABLE IF NOT EXISTS "details" (
	"id" integer PRIMARY KEY NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"magnets" json DEFAULT '[]'::json,
	"files" json DEFAULT '[]'::json,
	"has_more_files" boolean DEFAULT false,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "details" ADD CONSTRAINT "details_id_resources_id_fk" FOREIGN KEY ("id") REFERENCES "public"."resources"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
