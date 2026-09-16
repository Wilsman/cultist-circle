ALTER TABLE recipe_feedback_stats ADD COLUMN last_didnt_work_at TEXT;
ALTER TABLE recipe_feedback_stats ADD COLUMN last_didnt_work_mode TEXT
  CHECK (last_didnt_work_mode IN ('pvp', 'pve', 'season'));
ALTER TABLE recipe_feedback_stats ADD COLUMN last_worked_pvp_at TEXT;
ALTER TABLE recipe_feedback_stats ADD COLUMN last_worked_pve_at TEXT;
ALTER TABLE recipe_feedback_stats ADD COLUMN last_worked_season_at TEXT;
ALTER TABLE recipe_feedback_stats ADD COLUMN last_didnt_work_pvp_at TEXT;
ALTER TABLE recipe_feedback_stats ADD COLUMN last_didnt_work_pve_at TEXT;
ALTER TABLE recipe_feedback_stats ADD COLUMN last_didnt_work_season_at TEXT;

UPDATE recipe_feedback_stats
SET
  last_didnt_work_at = (
    SELECT MAX(CASE WHEN vote = 'didnt_work' THEN updated_at END)
    FROM recipe_feedback
    WHERE recipe_feedback.recipe_id = recipe_feedback_stats.recipe_id
  ),
  last_didnt_work_mode = (
    SELECT latest.game_mode
    FROM recipe_feedback AS latest
    WHERE latest.recipe_id = recipe_feedback_stats.recipe_id
      AND latest.vote = 'didnt_work'
    ORDER BY latest.updated_at DESC
    LIMIT 1
  ),
  last_worked_pvp_at = (
    SELECT MAX(CASE WHEN vote = 'worked' AND game_mode = 'pvp' THEN updated_at END)
    FROM recipe_feedback
    WHERE recipe_feedback.recipe_id = recipe_feedback_stats.recipe_id
  ),
  last_worked_pve_at = (
    SELECT MAX(CASE WHEN vote = 'worked' AND game_mode = 'pve' THEN updated_at END)
    FROM recipe_feedback
    WHERE recipe_feedback.recipe_id = recipe_feedback_stats.recipe_id
  ),
  last_worked_season_at = (
    SELECT MAX(CASE WHEN vote = 'worked' AND game_mode = 'season' THEN updated_at END)
    FROM recipe_feedback
    WHERE recipe_feedback.recipe_id = recipe_feedback_stats.recipe_id
  ),
  last_didnt_work_pvp_at = (
    SELECT MAX(CASE WHEN vote = 'didnt_work' AND game_mode = 'pvp' THEN updated_at END)
    FROM recipe_feedback
    WHERE recipe_feedback.recipe_id = recipe_feedback_stats.recipe_id
  ),
  last_didnt_work_pve_at = (
    SELECT MAX(CASE WHEN vote = 'didnt_work' AND game_mode = 'pve' THEN updated_at END)
    FROM recipe_feedback
    WHERE recipe_feedback.recipe_id = recipe_feedback_stats.recipe_id
  ),
  last_didnt_work_season_at = (
    SELECT MAX(CASE WHEN vote = 'didnt_work' AND game_mode = 'season' THEN updated_at END)
    FROM recipe_feedback
    WHERE recipe_feedback.recipe_id = recipe_feedback_stats.recipe_id
  );
