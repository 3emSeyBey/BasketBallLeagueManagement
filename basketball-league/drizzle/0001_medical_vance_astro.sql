CREATE TABLE `announcement_images` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`announcement_id` integer,
	`mime_type` text NOT NULL,
	`data` blob NOT NULL,
	`created_by` integer NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`announcement_id`) REFERENCES `announcements`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `announcements` ADD `title` text NOT NULL;--> statement-breakpoint
ALTER TABLE `announcements` ADD `updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL;