ALTER TABLE recipe_feedback ADD COLUMN game_mode TEXT
  CHECK (game_mode IN ('pvp', 'pve', 'season'));

ALTER TABLE recipe_feedback_stats ADD COLUMN worked_pvp INTEGER NOT NULL DEFAULT 0
  CHECK (worked_pvp >= 0);
ALTER TABLE recipe_feedback_stats ADD COLUMN worked_pve INTEGER NOT NULL DEFAULT 0
  CHECK (worked_pve >= 0);
ALTER TABLE recipe_feedback_stats ADD COLUMN worked_season INTEGER NOT NULL DEFAULT 0
  CHECK (worked_season >= 0);
ALTER TABLE recipe_feedback_stats ADD COLUMN didnt_work_pvp INTEGER NOT NULL DEFAULT 0
  CHECK (didnt_work_pvp >= 0);
ALTER TABLE recipe_feedback_stats ADD COLUMN didnt_work_pve INTEGER NOT NULL DEFAULT 0
  CHECK (didnt_work_pve >= 0);
ALTER TABLE recipe_feedback_stats ADD COLUMN didnt_work_season INTEGER NOT NULL DEFAULT 0
  CHECK (didnt_work_season >= 0);
