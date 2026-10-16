ALTER TABLE `chat` ADD `visitor_id` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `chat` ADD `title` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `chat` ADD `updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL;--> statement-breakpoint
CREATE INDEX `chat_visitor_idx` ON `chat` (`visitor_id`,`updated_at`);