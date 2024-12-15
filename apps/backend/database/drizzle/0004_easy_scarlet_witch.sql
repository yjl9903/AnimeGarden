ALTER TABLE "resources" DROP CONSTRAINT "resources_fansub_id_teams_id_fk";
--> statement-breakpoint
ALTER TABLE "resources" DROP CONSTRAINT "resources_publisher_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "resources" ALTER COLUMN "fansub_id" SET DATA TYPE varchar(128);--> statement-breakpoint
ALTER TABLE "resources" ALTER COLUMN "publisher_id" SET DATA TYPE varchar(128);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "resources" ADD CONSTRAINT "resource_publisher_fk" FOREIGN KEY ("provider_type","publisher_id") REFERENCES "public"."users"("provider_type","provider_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "resources" ADD CONSTRAINT "resource_fansub_fk" FOREIGN KEY ("provider_type","fansub_id") REFERENCES "public"."teams"("provider_type","provider_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
