ALTER TABLE "resources" ALTER COLUMN "fansub_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "resources" ALTER COLUMN "publisher_id" SET NOT NULL;