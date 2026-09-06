CREATE TABLE `audit_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`actor_id` integer,
	`actor_label` text NOT NULL,
	`action` text NOT NULL,
	`outcome` text DEFAULT 'success' NOT NULL,
	`target_type` text,
	`target_id` integer,
	`meta` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
