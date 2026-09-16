CREATE TABLE recipe_submissions (
  id TEXT PRIMARY KEY NOT NULL,
  game_mode TEXT NOT NULL CHECK (game_mode IN ('pvp', 'pve', 'season')),
  timer_seconds INTEGER NOT NULL CHECK (timer_seconds BETWEEN 1 AND 359999 AND timer_seconds NOT IN (7200, 10800, 14400, 18000, 21600, 28800, 43200, 50400)),
  sacrifices_json TEXT NOT NULL CHECK (json_valid(sacrifices_json)),
  rewards_json TEXT NOT NULL CHECK (json_valid(rewards_json)),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TEXT NOT NULL
);

CREATE INDEX recipe_submissions_review_queue ON recipe_submissions(status, created_at);
