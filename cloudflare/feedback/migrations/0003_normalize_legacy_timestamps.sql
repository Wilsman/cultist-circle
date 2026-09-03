UPDATE feedback
SET created_at =
  substr(created_at, 7, 4) || '-' ||
  substr(created_at, 1, 2) || '-' ||
  substr(created_at, 4, 2) || 'T' ||
  substr(created_at, 12, 8) || '.000Z'
WHERE supabase_id IS NOT NULL
  AND length(created_at) = 19
  AND created_at GLOB '??/??/???? ??:??:??';
