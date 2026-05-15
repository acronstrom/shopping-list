-- ============================================================
-- Recipes v2: instructions text + servings count
--
-- Turns the recipe section into a mini-cookbook. Servings drives
-- the quantity scaling on the recipe page; instructions render as
-- plain text with preserved line breaks for now.
-- ============================================================

ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS instructions text,
  ADD COLUMN IF NOT EXISTS servings integer NOT NULL DEFAULT 4;
