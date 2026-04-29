CREATE TABLE `finals_eliminations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`season_id` integer NOT NULL,
	`team_id` integer NOT NULL,
	`eliminated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`season_id`) REFERENCES `seasons`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `finals_eliminations_season_id_team_id_unique` ON `finals_eliminations` (`season_id`,`team_id`);--> statement-breakpoint
DROP INDEX `season_teams_season_id_seed_unique`;--> statement-breakpoint
DROP INDEX "divisions_season_id_name_unique";--> statement-breakpoint
DROP INDEX "finals_eliminations_season_id_team_id_unique";--> statement-breakpoint
DROP INDEX "players_team_id_jersey_number_unique";--> statement-breakpoint
DROP INDEX "season_teams_season_id_team_id_unique";--> statement-breakpoint
DROP INDEX "seasons_name_unique";--> statement-breakpoint
DROP INDEX "teams_name_unique";--> statement-breakpoint
DROP INDEX "users_email_unique";--> statement-breakpoint
DROP INDEX "users_username_unique";--> statement-breakpoint
ALTER TABLE `season_teams` ALTER COLUMN "seed" TO "seed" integer;--> statement-breakpoint
CREATE UNIQUE INDEX `divisions_season_id_name_unique` ON `divisions` (`season_id`,`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `players_team_id_jersey_number_unique` ON `players` (`team_id`,`jersey_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `season_teams_season_id_team_id_unique` ON `season_teams` (`season_id`,`team_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `seasons_name_unique` ON `seasons` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `teams_name_unique` ON `teams` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
ALTER TABLE `season_teams` ADD `division_id` integer REFERENCES divisions(id);--> statement-breakpoint
ALTER TABLE `matches` ADD `division_id` integer REFERENCES divisions(id);--> statement-breakpoint
ALTER TABLE `matches` ADD `stage` text;--> statement-breakpoint
ALTER TABLE `matches` ADD `is_division_final` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `matches` ADD `is_season_final` integer DEFAULT false NOT NULL;