ALTER TABLE "resources" ALTER COLUMN "provider_id" SET DATA TYPE varchar(128);--> statement-breakpoint
ALTER TABLE "resources" ALTER COLUMN "href" SET DATA TYPE varchar(1024);--> statement-breakpoint
ALTER TABLE "resources" ALTER COLUMN "title" SET DATA TYPE varchar(1024);--> statement-breakpoint
ALTER TABLE "resources" ALTER COLUMN "title_alt" SET DATA TYPE varchar(1024);--> statement-breakpoint
ALTER TABLE "resources" ALTER COLUMN "magnet" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "teams" ALTER COLUMN "provider_id" SET DATA TYPE varchar(128);--> statement-breakpoint
ALTER TABLE "teams" ALTER COLUMN "name" SET DATA TYPE varchar(128);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "provider_id" SET DATA TYPE varchar(128);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "name" SET DATA TYPE varchar(128);