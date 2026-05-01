DROP INDEX "divisions_season_id_name_unique";--> statement-breakpoint
DROP INDEX "finals_eliminations_season_id_team_id_unique";--> statement-breakpoint
DROP INDEX "players_team_id_jersey_number_unique";--> statement-breakpoint
DROP INDEX "season_teams_season_id_team_id_unique";--> statement-breakpoint
DROP INDEX "seasons_name_unique";--> statement-breakpoint
DROP INDEX "team_divisions_name_unique";--> statement-breakpoint
DROP INDEX "teams_name_unique";--> statement-breakpoint
DROP INDEX "users_email_unique";--> statement-breakpoint
DROP INDEX "users_username_unique";--> statement-breakpoint
ALTER TABLE `matches` ALTER COLUMN "scheduled_at" TO "scheduled_at" text;--> statement-breakpoint
CREATE UNIQUE INDEX `divisions_season_id_name_unique` ON `divisions` (`season_id`,`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `finals_eliminations_season_id_team_id_unique` ON `finals_eliminations` (`season_id`,`team_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `players_team_id_jersey_number_unique` ON `players` (`team_id`,`jersey_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `season_teams_season_id_team_id_unique` ON `season_teams` (`season_id`,`team_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `seasons_name_unique` ON `seasons` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `team_divisions_name_unique` ON `team_divisions` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `teams_name_unique` ON `teams` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
ALTER TABLE `matches` ALTER COLUMN "status" TO "status" text NOT NULL DEFAULT 'planned';--> statement-breakpoint
UPDATE `matches` SET `status` = 'ended' WHERE `status` = 'final';