ALTER TABLE "resources" ADD COLUMN "tracker" text;--> statement-breakpoint
ALTER TABLE "resources" DROP COLUMN IF EXISTS "magnet2";--> statement-breakpoint
ALTER TABLE "resources" DROP COLUMN IF EXISTS "magnet_user";