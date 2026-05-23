-- ============================================================
-- Recipe sections: a recipe can have multiple sub-recipes
-- (marinad, sallad, tzatziki, …). Each ingredient row carries
-- an optional `section` label; ingredients without a section
-- belong to the recipe's main list.
-- ============================================================

ALTER TABLE recipe_ingredients
  ADD COLUMN IF NOT EXISTS section text;
