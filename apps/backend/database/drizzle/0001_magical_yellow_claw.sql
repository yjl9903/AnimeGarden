DROP INDEX IF EXISTS "provider_type_id";--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "unique_resource_provider" ON "resources" ("provider_type","provider_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "unique_team_provider" ON "teams" ("provider_type","provider_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "unique_user_provider" ON "users" ("provider_type","provider_id");