ALTER TABLE feedback RENAME TO feedback_strict_v1;

CREATE TABLE feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  feedback_type TEXT NOT NULL
    CHECK (
      supabase_id IS NOT NULL
      OR feedback_type IN ('Issue', 'Feature', 'Suggestion', 'Recipe')
    ),
  title TEXT,
  description TEXT NOT NULL
    CHECK (
      supabase_id IS NOT NULL
      OR length(trim(description)) BETWEEN 3 AND 2000
    ),
  app_version TEXT
    CHECK (
      supabase_id IS NOT NULL
      OR app_version IS NULL
      OR length(trim(app_version)) BETWEEN 1 AND 64
    ),
  created_at TEXT NOT NULL
    DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  supabase_id INTEGER UNIQUE
) STRICT;

INSERT INTO feedback (
  id,
  feedback_type,
  title,
  description,
  app_version,
  created_at,
  supabase_id
)
SELECT
  id,
  feedback_type,
  title,
  description,
  app_version,
  created_at,
  supabase_id
FROM feedback_strict_v1;

DROP TABLE feedback_strict_v1;

CREATE INDEX feedback_created_at_idx ON feedback(created_at DESC);
CREATE INDEX feedback_type_idx ON feedback(feedback_type);
