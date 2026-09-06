ALTER TABLE recipe_feedback_stats ADD COLUMN last_worked_mode TEXT
  CHECK (last_worked_mode IN ('pvp', 'pve', 'season'));

UPDATE recipe_feedback_stats
SET last_worked_mode = (
  SELECT latest.game_mode
  FROM recipe_feedback AS latest
  WHERE latest.recipe_id = recipe_feedback_stats.recipe_id
    AND latest.vote = 'worked'
  ORDER BY latest.updated_at DESC
  LIMIT 1
)
WHERE last_worked_at IS NOT NULL;
