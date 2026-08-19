ALTER TABLE "subjects" RENAME COLUMN "keywords" TO "search";
--> statement-breakpoint
UPDATE "subjects" SET "search" = json_build_object('include', "search");
--> statement-breakpoint
ALTER TABLE "subjects" ALTER COLUMN "actived_at" DROP NOT NULL;
