CREATE TABLE feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  feedback_type TEXT NOT NULL
    CHECK (feedback_type IN ('Issue', 'Feature', 'Suggestion', 'Recipe')),
  title TEXT,
  description TEXT NOT NULL
    CHECK (length(trim(description)) BETWEEN 3 AND 2000),
  app_version TEXT
    CHECK (
      app_version IS NULL
      OR length(trim(app_version)) BETWEEN 1 AND 64
    ),
  created_at TEXT NOT NULL
    DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  supabase_id INTEGER UNIQUE
) STRICT;

CREATE INDEX feedback_created_at_idx ON feedback(created_at DESC);
CREATE INDEX feedback_type_idx ON feedback(feedback_type);
