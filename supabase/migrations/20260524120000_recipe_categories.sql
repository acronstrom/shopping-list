-- ============================================================
-- Recipe categories: household-defined list + a nullable
-- recipes.category column. Mirrors the household_categories /
-- grocery_items.category pattern.
-- ============================================================

CREATE TABLE IF NOT EXISTS household_recipe_categories (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id  uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name          text NOT NULL,
  sort_order    integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (household_id, name)
);

CREATE INDEX IF NOT EXISTS idx_household_recipe_categories_household
  ON household_recipe_categories(household_id, sort_order);

ALTER TABLE household_recipe_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Household members manage recipe categories"
  ON household_recipe_categories;
CREATE POLICY "Household members manage recipe categories"
  ON household_recipe_categories FOR ALL TO authenticated
  USING (
    household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = (SELECT auth.uid()) AND status = 'accepted'
    )
  )
  WITH CHECK (
    household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = (SELECT auth.uid()) AND status = 'accepted'
    )
  );

-- Seed 13 Swedish recipe categories into every existing household.
-- Idempotent: safe to re-run; manually-created entries are preserved.
WITH new_categories(name, sort_order) AS (
  VALUES
    ('Vardagsmat',        10),
    ('Snabb middag',      20),
    ('Helgmat',           30),
    ('Vegetariskt',       40),
    ('Pasta',             50),
    ('Asiatiskt',         60),
    ('Italienskt',        70),
    ('Soppor & grytor',   80),
    ('Sallader',          90),
    ('Bakning',          100),
    ('Efterrätt',        110),
    ('Fisk & skaldjur',  120),
    ('Kött',             130)
)
INSERT INTO household_recipe_categories (household_id, name, sort_order)
SELECT h.id, nc.name, nc.sort_order
FROM households h
CROSS JOIN new_categories nc
ON CONFLICT (household_id, name) DO NOTHING;

-- Recipes get a nullable category column (no FK; matches groceries.category).
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS category text;
CREATE INDEX IF NOT EXISTS idx_recipes_category
  ON recipes(household_id, category);
