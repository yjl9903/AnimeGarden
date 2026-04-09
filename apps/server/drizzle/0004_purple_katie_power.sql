ALTER TYPE "public"."resources_provider" RENAME TO "resources_provider_old";
--> statement-breakpoint
CREATE TYPE "public"."resources_provider" AS ENUM('dmhy', 'mikan', 'moe', 'ani');
--> statement-breakpoint
ALTER TABLE "providers"
ALTER COLUMN "id" TYPE "public"."resources_provider"
USING ("id"::text::"public"."resources_provider");
--> statement-breakpoint
ALTER TABLE "resources"
ALTER COLUMN "provider_name" TYPE "public"."resources_provider"
USING ("provider_name"::text::"public"."resources_provider");
--> statement-breakpoint
DROP TYPE "public"."resources_provider_old";
