CREATE TABLE `animegarden_filter_resources` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`filter_id` integer NOT NULL,
	`resource_id` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `animegarden_filter_resources_filter_id_resource_id` ON `animegarden_filter_resources` (`filter_id`,`resource_id`);--> statement-breakpoint
CREATE TABLE `animegarden_filters` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`key` text NOT NULL,
	`filter` text NOT NULL,
	`created_at` integer NOT NULL,
	`fetched_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `animegarden_filters_key_unique` ON `animegarden_filters` (`key`);--> statement-breakpoint
CREATE TABLE `animegarden_resources` (
	`id` integer PRIMARY KEY NOT NULL,
	`provider_name` text NOT NULL,
	`provider_id` text NOT NULL,
	`title` text NOT NULL,
	`href` text NOT NULL,
	`type` text NOT NULL,
	`magnet` text NOT NULL,
	`tracker` text NOT NULL,
	`size` integer NOT NULL,
	`publisher` text NOT NULL,
	`fansub` text,
	`created_at` integer NOT NULL,
	`fetched_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `animegarden_resources_provider_id` ON `animegarden_resources` (`provider_name`,`provider_id`);--> statement-breakpoint
CREATE INDEX `animegarden_resources_created_at` ON `animegarden_resources` (`created_at`);--> statement-breakpoint
CREATE INDEX `animegarden_resources_fetched_at` ON `animegarden_resources` (`fetched_at`);--> statement-breakpoint
CREATE TABLE `metadata` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text
);
--> statement-breakpoint
CREATE TABLE `subject_files` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`subject_id` integer NOT NULL,
	`storage` text NOT NULL,
	`path` text NOT NULL,
	`size` integer DEFAULT 0,
	`mtime` integer NOT NULL,
	`checksum` text NOT NULL,
	`torrent_id` integer,
	`torrent_file` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `subject_files_storage_path` ON `subject_files` (`storage`,`path`);--> statement-breakpoint
CREATE TABLE `subjects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`enable` integer NOT NULL,
	`source` text,
	`naming` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `subjects_name_unique` ON `subjects` (`name`);--> statement-breakpoint
CREATE TABLE `torrents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`info_hash` text NOT NULL,
	`downloader` text NOT NULL,
	`files` text,
	`status` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `torrents_info_hash_unique` ON `torrents` (`info_hash`);