CREATE TABLE recipe_feedback (
  recipe_id TEXT NOT NULL,
  client_hash TEXT NOT NULL,
  vote TEXT NOT NULL CHECK (vote IN ('worked', 'didnt_work')),
  updated_at TEXT NOT NULL,
  PRIMARY KEY (recipe_id, client_hash)
) STRICT, WITHOUT ROWID;

CREATE INDEX recipe_feedback_recipe_vote_updated_idx
  ON recipe_feedback(recipe_id, vote, updated_at DESC);

CREATE TABLE recipe_feedback_stats (
  recipe_id TEXT PRIMARY KEY,
  worked_count INTEGER NOT NULL DEFAULT 0 CHECK (worked_count >= 0),
  didnt_work_count INTEGER NOT NULL DEFAULT 0 CHECK (didnt_work_count >= 0),
  last_worked_at TEXT
) STRICT, WITHOUT ROWID;
