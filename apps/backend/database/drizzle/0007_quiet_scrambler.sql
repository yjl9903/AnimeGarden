ALTER TABLE "resources" ALTER COLUMN "tracker" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "avatar" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "avatar" text;