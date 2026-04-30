CREATE TABLE `team_divisions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `team_divisions_name_unique` ON `team_divisions` (`name`);--> statement-breakpoint
ALTER TABLE `teams` ADD `image_mime_type` text;--> statement-breakpoint
ALTER TABLE `teams` ADD `image_data` blob;