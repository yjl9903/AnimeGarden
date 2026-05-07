CREATE TABLE "telegram_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"resource_id" integer NOT NULL,
	"publisher_id" integer NOT NULL,
	"fansub_id" integer,
	"subject_id" integer NOT NULL,
	"episode" varchar(128) NOT NULL,
	"telegram_chat_id" bigint,
	"telegram_message_id" bigint,
	"status" smallint NOT NULL,
	"sent_at" timestamp with time zone,
	"edited_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "unique_telegram_messages_publisher_subject_episode" ON "telegram_messages" USING btree ("publisher_id","subject_id","episode");--> statement-breakpoint
CREATE INDEX "telegram_messages_resource_id_index" ON "telegram_messages" USING btree ("resource_id");--> statement-breakpoint
CREATE INDEX "telegram_messages_status_index" ON "telegram_messages" USING btree ("status");