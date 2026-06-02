-- ============================================================
-- Recipe enrichment: image, source URL, prep/cook time,
-- difficulty, rating, tags, favorite flag. All nullable /
-- defaulted so existing rows remain valid.
-- ============================================================

ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS image_path         text,
  ADD COLUMN IF NOT EXISTS source_url         text,
  ADD COLUMN IF NOT EXISTS prep_time_minutes  integer,
  ADD COLUMN IF NOT EXISTS cook_time_minutes  integer,
  ADD COLUMN IF NOT EXISTS difficulty         text,
  ADD COLUMN IF NOT EXISTS rating             integer,
  ADD COLUMN IF NOT EXISTS tags               text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_favorite        boolean NOT NULL DEFAULT false;

-- Range / enum constraints. Done as separate ALTERs so the migration
-- can re-run cleanly even if columns already existed without checks.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'recipes_difficulty_check'
  ) THEN
    ALTER TABLE recipes
      ADD CONSTRAINT recipes_difficulty_check
      CHECK (difficulty IS NULL OR difficulty IN ('enkel', 'medel', 'svår'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'recipes_rating_check'
  ) THEN
    ALTER TABLE recipes
      ADD CONSTRAINT recipes_rating_check
      CHECK (rating IS NULL OR rating BETWEEN 1 AND 5);
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_recipes_favorite
  ON recipes(household_id, is_favorite) WHERE is_favorite = true;
