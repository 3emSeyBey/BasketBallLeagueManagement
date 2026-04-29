CREATE TABLE `season_teams` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`season_id` integer NOT NULL,
	`team_id` integer NOT NULL,
	`seed` integer NOT NULL,
	FOREIGN KEY (`season_id`) REFERENCES `seasons`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `season_teams_season_id_team_id_unique` ON `season_teams` (`season_id`,`team_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `season_teams_season_id_seed_unique` ON `season_teams` (`season_id`,`seed`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_matches` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`season_id` integer NOT NULL,
	`home_team_id` integer,
	`away_team_id` integer,
	`scheduled_at` text NOT NULL,
	`venue` text NOT NULL,
	`status` text DEFAULT 'scheduled' NOT NULL,
	`home_score` integer DEFAULT 0 NOT NULL,
	`away_score` integer DEFAULT 0 NOT NULL,
	`agora_channel` text,
	`round` integer,
	`bracket_position` integer,
	`next_match_id` integer,
	`next_match_slot` text,
	FOREIGN KEY (`season_id`) REFERENCES `seasons`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`home_team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`away_team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_matches`("id", "season_id", "home_team_id", "away_team_id", "scheduled_at", "venue", "status", "home_score", "away_score", "agora_channel", "round", "bracket_position", "next_match_id", "next_match_slot") SELECT "id", "season_id", "home_team_id", "away_team_id", "scheduled_at", "venue", "status", "home_score", "away_score", "agora_channel", "round", "bracket_position", "next_match_id", "next_match_slot" FROM `matches`;--> statement-breakpoint
DROP TABLE `matches`;--> statement-breakpoint
ALTER TABLE `__new_matches` RENAME TO `matches`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
ALTER TABLE `seasons` ADD `status` text DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE `seasons` ADD `bracket_type` text DEFAULT 'single_elim' NOT NULL;--> statement-breakpoint
ALTER TABLE `seasons` ADD `third_place_match` integer DEFAULT false NOT NULL;